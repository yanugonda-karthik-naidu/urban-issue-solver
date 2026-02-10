
-- ==========================================
-- Asset & Inventory + Worker Tasks Schema
-- ==========================================

-- Enums
CREATE TYPE public.asset_type AS ENUM ('streetlight', 'bin', 'valve', 'manhole', 'pole', 'bench', 'sign', 'other');
CREATE TYPE public.asset_status AS ENUM ('active', 'damaged', 'under_repair', 'decommissioned');
CREATE TYPE public.worker_task_status AS ENUM ('assigned', 'in_progress', 'completed', 'verified', 'rejected');

-- ==========================================
-- Physical Asset Registry
-- ==========================================
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code TEXT NOT NULL UNIQUE,
  asset_type public.asset_type NOT NULL DEFAULT 'other',
  name TEXT NOT NULL,
  description TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  area TEXT,
  district TEXT,
  state TEXT,
  department_id UUID REFERENCES public.departments(id),
  status public.asset_status NOT NULL DEFAULT 'active',
  installed_at TIMESTAMP WITH TIME ZONE,
  last_maintenance_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view assets" ON public.assets FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can insert assets" ON public.assets FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update assets" ON public.assets FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete assets" ON public.assets FOR DELETE USING (is_admin(auth.uid()));

-- ==========================================
-- Asset Repair / Maintenance History
-- ==========================================
CREATE TABLE public.asset_repair_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES public.issues(id),
  repair_type TEXT NOT NULL,
  description TEXT,
  repaired_by TEXT,
  repaired_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  cost NUMERIC,
  notes TEXT,
  before_photo_url TEXT,
  after_photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_repair_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view repair history" ON public.asset_repair_history FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can insert repair history" ON public.asset_repair_history FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update repair history" ON public.asset_repair_history FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete repair history" ON public.asset_repair_history FOR DELETE USING (is_admin(auth.uid()));

-- ==========================================
-- Link Issues to Physical Assets
-- ==========================================
ALTER TABLE public.issues ADD COLUMN asset_id UUID REFERENCES public.assets(id);

-- ==========================================
-- Worker Task Assignments with GPS Verification
-- ==========================================
CREATE TABLE public.worker_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id),
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  assigned_by UUID,
  status public.worker_task_status NOT NULL DEFAULT 'assigned',
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  before_photo_url TEXT,
  after_photo_url TEXT,
  completion_latitude NUMERIC,
  completion_longitude NUMERIC,
  completion_verified BOOLEAN DEFAULT false,
  verification_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.worker_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view worker tasks" ON public.worker_tasks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can insert worker tasks" ON public.worker_tasks FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update worker tasks" ON public.worker_tasks FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete worker tasks" ON public.worker_tasks FOR DELETE USING (is_admin(auth.uid()));

-- ==========================================
-- Worker Access Token for Mobile Portal
-- ==========================================
ALTER TABLE public.workers ADD COLUMN access_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');

-- ==========================================
-- Triggers
-- ==========================================
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_worker_tasks_updated_at BEFORE UPDATE ON public.worker_tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==========================================
-- Storage Bucket for Worker Task Photos
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('worker-photos', 'worker-photos', true);
CREATE POLICY "Auth users can upload worker photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'worker-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can view worker photos" ON storage.objects FOR SELECT USING (bucket_id = 'worker-photos');
CREATE POLICY "Admins can delete worker photos" ON storage.objects FOR DELETE USING (bucket_id = 'worker-photos' AND is_admin(auth.uid()));

-- ==========================================
-- Enable Realtime for Worker Tasks
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.worker_tasks;
