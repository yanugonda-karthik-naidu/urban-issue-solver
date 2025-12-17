-- Create workers table for simple assignment
CREATE TABLE public.workers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  assigned_area TEXT,
  assigned_district TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- Workers visible to department admins and super admins
CREATE POLICY "Admins can view workers in their department"
ON public.workers FOR SELECT
USING (
  public.is_super_admin(auth.uid()) OR 
  (public.is_admin(auth.uid()) AND department_id = public.get_admin_department(auth.uid()))
);

-- Department admins and super admins can manage workers
CREATE POLICY "Department admins can insert workers"
ON public.workers FOR INSERT
WITH CHECK (
  public.is_super_admin(auth.uid()) OR 
  (public.is_admin(auth.uid()) AND department_id = public.get_admin_department(auth.uid()))
);

CREATE POLICY "Department admins can update workers"
ON public.workers FOR UPDATE
USING (
  public.is_super_admin(auth.uid()) OR 
  (public.is_admin(auth.uid()) AND department_id = public.get_admin_department(auth.uid()))
);

CREATE POLICY "Department admins can delete workers"
ON public.workers FOR DELETE
USING (
  public.is_super_admin(auth.uid()) OR 
  (public.is_admin(auth.uid()) AND department_id = public.get_admin_department(auth.uid()))
);

-- Add assigned_worker_id to issues table
ALTER TABLE public.issues ADD COLUMN assigned_worker_id UUID REFERENCES public.workers(id);

-- Function to notify department admins on new issue
CREATE OR REPLACE FUNCTION public.notify_department_on_new_issue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  dept_name TEXT;
BEGIN
  -- Get department name
  SELECT name INTO dept_name FROM public.departments WHERE id = NEW.department_id;
  
  -- Notify all admins in that department
  FOR admin_record IN 
    SELECT user_id FROM public.admins 
    WHERE department_id = NEW.department_id OR role = 'super_admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, issue_id)
    VALUES (
      admin_record.user_id,
      'New Issue Reported',
      'A new ' || NEW.category || ' issue has been reported in ' || COALESCE(NEW.area, NEW.district, 'your area'),
      'new_issue',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new issue notifications
DROP TRIGGER IF EXISTS notify_department_trigger ON public.issues;
CREATE TRIGGER notify_department_trigger
AFTER INSERT ON public.issues
FOR EACH ROW
EXECUTE FUNCTION public.notify_department_on_new_issue();

-- Function to notify on issue progress update
CREATE OR REPLACE FUNCTION public.notify_on_issue_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Only trigger on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify the user who reported the issue
    INSERT INTO public.notifications (user_id, title, message, type, issue_id)
    VALUES (
      NEW.user_id,
      'Issue Status Updated',
      'Your issue "' || NEW.title || '" status changed to ' || NEW.status,
      'status_update',
      NEW.id
    );
    
    -- Notify super admins
    FOR admin_record IN 
      SELECT user_id FROM public.admins WHERE role = 'super_admin' AND user_id != auth.uid()
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, issue_id)
      VALUES (
        admin_record.user_id,
        'Issue Progress Update',
        'Issue "' || NEW.title || '" status changed to ' || NEW.status,
        'status_update',
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for progress notifications
DROP TRIGGER IF EXISTS notify_progress_trigger ON public.issues;
CREATE TRIGGER notify_progress_trigger
AFTER UPDATE ON public.issues
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_issue_progress();