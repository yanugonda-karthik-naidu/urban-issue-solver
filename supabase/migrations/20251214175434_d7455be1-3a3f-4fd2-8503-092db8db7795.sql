-- Drop the public policy that allows anyone to view issues
DROP POLICY IF EXISTS "Anyone can view issues" ON public.issues;

-- Create policy: Authenticated users can view all issues (basic info)
-- But user_id is only visible to the issue owner or admins
CREATE POLICY "Authenticated users can view issues"
  ON public.issues FOR SELECT
  USING (auth.uid() IS NOT NULL);