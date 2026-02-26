-- ============================================================
-- MIGRATION 011: Vouchers / Discount Codes
-- Safe to run standalone — FKs added conditionally
-- ============================================================

-- ─── Extensions (idempotent) ──────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Vouchers ────────────────────────────────────────────────
-- event_id is a plain UUID here; FK added below if events exists
CREATE TABLE IF NOT EXISTS vouchers (
  id                UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id          UUID,                                         -- NULL = valid for all events
  code              TEXT    UNIQUE NOT NULL,
  description       TEXT,
  discount_type     TEXT    NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value    NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  currency          TEXT    NOT NULL DEFAULT 'EUR',
  max_uses          INTEGER,                                      -- NULL = unlimited
  uses_count        INTEGER NOT NULL DEFAULT 0,
  max_uses_per_user INTEGER NOT NULL DEFAULT 1,
  valid_from        TIMESTAMPTZ,
  valid_until       TIMESTAMPTZ,
  applies_to_all    BOOLEAN NOT NULL DEFAULT TRUE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Voucher ↔ Ticket type scope ─────────────────────────────
CREATE TABLE IF NOT EXISTS voucher_ticket_types (
  voucher_id     UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  ticket_type_id UUID,                                           -- FK added below if ticket_types exists
  PRIMARY KEY (voucher_id, ticket_type_id)
);

-- ─── Voucher redemptions log ──────────────────────────────────
CREATE TABLE IF NOT EXISTS voucher_redemptions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_id       UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  user_id          UUID,                                         -- FK added below if auth.users exists
  order_id         UUID,
  attendee_id      UUID,
  discount_applied NUMERIC(10,2) NOT NULL,
  redeemed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Conditional FK: vouchers.event_id → events ──────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'events'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'vouchers' AND constraint_name = 'fk_vouchers_event'
    ) THEN
      ALTER TABLE vouchers
        ADD CONSTRAINT fk_vouchers_event
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ─── Conditional FK: voucher_ticket_types.ticket_type_id ─────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ticket_types'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'voucher_ticket_types' AND constraint_name = 'fk_vtt_ticket_type'
    ) THEN
      ALTER TABLE voucher_ticket_types
        ADD CONSTRAINT fk_vtt_ticket_type
        FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ─── Conditional FKs: voucher_redemptions ────────────────────
DO $$
BEGIN
  -- user_id → auth.users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'voucher_redemptions' AND constraint_name = 'fk_redemptions_user'
  ) THEN
    ALTER TABLE voucher_redemptions
      ADD CONSTRAINT fk_redemptions_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'orders'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'voucher_redemptions' AND constraint_name = 'fk_redemptions_order'
    ) THEN
      ALTER TABLE voucher_redemptions
        ADD CONSTRAINT fk_redemptions_order
        FOREIGN KEY (order_id) REFERENCES orders(id);
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'attendees'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'voucher_redemptions' AND constraint_name = 'fk_redemptions_attendee'
    ) THEN
      ALTER TABLE voucher_redemptions
        ADD CONSTRAINT fk_redemptions_attendee
        FOREIGN KEY (attendee_id) REFERENCES attendees(id);
    END IF;
  END IF;
END $$;

-- ─── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vouchers_code       ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_event      ON vouchers(event_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_active     ON vouchers(is_active);
CREATE INDEX IF NOT EXISTS idx_redemptions_voucher ON voucher_redemptions(voucher_id);

-- ─── RLS ──────────────────────────────────────────────────────
ALTER TABLE vouchers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_redemptions  ENABLE ROW LEVEL SECURITY;

-- Drop policies before recreating (idempotent)
DROP POLICY IF EXISTS "vouchers_admin_all"           ON vouchers;
DROP POLICY IF EXISTS "vouchers_public_read_by_code" ON vouchers;
DROP POLICY IF EXISTS "voucher_ticket_types_admin"   ON voucher_ticket_types;
DROP POLICY IF EXISTS "redemptions_admin_read"       ON voucher_redemptions;
DROP POLICY IF EXISTS "redemptions_own_read"         ON voucher_redemptions;
DROP POLICY IF EXISTS "redemptions_insert_auth"      ON voucher_redemptions;

-- Admins manage vouchers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_role') THEN
    EXECUTE $policy$
      CREATE POLICY "vouchers_admin_all" ON vouchers
        FOR ALL USING (get_my_role() IN ('admin','superadmin'));

      CREATE POLICY "voucher_ticket_types_admin" ON voucher_ticket_types
        FOR ALL USING (get_my_role() IN ('admin','superadmin'));

      CREATE POLICY "redemptions_admin_read" ON voucher_redemptions
        FOR SELECT USING (get_my_role() IN ('admin','superadmin'));
    $policy$;
  ELSE
    -- Fallback: admin check via direct join (if get_my_role not defined yet)
    EXECUTE $policy$
      CREATE POLICY "vouchers_admin_all" ON vouchers
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND role IN ('admin','superadmin')
          )
        );

      CREATE POLICY "voucher_ticket_types_admin" ON voucher_ticket_types
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND role IN ('admin','superadmin')
          )
        );

      CREATE POLICY "redemptions_admin_read" ON voucher_redemptions
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND role IN ('admin','superadmin')
          )
        );
    $policy$;
  END IF;
END $$;

-- Public can read active vouchers (for checkout validation)
CREATE POLICY "vouchers_public_read_by_code" ON vouchers
  FOR SELECT USING (is_active = TRUE);

-- Users can read and create their own redemptions
CREATE POLICY "redemptions_own_read" ON voucher_redemptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "redemptions_insert_auth" ON voucher_redemptions
  FOR INSERT WITH CHECK (user_id = auth.uid());
