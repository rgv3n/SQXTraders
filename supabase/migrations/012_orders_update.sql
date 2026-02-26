-- ============================================================
-- MIGRATION 012: Orders — voucher columns + user RLS + helpers
-- ============================================================

-- ─── RPC: atomic voucher use counter ─────────────────────────
CREATE OR REPLACE FUNCTION increment_voucher_uses(voucher_uuid UUID)
RETURNS VOID AS $$
  UPDATE vouchers SET uses_count = uses_count + 1 WHERE id = voucher_uuid;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ─── Add voucher tracking to orders ──────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS voucher_id       UUID,
  ADD COLUMN IF NOT EXISTS discount_applied NUMERIC(10,2) NOT NULL DEFAULT 0;

-- FK: orders.voucher_id → vouchers (conditional)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'vouchers'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'orders' AND constraint_name = 'fk_orders_voucher'
    ) THEN
      ALTER TABLE orders
        ADD CONSTRAINT fk_orders_voucher
        FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- ─── RLS: users manage their own orders ──────────────────────
DROP POLICY IF EXISTS "orders_read_own"   ON orders;
DROP POLICY IF EXISTS "orders_insert_own" ON orders;
DROP POLICY IF EXISTS "orders_read_admin" ON orders;

CREATE POLICY "orders_read_own" ON orders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "orders_insert_own" ON orders
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "orders_read_admin" ON orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- ─── RLS: users manage their own attendees ───────────────────
DROP POLICY IF EXISTS "attendees_read_own"   ON attendees;
DROP POLICY IF EXISTS "attendees_insert_own" ON attendees;
DROP POLICY IF EXISTS "attendees_read_admin" ON attendees;

CREATE POLICY "attendees_read_own" ON attendees
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "attendees_insert_own" ON attendees
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "attendees_read_admin" ON attendees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- ─── RLS: public can read active ticket_types ────────────────
DROP POLICY IF EXISTS "ticket_types_public_read" ON ticket_types;

CREATE POLICY "ticket_types_public_read" ON ticket_types
  FOR SELECT USING (is_active = TRUE AND is_hidden = FALSE);

CREATE POLICY "ticket_types_admin_all" ON ticket_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );
