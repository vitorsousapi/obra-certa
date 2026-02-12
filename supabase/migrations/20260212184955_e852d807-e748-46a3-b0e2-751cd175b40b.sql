
-- Create etapa_itens table for checklist items per etapa
CREATE TABLE public.etapa_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  etapa_id UUID NOT NULL REFERENCES public.etapas(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  linha_produto TEXT NOT NULL DEFAULT '',
  concluido BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.etapa_itens ENABLE ROW LEVEL SECURITY;

-- Admin can manage all
CREATE POLICY "Admins can manage etapa_itens"
  ON public.etapa_itens
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Colaboradores can view items of their assigned etapas
CREATE POLICY "Colaboradores can view assigned etapa_itens"
  ON public.etapa_itens
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM etapa_responsaveis er
    JOIN profiles p ON p.id = er.responsavel_id
    WHERE er.etapa_id = etapa_itens.etapa_id AND p.user_id = auth.uid()
  ));

-- Colaboradores can update items (mark as concluido) of their assigned etapas
CREATE POLICY "Colaboradores can update assigned etapa_itens"
  ON public.etapa_itens
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM etapa_responsaveis er
    JOIN profiles p ON p.id = er.responsavel_id
    WHERE er.etapa_id = etapa_itens.etapa_id AND p.user_id = auth.uid()
  ));
