-- ============================================================
-- MIGRATION 004: Speakers & Sponsors
-- ============================================================

-- ─── Speakers ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS speakers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
  profile_user_id UUID REFERENCES auth.users(id),
  name            TEXT NOT NULL,
  photo           TEXT,
  bio_text_id     UUID REFERENCES text_objects(id),
  title_text_id   UUID REFERENCES text_objects(id),
  -- Denormalized flat fields for quick reads
  role            TEXT,                -- job title
  bio             TEXT,
  company         TEXT,
  twitter         TEXT,
  linkedin        TEXT,
  slug            TEXT NOT NULL,
  social_links    JSONB NOT NULL DEFAULT '{}',
  verification    JSONB NOT NULL DEFAULT '{}',
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  order_index     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, slug)
);

-- ─── Sponsors ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sponsors (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id         UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  profile_user_id  UUID REFERENCES auth.users(id),
  name             TEXT NOT NULL,
  logo             TEXT,
  tier             sponsor_tier NOT NULL DEFAULT 'bronze',
  desc_text_id     UUID REFERENCES text_objects(id),
  tagline_text_id  UUID REFERENCES text_objects(id),
  -- Denormalized
  description      TEXT,
  tagline          TEXT,
  website          TEXT,
  slug             TEXT NOT NULL,
  links            JSONB NOT NULL DEFAULT '{}',
  calendly_url     TEXT,
  resources        JSONB NOT NULL DEFAULT '[]',
  lead_form_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  order_index      INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, slug)
);

-- ─── Testimonials ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testimonials (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id       UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  quote_text_id  UUID REFERENCES text_objects(id),
  author         TEXT NOT NULL,
  role_text_id   UUID REFERENCES text_objects(id),
  -- Denormalized
  quote          TEXT,
  role           TEXT,
  photo          TEXT,
  media_url      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_speakers_event_id ON speakers(event_id);
CREATE INDEX IF NOT EXISTS idx_speakers_slug ON speakers(slug);
CREATE INDEX IF NOT EXISTS idx_speakers_featured ON speakers(is_featured);
CREATE INDEX IF NOT EXISTS idx_sponsors_event_id ON sponsors(event_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_tier ON sponsors(tier);
CREATE INDEX IF NOT EXISTS idx_testimonials_event_id ON testimonials(event_id);
