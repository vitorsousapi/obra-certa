-- Add phone field to obras table
ALTER TABLE obras ADD COLUMN IF NOT EXISTS cliente_telefone text;

-- Create table for per-etapa signatures
CREATE TABLE IF NOT EXISTS public.etapa_assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id uuid NOT NULL,
  token uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  assinatura_nome text,
  assinatura_data timestamptz,
  assinatura_ip text,
  assinatura_imagem_url text,
  link_enviado_em timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT fk_etapa FOREIGN KEY (etapa_id) REFERENCES etapas(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.etapa_assinaturas ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can manage all signatures
CREATE POLICY "Admins can manage etapa_assinaturas"
ON public.etapa_assinaturas FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS: Allow public update with valid token (for signing)
CREATE POLICY "Public can sign with valid token"
ON public.etapa_assinaturas FOR UPDATE
USING (token IS NOT NULL AND assinatura_data IS NULL)
WITH CHECK (token IS NOT NULL);

-- RLS: Allow public select with valid token (to view signature page)
CREATE POLICY "Public can view with valid token"
ON public.etapa_assinaturas FOR SELECT
USING (token IS NOT NULL);

-- Create table for WhatsApp configuration (Evolution API)
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name text NOT NULL,
  api_url text NOT NULL,
  api_key text NOT NULL,
  connected boolean DEFAULT false,
  qr_code text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage WhatsApp config
CREATE POLICY "Admins can manage whatsapp_config"
ON public.whatsapp_config FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at on whatsapp_config
CREATE TRIGGER update_whatsapp_config_updated_at
BEFORE UPDATE ON public.whatsapp_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();