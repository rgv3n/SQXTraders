-- 018_event_sponsors.sql
-- Many-to-many join table between events and sponsors.
-- Sponsor tier (platinum/gold/…) is per assignment, not global.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Make sponsors.event_id nullable (global pool) ────────────
ALTER TABLE sponsors ALTER COLUMN event_id DROP NOT NULL;

-- ─── Join table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_sponsors (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id    UUID NOT NULL,
    sponsor_id  UUID NOT NULL,
    tier        TEXT NOT NULL DEFAULT 'gold',
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT event_sponsors_event_fk FOREIGN KEY (event_id)
        REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT event_sponsors_sponsor_fk FOREIGN KEY (sponsor_id)
        REFERENCES sponsors(id) ON DELETE CASCADE,
    CONSTRAINT event_sponsors_unique UNIQUE (event_id, sponsor_id)
);

CREATE INDEX IF NOT EXISTS idx_event_sponsors_event   ON event_sponsors(event_id);
CREATE INDEX IF NOT EXISTS idx_event_sponsors_sponsor ON event_sponsors(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_event_sponsors_order   ON event_sponsors(event_id, order_index);

-- ─── RLS ───────────────────────────────────────────────────────
ALTER TABLE event_sponsors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_sponsors_public_read" ON event_sponsors;
CREATE POLICY "event_sponsors_public_read" ON event_sponsors
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "event_sponsors_admin_all" ON event_sponsors;
CREATE POLICY "event_sponsors_admin_all" ON event_sponsors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- ─── Update sponsors_public_read to cover global sponsors ──────
DROP POLICY IF EXISTS "sponsors_public_read" ON sponsors;
CREATE POLICY "sponsors_public_read" ON sponsors
    FOR SELECT USING (
        -- Legacy: directly linked to a published event
        (event_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM events e WHERE e.id = event_id AND e.status = 'published'
        ))
        OR
        -- New: global sponsor assigned via event_sponsors to a published event
        EXISTS (
            SELECT 1 FROM event_sponsors es
            JOIN events e ON e.id = es.event_id
            WHERE es.sponsor_id = sponsors.id AND e.status = 'published'
        )
    );

-- ─── Migrate existing data ─────────────────────────────────────
INSERT INTO event_sponsors (event_id, sponsor_id, tier, order_index)
SELECT event_id, id, COALESCE(tier, 'gold'), 0
FROM sponsors
WHERE event_id IS NOT NULL
ON CONFLICT (event_id, sponsor_id) DO NOTHING;
