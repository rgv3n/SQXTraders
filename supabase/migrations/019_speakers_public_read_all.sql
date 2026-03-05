-- 019_speakers_public_read_all.sql
-- Allow all speakers to be read publicly (global directory).
-- Previously required assignment to a published event.

DROP POLICY IF EXISTS "speakers_public_read" ON speakers;
CREATE POLICY "speakers_public_read" ON speakers
    FOR SELECT USING (true);
