-- ============================================================
-- MIGRATION 013: Ticket Types — sales_open flag
-- Allows a ticket to be VISIBLE on the page but NOT purchasable
-- (e.g. "Coming soon" teaser before sales go live)
-- ============================================================

ALTER TABLE ticket_types
  ADD COLUMN IF NOT EXISTS sales_open BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN ticket_types.sales_open IS
  'TRUE = visible and purchasable. FALSE = visible but shows "Coming soon", purchase disabled.';
