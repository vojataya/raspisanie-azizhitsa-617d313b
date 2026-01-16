-- Drop the admin-only policy for events
DROP POLICY IF EXISTS "Admins can manage all events" ON public.events;

-- Create new policy that allows anyone with a role (admin or editor) to manage all events
CREATE POLICY "Staff can manage all events"
ON public.events
FOR ALL
USING (has_any_role())
WITH CHECK (has_any_role());