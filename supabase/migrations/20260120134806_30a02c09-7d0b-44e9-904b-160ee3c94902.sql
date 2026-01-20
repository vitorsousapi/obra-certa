-- Add signature fields to obras table
ALTER TABLE public.obras
ADD COLUMN IF NOT EXISTS assinatura_token UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS assinatura_data TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS assinatura_nome TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS assinatura_ip TEXT DEFAULT NULL;

-- Create index on token for fast lookups
CREATE INDEX IF NOT EXISTS idx_obras_assinatura_token ON public.obras(assinatura_token) WHERE assinatura_token IS NOT NULL;

-- Create policy to allow public access to sign obras via valid token
CREATE POLICY "Allow public to sign obra with valid token"
ON public.obras
FOR UPDATE
USING (assinatura_token IS NOT NULL AND assinatura_data IS NULL)
WITH CHECK (assinatura_token IS NOT NULL AND assinatura_data IS NULL);