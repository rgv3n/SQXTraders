-- ============================================================
-- MIGRATION 006: Row Level Security (RLS) Policies
-- Run AFTER all tables are created
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- ─── Helper function: get current user role ──────────────────
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─── PROFILES ────────────────────────────────────────────────
-- Users can read their own profile
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT USING (user_id = auth.uid());

-- Admins can read all profiles
CREATE POLICY "profiles_read_admin" ON profiles
  FOR SELECT USING (get_my_role() IN ('admin','superadmin'));

-- Users can update their own profile (not role)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Admins can update any profile (including role)
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (get_my_role() IN ('admin','superadmin'));

-- Auto-created via trigger on auth.users insert
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ─── TEXT OBJECTS (i18n keys) — public read ──────────────────
CREATE POLICY "text_objects_public_read" ON text_objects
  FOR SELECT USING (TRUE);

CREATE POLICY "text_objects_admin_write" ON text_objects
  FOR ALL USING (get_my_role() IN ('admin','superadmin'));

-- ─── TEXT TRANSLATIONS — public read ─────────────────────────
CREATE POLICY "text_translations_public_read" ON text_translations
  FOR SELECT USING (TRUE);

CREATE POLICY "text_translations_admin_write" ON text_translations
  FOR ALL USING (get_my_role() IN ('admin','superadmin'));

-- ─── SETTINGS — admin only ───────────────────────────────────
CREATE POLICY "settings_admin" ON settings
  FOR ALL USING (get_my_role() IN ('admin','superadmin'));

CREATE POLICY "settings_public_read" ON settings
  FOR SELECT USING (TRUE);

-- ─── EVENTS — public read published, admin write ─────────────
CREATE POLICY "events_public_read" ON events
  FOR SELECT USING (status = 'published');

CREATE POLICY "events_admin_all" ON events
  FOR ALL USING (get_my_role() IN ('admin','superadmin'));

-- ─── EVENT SECTIONS ───────────────────────────────────────────
CREATE POLICY "event_sections_public_read" ON event_sections
  FOR SELECT USING (
    is_enabled = TRUE AND
    EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.status = 'published')
  );

CREATE POLICY "event_sections_admin" ON event_sections
  FOR ALL USING (get_my_role() IN ('admin','superadmin'));

-- ─── SESSIONS ────────────────────────────────────────────────
CREATE POLICY "sessions_public_read" ON sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.status = 'published')
  );

CREATE POLICY "sessions_admin" ON sessions
  FOR ALL USING (get_my_role() IN ('admin','superadmin'));

-- ─── SPEAKERS ────────────────────────────────────────────────
CREATE POLICY "speakers_public_read" ON speakers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.status = 'published')
  );

CREATE POLICY "speakers_admin" ON speakers
  FOR ALL USING (get_my_role() IN ('admin','superadmin'));

-- Speaker can read/update their own record
CREATE POLICY "speakers_own" ON speakers
  FOR ALL USING (profile_user_id = auth.uid());

-- ─── SPONSORS ────────────────────────────────────────────────
CREATE POLICY "sponsors_public_read" ON sponsors
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.status = 'published')
  );

CREATE POLICY "sponsors_admin" ON sponsors
  FOR ALL USING (get_my_role() IN ('admin','superadmin'));

-- Sponsor can read/update their own record
CREATE POLICY "sponsors_own" ON sponsors
  FOR ALL USING (profile_user_id = auth.uid());

-- ─── TESTIMONIALS ────────────────────────────────────────────
CREATE POLICY "testimonials_public_read" ON testimonials
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.status = 'published')
  );

CREATE POLICY "testimonials_admin" ON testimonials
  FOR ALL USING (get_my_role() IN ('admin','superadmin'));

-- ─── TICKET TYPES ────────────────────────────────────────────
-- Public can see visible ticket types for published events
CREATE POLICY "ticket_types_public_read" ON ticket_types
  FOR SELECT USING (
    is_active = TRUE
    AND visibility_mode = 'PUBLIC'
    AND is_hidden = FALSE
    AND EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.status = 'published')
  );

-- Logged-in users can see LOGGED_IN_ONLY tickets
CREATE POLICY "ticket_types_logged_in_read" ON ticket_types
  FOR SELECT USING (
    is_active = TRUE
    AND visibility_mode IN ('PUBLIC','LOGGED_IN_ONLY')
    AND is_hidden = FALSE
    AND auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.status = 'published')
  );

CREATE POLICY "ticket_types_admin" ON ticket_types
  FOR ALL USING (get_my_role() IN ('admin','superadmin'));

-- ─── ORDERS ──────────────────────────────────────────────────
CREATE POLICY "orders_own_read" ON orders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "orders_own_insert" ON orders
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "orders_admin" ON orders
  FOR ALL USING (get_my_role() IN ('admin','superadmin'));

-- ─── ATTENDEES ───────────────────────────────────────────────
CREATE POLICY "attendees_own_read" ON attendees
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "attendees_admin" ON attendees
  FOR ALL USING (get_my_role() IN ('admin','superadmin'));

-- ─── REGISTRATIONS ───────────────────────────────────────────
CREATE POLICY "registrations_own" ON registrations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "registrations_own_insert" ON registrations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "registrations_admin" ON registrations
  FOR ALL USING (get_my_role() IN ('admin','superadmin'));

-- ─── SPONSOR LEADS — sponsor sees only their own leads ───────
CREATE POLICY "sponsor_leads_own" ON sponsor_leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sponsors s
      WHERE s.id = sponsor_id AND s.profile_user_id = auth.uid()
    )
  );

CREATE POLICY "sponsor_leads_insert_public" ON sponsor_leads
  FOR INSERT WITH CHECK (TRUE);  -- anyone can submit a lead

CREATE POLICY "sponsor_leads_admin" ON sponsor_leads
  FOR ALL USING (get_my_role() IN ('admin','superadmin'));

-- ─── MEDIA ASSETS ────────────────────────────────────────────
CREATE POLICY "media_assets_public_read" ON media_assets
  FOR SELECT USING (TRUE);

CREATE POLICY "media_assets_admin" ON media_assets
  FOR ALL USING (get_my_role() IN ('admin','superadmin'));

-- ─── IMPORT JOBS — admin only ─────────────────────────────────
CREATE POLICY "import_jobs_admin" ON import_jobs
  FOR ALL USING (get_my_role() IN ('admin','superadmin'));
