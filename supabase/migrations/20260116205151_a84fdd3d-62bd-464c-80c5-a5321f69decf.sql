-- Allow admins to delete profiles (needed for user deletion)
CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (public.is_admin());