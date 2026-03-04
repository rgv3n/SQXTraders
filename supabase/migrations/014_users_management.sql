-- ============================================================
-- MIGRATION 014: User Management
-- Adds moderator role, email column to profiles, security
-- trigger, and RLS policies for moderator access.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Add moderator value to user_role enum ───────────────────
DO $$ BEGIN
    ALTER TYPE user_role ADD VALUE 'moderator';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Add email column to profiles ────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill email from auth.users for existing rows
UPDATE profiles p
SET    email = au.email
FROM   auth.users au
WHERE  p.user_id = au.id
  AND  p.email IS NULL;

-- ─── Security trigger: only superadmin (or service role) ─────
-- can promote a user to superadmin / admin / moderator.
CREATE OR REPLACE FUNCTION prevent_unauthorized_role_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow if called with service-role key (auth.uid() is NULL)
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;
    -- Block if caller is not superadmin and the new role is
    -- a management role (and the role is actually changing).
    IF NEW.role IN ('superadmin', 'admin', 'moderator')
       AND OLD.role IS DISTINCT FROM NEW.role
       AND get_my_role() IS DISTINCT FROM 'superadmin'
    THEN
        RAISE EXCEPTION 'Only superadmin can assign management roles';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_role_promotion ON profiles;
CREATE TRIGGER enforce_role_promotion
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    WHEN (OLD.role IS DISTINCT FROM NEW.role)
    EXECUTE FUNCTION prevent_unauthorized_role_change();

-- ─── Update profiles read policy to include moderator ────────
DROP POLICY IF EXISTS "profiles_read_admin" ON profiles;
CREATE POLICY "profiles_read_admin" ON profiles
    FOR SELECT
    USING (get_my_role() IN ('admin', 'superadmin', 'moderator'));

-- ─── Moderator RLS: attendees (read + update for check-in) ───
DROP POLICY IF EXISTS "attendees_moderator_read" ON attendees;
CREATE POLICY "attendees_moderator_read" ON attendees
    FOR SELECT
    USING (get_my_role() = 'moderator');

DROP POLICY IF EXISTS "attendees_moderator_checkin" ON attendees;
CREATE POLICY "attendees_moderator_checkin" ON attendees
    FOR UPDATE
    USING (get_my_role() = 'moderator');

-- ─── Moderator RLS: events (read only) ───────────────────────
DROP POLICY IF EXISTS "events_moderator_read" ON events;
CREATE POLICY "events_moderator_read" ON events
    FOR SELECT
    USING (get_my_role() = 'moderator');

-- ─── Moderator RLS: ticket types (read only) ─────────────────
DROP POLICY IF EXISTS "ticket_types_moderator_read" ON ticket_types;
CREATE POLICY "ticket_types_moderator_read" ON ticket_types
    FOR SELECT
    USING (get_my_role() = 'moderator');

-- ─── Moderator RLS: speakers (read only) ─────────────────────
DROP POLICY IF EXISTS "speakers_moderator_read" ON speakers;
CREATE POLICY "speakers_moderator_read" ON speakers
    FOR SELECT
    USING (get_my_role() = 'moderator');

-- ─── Moderator RLS: sponsors (read only) ─────────────────────
DROP POLICY IF EXISTS "sponsors_moderator_read" ON sponsors;
CREATE POLICY "sponsors_moderator_read" ON sponsors
    FOR SELECT
    USING (get_my_role() = 'moderator');
