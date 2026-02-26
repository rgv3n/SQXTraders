-- ============================================================
-- MIGRATION 010: Storage Buckets
-- ============================================================

-- 1. Create the buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('speakers', 'speakers', true),
  ('sponsors', 'sponsors', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS policies for the bucket
-- Note: storage.objects RLS must be enabled for these to work, 
-- but it's usually enabled by default in Supabase.

-- Allow public read access to all objects in 'speakers' and 'sponsors' buckets
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id IN ('speakers', 'sponsors'));

-- Allow admins/superadmins to upload objects to 'speakers' and 'sponsors' buckets
CREATE POLICY "Admin Upload Access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id IN ('speakers', 'sponsors') AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- Allow admins/superadmins to update/delete objects in 'speakers' and 'sponsors' buckets
CREATE POLICY "Admin Update/Delete Access"
ON storage.objects FOR ALL
USING (
  bucket_id IN ('speakers', 'sponsors') AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);
