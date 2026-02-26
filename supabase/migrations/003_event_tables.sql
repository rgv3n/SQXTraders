-- ============================================================
-- MIGRATION 003: Event Tables
-- events, event_sections, sessions
-- ============================================================

-- ─── Events ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug             TEXT UNIQUE NOT NULL,
  title_text_id    UUID REFERENCES text_objects(id),
  desc_text_id     UUID REFERENCES text_objects(id),
  tagline_text_id  UUID REFERENCES text_objects(id),
  -- Denormalized title/desc for quick reads (updated by trigger)
  title            TEXT NOT NULL DEFAULT '',
  description      TEXT,
  tagline          TEXT,
  status           event_status NOT NULL DEFAULT 'draft',
  start_date       TIMESTAMPTZ NOT NULL,
  end_date         TIMESTAMPTZ NOT NULL,
  venue            TEXT,
  venue_name       TEXT,
  address          TEXT,
  city             TEXT,
  country          TEXT,
  timezone         TEXT NOT NULL DEFAULT 'Europe/Madrid',
  is_hybrid        BOOLEAN NOT NULL DEFAULT FALSE,
  streams          JSONB NOT NULL DEFAULT '[]',
  stream_url       TEXT,
  agenda           JSONB NOT NULL DEFAULT '[]',
  feature_flags    JSONB NOT NULL DEFAULT '{
    "networking": false,
    "speaker_pages": true,
    "sponsor_pages": true,
    "attendee_directory": false,
    "streaming": false,
    "free_ticket_visibility": false,
    "verification_layer": false
  }',
  theme            JSONB NOT NULL DEFAULT '{}',
  max_capacity     INTEGER,
  website_url      TEXT,
  og_image         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Event Sections (landing page builder) ───────────────────
CREATE TABLE IF NOT EXISTS event_sections (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  layout_key  TEXT NOT NULL DEFAULT 'default',
  "order"     INTEGER NOT NULL DEFAULT 0,
  is_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  config      JSONB NOT NULL DEFAULT '{}',
  UNIQUE(event_id, section_key)
);

-- ─── Sessions (agenda items) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title_text_id   UUID REFERENCES text_objects(id),
  desc_text_id    UUID REFERENCES text_objects(id),
  title           TEXT NOT NULL DEFAULT '',
  description     TEXT,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  track           TEXT,
  location        TEXT,
  speaker_ids     UUID[] NOT NULL DEFAULT '{}',
  session_type    TEXT NOT NULL DEFAULT 'talk'
                  CHECK (session_type IN ('talk','panel','workshop','break','keynote')),
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  order_index     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_sessions_event_id ON sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
