-- ============================================================
-- MIGRATION 002: Core Tables
-- profiles, text_objects, text_translations, settings
-- ============================================================

-- ─── Profiles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role           user_role NOT NULL DEFAULT 'visitor',
  display_name   TEXT NOT NULL DEFAULT '',
  photo          TEXT,
  language_pref  TEXT NOT NULL DEFAULT 'es',
  permissions    JSONB NOT NULL DEFAULT '{}',
  gdpr_consent   BOOLEAN NOT NULL DEFAULT FALSE,
  gdpr_consent_date TIMESTAMPTZ,
  unsubscribe_email BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Text Objects (i18n keys) ────────────────────────────────
CREATE TABLE IF NOT EXISTS text_objects (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key              TEXT UNIQUE NOT NULL,
  default_language TEXT NOT NULL DEFAULT 'es',
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Text Translations ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS text_translations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text_object_id UUID NOT NULL REFERENCES text_objects(id) ON DELETE CASCADE,
  language_code  TEXT NOT NULL,
  content        TEXT NOT NULL DEFAULT '',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(text_object_id, language_code)
);

-- ─── Global Settings ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  global_feature_flags  JSONB NOT NULL DEFAULT '{}',
  brand                 JSONB NOT NULL DEFAULT '{}',
  integrations          JSONB NOT NULL DEFAULT '{}',
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_text_translations_lang ON text_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_text_objects_key ON text_objects(key);
