-- ============================================================
-- MIGRATION 015: Fix handle_new_user trigger
-- Adds exception handling so a profile-creation failure
-- never blocks auth user creation, and ensures display_name
-- can never be NULL.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    role,
    display_name,
    language_pref,
    permissions,
    gdpr_consent
  )
  VALUES (
    NEW.id,
    'visitor',
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'language', 'es'),
    '{}'::jsonb,
    FALSE
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Log the error but never block the auth user from being created.
  -- The API layer always upserts the profile explicitly after this trigger.
  RAISE WARNING 'handle_new_user() profile insert failed (user_id=%): %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
