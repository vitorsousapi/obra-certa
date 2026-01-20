-- Create junction table for multiple responsáveis per etapa
CREATE TABLE public.etapa_responsaveis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  etapa_id UUID NOT NULL REFERENCES public.etapas(id) ON DELETE CASCADE,
  responsavel_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(etapa_id, responsavel_id)
);

-- Enable RLS
ALTER TABLE public.etapa_responsaveis ENABLE ROW LEVEL SECURITY;

-- Policies for etapa_responsaveis
CREATE POLICY "Admins can manage etapa_responsaveis"
ON public.etapa_responsaveis
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Colaboradores can view their assignments"
ON public.etapa_responsaveis
FOR SELECT
USING (
  responsavel_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Migrate existing data from responsavel_id to new table
INSERT INTO public.etapa_responsaveis (etapa_id, responsavel_id)
SELECT id, responsavel_id FROM public.etapas WHERE responsavel_id IS NOT NULL;

-- Create index for performance
CREATE INDEX idx_etapa_responsaveis_etapa_id ON public.etapa_responsaveis(etapa_id);
CREATE INDEX idx_etapa_responsaveis_responsavel_id ON public.etapa_responsaveis(responsavel_id);