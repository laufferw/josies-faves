-- Storage RLS policies for recipe-photos bucket
-- Run this in Supabase Dashboard → SQL Editor

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload recipe photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'recipe-photos');

-- Allow public to view photos (bucket is public)
CREATE POLICY "Public can view recipe photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'recipe-photos');

-- Allow authenticated users to update their own photos
CREATE POLICY "Authenticated users can update recipe photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'recipe-photos');

-- Allow authenticated users to delete their own photos
CREATE POLICY "Authenticated users can delete recipe photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'recipe-photos');
