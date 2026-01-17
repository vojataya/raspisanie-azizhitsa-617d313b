-- Drop the admin-only policy for lesson_types
DROP POLICY IF EXISTS "Admins can manage lesson types" ON public.lesson_types;

-- Create new policy that allows anyone with a role (admin or editor) to manage lesson types
CREATE POLICY "Staff can manage lesson types"
ON public.lesson_types
FOR ALL
USING (has_any_role())
WITH CHECK (has_any_role());