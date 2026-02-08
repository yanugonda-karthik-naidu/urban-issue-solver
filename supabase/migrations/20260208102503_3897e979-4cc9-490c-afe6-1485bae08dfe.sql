
-- Add AI severity scoring columns to issues table
ALTER TABLE public.issues 
ADD COLUMN IF NOT EXISTS ai_severity_score integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_severity_level text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_severity_reasoning text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS location_sensitivity_zone text DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS nearby_reports_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_validation_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS image_validation_confidence numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS image_validation_reasoning text DEFAULT NULL;

-- Add constraint for severity level values
ALTER TABLE public.issues
ADD CONSTRAINT check_ai_severity_level 
CHECK (ai_severity_level IS NULL OR ai_severity_level IN ('critical', 'high', 'medium', 'low'));

-- Add constraint for image validation status
ALTER TABLE public.issues
ADD CONSTRAINT check_image_validation_status
CHECK (image_validation_status IS NULL OR image_validation_status IN ('valid', 'flagged', 'rejected', 'pending'));

-- Create index for priority queue sorting
CREATE INDEX IF NOT EXISTS idx_issues_severity_score ON public.issues (ai_severity_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_issues_severity_level ON public.issues (ai_severity_level);

-- Function to count nearby reports for clustering
CREATE OR REPLACE FUNCTION public.count_nearby_reports(
  p_issue_id uuid,
  p_category text,
  p_district text,
  p_area text
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM issues
  WHERE id != p_issue_id
    AND category = p_category
    AND (district = p_district OR area = p_area)
    AND created_at > now() - interval '30 days'
    AND status != 'resolved';
  
  RETURN v_count;
END;
$$;
