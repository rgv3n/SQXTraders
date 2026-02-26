-- ============================================================
-- MIGRATION 005: Tickets, Orders & Attendees
-- ============================================================

-- ─── Ticket Types ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_types (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id         UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name_text_id     UUID REFERENCES text_objects(id),
  desc_text_id     UUID REFERENCES text_objects(id),
  -- Denormalized
  name             TEXT NOT NULL,
  description      TEXT,
  price            NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'EUR',
  stripe_price_id  TEXT,
  is_free          BOOLEAN NOT NULL DEFAULT FALSE,
  is_hidden        BOOLEAN NOT NULL DEFAULT FALSE,
  visibility_mode  ticket_visibility NOT NULL DEFAULT 'PUBLIC',
  perks            JSONB NOT NULL DEFAULT '[]',
  max_quantity     INTEGER,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  invite_code      TEXT,
  secret_url_param TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Orders ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES auth.users(id),
  event_id          UUID NOT NULL REFERENCES events(id),
  ticket_type_id    UUID NOT NULL REFERENCES ticket_types(id),
  stripe_session_id TEXT,
  status            order_status NOT NULL DEFAULT 'pending',
  amount            NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'EUR',
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Attendees ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendees (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID REFERENCES auth.users(id),
  event_id            UUID NOT NULL REFERENCES events(id),
  order_id            UUID REFERENCES orders(id),
  ticket_type_id      UUID REFERENCES ticket_types(id),
  name                TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT,
  company             TEXT,
  country             TEXT,
  job_title           TEXT,
  is_vip              BOOLEAN NOT NULL DEFAULT FALSE,
  consent             BOOLEAN NOT NULL DEFAULT FALSE,
  qr_code_value       TEXT UNIQUE NOT NULL DEFAULT uuid_generate_v4()::TEXT,
  checkin_status      checkin_status NOT NULL DEFAULT 'pending',
  checkin_time        TIMESTAMPTZ,
  networking_opt_in   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Registrations (free ticket sign-ups) ────────────────────
CREATE TABLE IF NOT EXISTS registrations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  event_id        UUID NOT NULL REFERENCES events(id),
  ticket_type_id  UUID NOT NULL REFERENCES ticket_types(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- ─── Sponsor Leads ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sponsor_leads (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sponsor_id   UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  event_id     UUID NOT NULL REFERENCES events(id),
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  company      TEXT,
  message      TEXT,
  source_page  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Media Assets ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_assets (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id         UUID REFERENCES events(id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN ('image','video','document')),
  url              TEXT NOT NULL,
  alt_text_text_id UUID REFERENCES text_objects(id),
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Import Jobs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_jobs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id   UUID REFERENCES events(id),
  type       import_type NOT NULL,
  file_url   TEXT NOT NULL,
  status     import_status NOT NULL DEFAULT 'pending',
  mapping    JSONB NOT NULL DEFAULT '{}',
  results    JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ticket_types_event ON ticket_types(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_event_id ON orders(event_id);
CREATE INDEX IF NOT EXISTS idx_attendees_event_id ON attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_attendees_email ON attendees(email);
CREATE INDEX IF NOT EXISTS idx_attendees_qr ON attendees(qr_code_value);
CREATE INDEX IF NOT EXISTS idx_registrations_user_event ON registrations(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_leads_sponsor ON sponsor_leads(sponsor_id);
