-- Add RLS policies for super admins to manage the admins table
CREATE POLICY "Super admins can insert admins"
ON public.admins
FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update admins"
ON public.admins
FOR UPDATE
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete admins"
ON public.admins
FOR DELETE
USING (public.is_super_admin(auth.uid()));