-- ============================================================
-- MIGRATION 007: Triggers & Functions
-- Auto-create profile on user signup, updated_at triggers
-- ============================================================

-- ─── Updated_at trigger function ─────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_events
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_orders
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_import_jobs
  BEFORE UPDATE ON import_jobs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_settings
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─── Auto-create profile on user signup ──────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, role, display_name, language_pref, permissions, gdpr_consent)
  VALUES (
    NEW.id,
    'visitor',
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'language', 'es'),
    '{}',
    FALSE
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Settings: insert default row if empty ───────────────────
INSERT INTO settings (global_feature_flags, brand, integrations)
SELECT
  '{"networking": false, "speaker_pages": true, "sponsor_pages": true}'::jsonb,
  '{"name": "SQX Traders EventOS", "accent_color": "#D4A853"}'::jsonb,
  '{"stripe_enabled": false, "brevo_enabled": false, "google_calendar_enabled": false}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM settings);
