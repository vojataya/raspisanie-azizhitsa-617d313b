-- Update storage policies to allow editors to upload/update/delete images

-- Drop old admin-only policies
DROP POLICY IF EXISTS "Admins can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update event images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete event images" ON storage.objects;

-- Create new policies for all staff (admin + editor)
CREATE POLICY "Staff can upload event images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'event-images' AND has_any_role());

CREATE POLICY "Staff can update event images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'event-images' AND has_any_role());

CREATE POLICY "Staff can delete event images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'event-images' AND has_any_role());