-- Create storage bucket for stage attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('etapa-anexos', 'etapa-anexos', true);

-- RLS policies for etapa-anexos bucket
-- Allow authenticated users to view files
CREATE POLICY "Authenticated users can view etapa anexos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'etapa-anexos' AND auth.role() = 'authenticated');

-- Allow users to upload files to their own folder (using profile_id)
CREATE POLICY "Users can upload etapa anexos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'etapa-anexos' 
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their etapa anexos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'etapa-anexos' 
  AND auth.role() = 'authenticated'
);

-- Create table to track attachments metadata
CREATE TABLE public.etapa_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  etapa_id UUID NOT NULL REFERENCES public.etapas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  tamanho INTEGER NOT NULL,
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.etapa_anexos ENABLE ROW LEVEL SECURITY;

-- Admins can manage all attachments
CREATE POLICY "Admins can manage etapa anexos"
ON public.etapa_anexos
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view attachments of their assigned etapas
CREATE POLICY "Users can view their etapa anexos"
ON public.etapa_anexos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.etapas
    WHERE etapas.id = etapa_anexos.etapa_id
    AND etapas.responsavel_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- Users can insert attachments for their assigned etapas
CREATE POLICY "Users can insert their etapa anexos"
ON public.etapa_anexos
FOR INSERT
WITH CHECK (
  uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.etapas
    WHERE etapas.id = etapa_anexos.etapa_id
    AND etapas.responsavel_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- Users can delete their own attachments
CREATE POLICY "Users can delete their own etapa anexos"
ON public.etapa_anexos
FOR DELETE
USING (
  uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Create index for performance
CREATE INDEX idx_etapa_anexos_etapa_id ON public.etapa_anexos(etapa_id);