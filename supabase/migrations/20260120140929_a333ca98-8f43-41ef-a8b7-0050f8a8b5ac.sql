-- Add signature image URL column to obras
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS assinatura_imagem_url text;

-- Create bucket for signature images
INSERT INTO storage.buckets (id, name, public)
VALUES ('assinaturas', 'assinaturas', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to signatures
CREATE POLICY "Anyone can view signatures"
ON storage.objects FOR SELECT
USING (bucket_id = 'assinaturas');

-- Allow authenticated users to upload signatures
CREATE POLICY "Authenticated users can upload signatures"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assinaturas' AND auth.role() = 'authenticated');

-- Allow admins to delete signatures
CREATE POLICY "Admins can delete signatures"
ON storage.objects FOR DELETE
USING (bucket_id = 'assinaturas' AND EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
));