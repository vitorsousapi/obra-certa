-- Create enum for obra status
CREATE TYPE obra_status AS ENUM ('nao_iniciada', 'em_andamento', 'aguardando_aprovacao', 'concluida', 'cancelada');

-- Create enum for etapa status  
CREATE TYPE etapa_status AS ENUM ('pendente', 'em_andamento', 'submetida', 'aprovada', 'rejeitada');

-- Create obras table
CREATE TABLE public.obras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cliente_nome TEXT NOT NULL,
  cliente_email TEXT NOT NULL,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_prevista DATE NOT NULL,
  data_conclusao DATE,
  status obra_status NOT NULL DEFAULT 'nao_iniciada',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create etapas table
CREATE TABLE public.etapas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 1,
  prazo DATE,
  responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status etapa_status NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for obras
-- Admins can do everything
CREATE POLICY "Admins can manage obras"
  ON public.obras
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Colaboradores can view obras where they have assigned etapas
CREATE POLICY "Colaboradores can view assigned obras"
  ON public.obras
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.etapas 
      WHERE etapas.obra_id = obras.id 
      AND etapas.responsavel_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- RLS Policies for etapas
-- Admins can do everything
CREATE POLICY "Admins can manage etapas"
  ON public.etapas
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Colaboradores can view their assigned etapas
CREATE POLICY "Colaboradores can view assigned etapas"
  ON public.etapas
  FOR SELECT
  USING (
    responsavel_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Colaboradores can update their assigned etapas (to submit work)
CREATE POLICY "Colaboradores can update assigned etapas"
  ON public.etapas
  FOR UPDATE
  USING (
    responsavel_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Create indexes for performance
CREATE INDEX idx_obras_status ON public.obras(status);
CREATE INDEX idx_obras_created_by ON public.obras(created_by);
CREATE INDEX idx_etapas_obra_id ON public.etapas(obra_id);
CREATE INDEX idx_etapas_responsavel_id ON public.etapas(responsavel_id);
CREATE INDEX idx_etapas_status ON public.etapas(status);

-- Create function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_obras_updated_at
  BEFORE UPDATE ON public.obras
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_etapas_updated_at
  BEFORE UPDATE ON public.etapas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();