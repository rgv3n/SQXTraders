-- ============================================================
-- MIGRATION 009: Superadmin Setup
-- Sets rubengl@gmail.com as superadmin dynamically
-- (looks up the actual UUID from auth.users — no hardcoded ID)
-- Run AFTER 007_triggers.sql
-- ============================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find the user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'rubengl@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User rubengl@gmail.com not found — skipping superadmin setup. Register first, then re-run this migration.';
    RETURN;
  END IF;

  -- Auto-confirm email (skip verification)
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE id = v_user_id;

  -- Upsert profile as superadmin
  INSERT INTO profiles (user_id, role, display_name, language_pref, permissions, gdpr_consent, gdpr_consent_date)
  VALUES (
    v_user_id,
    'superadmin',
    'Rubén GL',
    'es',
    '{"all": true}'::jsonb,
    TRUE,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    role         = 'superadmin',
    display_name = 'Rubén GL',
    permissions  = '{"all": true}'::jsonb,
    gdpr_consent = TRUE;

  RAISE NOTICE 'Superadmin setup complete for user %', v_user_id;
END $$;
