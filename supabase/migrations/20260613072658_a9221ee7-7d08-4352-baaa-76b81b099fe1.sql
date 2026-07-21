-- Lock down search_path on existing functions
DO $$ BEGIN
  ALTER FUNCTION public.has_role(UUID, public.app_role) SET search_path = public;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  ALTER FUNCTION public.touch_updated_at() SET search_path = public;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  ALTER FUNCTION public.handle_new_user() SET search_path = public;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Revoke public execute on SECURITY DEFINER functions
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
