
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('relatorios', 'relatorios', true, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to relatorios bucket
CREATE POLICY "Admins can upload reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'relatorios' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow public read access to reports
CREATE POLICY "Public can read reports"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'relatorios');
