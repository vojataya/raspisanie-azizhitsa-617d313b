-- Add used_by column to track which user used the invite
ALTER TABLE public.invites 
ADD COLUMN used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update the handle_new_user_with_invite function to set used_by
CREATE OR REPLACE FUNCTION public.handle_new_user_with_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Check if there's an unused invite for this email
  SELECT * INTO invite_record FROM public.invites 
  WHERE email = NEW.email AND used_at IS NULL;
  
  IF invite_record.id IS NOT NULL THEN
    -- Create user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invite_record.role);
    
    -- Mark invite as used and store who used it
    UPDATE public.invites 
    SET used_at = now(), used_by = NEW.id 
    WHERE id = invite_record.id;
    
    -- Create profile
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, invite_record.role::text);
  END IF;
  
  RETURN NEW;
END;
$$;