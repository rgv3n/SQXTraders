-- ============================================================
-- MIGRATION 001: ENUMs & Extensions
-- Run this FIRST in Supabase SQL Editor
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for text search

-- ENUMs
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'sponsor', 'speaker', 'vip_visitor', 'visitor');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled', 'past');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE ticket_visibility AS ENUM ('HIDDEN', 'INVITE_ONLY', 'LOGGED_IN_ONLY', 'PUBLIC');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'paid', 'refunded', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE checkin_status AS ENUM ('pending', 'checked_in', 'no_show');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE sponsor_tier AS ENUM ('platinum', 'gold', 'silver', 'bronze', 'media', 'community');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE import_type AS ENUM ('speakers', 'sponsors', 'sessions', 'attendees', 'translations');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE import_status AS ENUM ('pending', 'processing', 'done', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;
