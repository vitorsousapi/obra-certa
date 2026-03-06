
-- Add data_inicio and data_conclusao columns to etapas
ALTER TABLE public.etapas ADD COLUMN data_inicio date DEFAULT NULL;
ALTER TABLE public.etapas ADD COLUMN data_conclusao date DEFAULT NULL;

-- Create trigger to auto-set data_conclusao when status changes to 'aprovada'
CREATE OR REPLACE FUNCTION public.set_etapa_data_conclusao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'aprovada' AND (OLD.status IS DISTINCT FROM 'aprovada') THEN
    NEW.data_conclusao := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_etapa_data_conclusao
  BEFORE UPDATE ON public.etapas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_etapa_data_conclusao();
