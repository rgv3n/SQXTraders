-- 017_speakers_public_rls_fix.sql
-- Fix speakers_public_read policy to allow global speakers (event_id IS NULL)
-- that are assigned to published events via the event_speakers join table.

-- Update speakers public read: allow if assigned to any published event via event_speakers
DROP POLICY IF EXISTS "speakers_public_read" ON speakers;
CREATE POLICY "speakers_public_read" ON speakers
    FOR SELECT USING (
        -- Legacy: speaker directly linked to a published event
        (event_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM events e WHERE e.id = event_id AND e.status = 'published'
        ))
        OR
        -- New: global speaker (event_id IS NULL) assigned via event_speakers to a published event
        EXISTS (
            SELECT 1 FROM event_speakers es
            JOIN events e ON e.id = es.event_id
            WHERE es.speaker_id = speakers.id AND e.status = 'published'
        )
    );
