-- Create department enum
CREATE TYPE public.department_type AS ENUM (
  'roads', 'sanitation', 'electricity', 'water', 'traffic', 'municipality', 'other'
);

-- Create admin role enum
CREATE TYPE public.admin_role AS ENUM ('super_admin', 'department_admin');

-- Create departments table with SLA settings
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code department_type NOT NULL UNIQUE,
  description TEXT,
  sla_hours INTEGER NOT NULL DEFAULT 48,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add department and SLA fields to issues table
ALTER TABLE public.issues 
  ADD COLUMN department_id UUID REFERENCES public.departments(id),
  ADD COLUMN sla_deadline TIMESTAMP WITH TIME ZONE,
  ADD COLUMN escalated BOOLEAN DEFAULT false,
  ADD COLUMN escalation_level INTEGER DEFAULT 0,
  ADD COLUMN escalated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;

-- Enhance admins table with role and department assignment
ALTER TABLE public.admins 
  ADD COLUMN role admin_role NOT NULL DEFAULT 'department_admin',
  ADD COLUMN department_id UUID REFERENCES public.departments(id),
  ADD COLUMN assigned_districts TEXT[],
  ADD COLUMN assigned_areas TEXT[];

-- Create escalation history table
CREATE TABLE public.escalation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  from_level INTEGER NOT NULL,
  to_level INTEGER NOT NULL,
  reason TEXT NOT NULL,
  escalated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create category to department mapping table
CREATE TABLE public.category_department_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL UNIQUE,
  department_id UUID NOT NULL REFERENCES public.departments(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_department_mapping ENABLE ROW LEVEL SECURITY;

-- RLS for departments (viewable by all authenticated users)
CREATE POLICY "Authenticated users can view departments"
ON public.departments FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage departments"
ON public.departments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- RLS for escalation_history
CREATE POLICY "Admins can view escalation history"
ON public.escalation_history FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "System can insert escalation history"
ON public.escalation_history FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- RLS for category_department_mapping
CREATE POLICY "Authenticated users can view category mappings"
ON public.category_department_mapping FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage category mappings"
ON public.category_department_mapping FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Create function to check if admin is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = check_user_id AND role = 'super_admin'
  );
$$;

-- Create function to get admin's department
CREATE OR REPLACE FUNCTION public.get_admin_department(check_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT department_id FROM public.admins WHERE user_id = check_user_id LIMIT 1;
$$;

-- Create function to check if admin can access issue (based on department and location)
CREATE OR REPLACE FUNCTION public.admin_can_access_issue(check_user_id uuid, check_issue_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_rec RECORD;
  issue_rec RECORD;
BEGIN
  -- Get admin record
  SELECT role, department_id, assigned_districts, assigned_areas 
  INTO admin_rec FROM public.admins WHERE user_id = check_user_id;
  
  -- Super admins can access all issues
  IF admin_rec.role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Get issue record
  SELECT department_id, district, area INTO issue_rec FROM public.issues WHERE id = check_issue_id;
  
  -- Check department match
  IF admin_rec.department_id IS NOT NULL AND admin_rec.department_id != issue_rec.department_id THEN
    RETURN false;
  END IF;
  
  -- Check location match (if admin has location restrictions)
  IF admin_rec.assigned_districts IS NOT NULL AND array_length(admin_rec.assigned_districts, 1) > 0 THEN
    IF issue_rec.district IS NULL OR NOT (issue_rec.district = ANY(admin_rec.assigned_districts)) THEN
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$$;

-- Create function to auto-assign department based on category
CREATE OR REPLACE FUNCTION public.auto_assign_department()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  dept_id UUID;
  sla_hours INTEGER;
BEGIN
  -- Find department for this category
  SELECT cdm.department_id, d.sla_hours 
  INTO dept_id, sla_hours
  FROM public.category_department_mapping cdm
  JOIN public.departments d ON d.id = cdm.department_id
  WHERE cdm.category = NEW.category;
  
  -- If found, assign department and calculate SLA deadline
  IF dept_id IS NOT NULL THEN
    NEW.department_id := dept_id;
    NEW.sla_deadline := NEW.created_at + (sla_hours || ' hours')::interval;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-assigning department
CREATE TRIGGER trigger_auto_assign_department
  BEFORE INSERT ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_department();

-- Create function to set resolved_at timestamp
CREATE OR REPLACE FUNCTION public.handle_issue_resolution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for issue resolution
CREATE TRIGGER trigger_handle_issue_resolution
  BEFORE UPDATE ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_issue_resolution();

-- Insert default departments with SLA
INSERT INTO public.departments (name, code, description, sla_hours, icon, color) VALUES
  ('Roads & Infrastructure', 'roads', 'Potholes, road damage, footpaths, bridges', 72, 'road', 'orange'),
  ('Sanitation & Waste', 'sanitation', 'Garbage collection, sewage, cleanliness', 24, 'trash', 'green'),
  ('Electricity', 'electricity', 'Street lights, power outages, electrical hazards', 48, 'zap', 'yellow'),
  ('Water Supply', 'water', 'Water shortage, leakage, contamination', 24, 'droplet', 'blue'),
  ('Traffic Management', 'traffic', 'Traffic signals, signs, road markings', 48, 'traffic-cone', 'red'),
  ('Municipality Services', 'municipality', 'General municipal services, permits, complaints', 72, 'building', 'purple'),
  ('Other', 'other', 'Miscellaneous issues', 96, 'help-circle', 'gray');

-- Insert default category to department mappings
INSERT INTO public.category_department_mapping (category, department_id) 
SELECT 'Roads & Potholes', id FROM public.departments WHERE code = 'roads';
INSERT INTO public.category_department_mapping (category, department_id) 
SELECT 'Street Lighting', id FROM public.departments WHERE code = 'electricity';
INSERT INTO public.category_department_mapping (category, department_id) 
SELECT 'Garbage Collection', id FROM public.departments WHERE code = 'sanitation';
INSERT INTO public.category_department_mapping (category, department_id) 
SELECT 'Water Supply', id FROM public.departments WHERE code = 'water';
INSERT INTO public.category_department_mapping (category, department_id) 
SELECT 'Drainage Issues', id FROM public.departments WHERE code = 'sanitation';
INSERT INTO public.category_department_mapping (category, department_id) 
SELECT 'Traffic Issues', id FROM public.departments WHERE code = 'traffic';
INSERT INTO public.category_department_mapping (category, department_id) 
SELECT 'Public Safety', id FROM public.departments WHERE code = 'municipality';
INSERT INTO public.category_department_mapping (category, department_id) 
SELECT 'Other', id FROM public.departments WHERE code = 'other';

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.departments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escalation_history;