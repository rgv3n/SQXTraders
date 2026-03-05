-- 016_event_speakers.sql
-- Many-to-many join table between events and speakers
-- Replaces the direct event_id FK on speakers for event assignment

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Join table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_speakers (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id    UUID NOT NULL,
    speaker_id  UUID NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT event_speakers_event_fk FOREIGN KEY (event_id)
        REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT event_speakers_speaker_fk FOREIGN KEY (speaker_id)
        REFERENCES speakers(id) ON DELETE CASCADE,
    CONSTRAINT event_speakers_unique UNIQUE (event_id, speaker_id)
);

CREATE INDEX IF NOT EXISTS idx_event_speakers_event   ON event_speakers(event_id);
CREATE INDEX IF NOT EXISTS idx_event_speakers_speaker ON event_speakers(speaker_id);
CREATE INDEX IF NOT EXISTS idx_event_speakers_order   ON event_speakers(event_id, order_index);

-- ─── RLS ───────────────────────────────────────────────────────
ALTER TABLE event_speakers ENABLE ROW LEVEL SECURITY;

-- Public: read (for public event detail page)
DROP POLICY IF EXISTS "event_speakers_public_read" ON event_speakers;
CREATE POLICY "event_speakers_public_read" ON event_speakers
    FOR SELECT USING (true);

-- Admin / superadmin: full access
DROP POLICY IF EXISTS "event_speakers_admin_all" ON event_speakers;
CREATE POLICY "event_speakers_admin_all" ON event_speakers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Moderator: read only
DROP POLICY IF EXISTS "event_speakers_moderator_read" ON event_speakers;
CREATE POLICY "event_speakers_moderator_read" ON event_speakers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.role = 'moderator'
        )
    );

-- ─── Migrate existing data ─────────────────────────────────────
-- If speakers already have event_id set, create event_speakers rows for them
INSERT INTO event_speakers (event_id, speaker_id, order_index)
SELECT event_id, id, COALESCE(order_index, 0)
FROM speakers
WHERE event_id IS NOT NULL
ON CONFLICT (event_id, speaker_id) DO NOTHING;
