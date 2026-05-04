DROP POLICY IF EXISTS "Anyone can check invite by email" ON public.invites;

CREATE OR REPLACE FUNCTION public.check_invite_for_email(check_email TEXT)
RETURNS TABLE(role public.app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.role
  FROM public.invites i
  WHERE i.email = lower(trim(check_email))
    AND i.used_at IS NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.check_invite_for_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_invite_for_email(TEXT) TO anon, authenticated;