-- Create function to update obra status based on etapas
CREATE OR REPLACE FUNCTION public.sync_obra_status_from_etapas()
RETURNS TRIGGER AS $$
DECLARE
  v_obra_id uuid;
  v_total_etapas integer;
  v_aprovadas integer;
  v_em_andamento integer;
  v_submetidas integer;
  v_new_status obra_status;
BEGIN
  -- Get the obra_id from the affected etapa
  IF TG_OP = 'DELETE' THEN
    v_obra_id := OLD.obra_id;
  ELSE
    v_obra_id := NEW.obra_id;
  END IF;

  -- Count etapas by status
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'aprovada'),
    COUNT(*) FILTER (WHERE status IN ('em_andamento', 'pendente', 'rejeitada')),
    COUNT(*) FILTER (WHERE status = 'submetida')
  INTO v_total_etapas, v_aprovadas, v_em_andamento, v_submetidas
  FROM etapas
  WHERE obra_id = v_obra_id;

  -- Determine new obra status
  IF v_total_etapas = 0 THEN
    -- No etapas, keep as nao_iniciada
    v_new_status := 'nao_iniciada';
  ELSIF v_aprovadas = v_total_etapas THEN
    -- All etapas approved, obra is completed
    v_new_status := 'concluida';
  ELSIF v_submetidas > 0 THEN
    -- Has submitted etapas waiting for approval
    v_new_status := 'aguardando_aprovacao';
  ELSIF v_aprovadas > 0 OR EXISTS (SELECT 1 FROM etapas WHERE obra_id = v_obra_id AND status = 'em_andamento') THEN
    -- Has started work
    v_new_status := 'em_andamento';
  ELSE
    -- Nothing started yet
    v_new_status := 'nao_iniciada';
  END IF;

  -- Update the obra status
  UPDATE obras
  SET status = v_new_status, updated_at = now()
  WHERE id = v_obra_id AND status != v_new_status;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on etapas table
DROP TRIGGER IF EXISTS sync_obra_status_trigger ON etapas;
CREATE TRIGGER sync_obra_status_trigger
AFTER INSERT OR UPDATE OF status OR DELETE ON etapas
FOR EACH ROW
EXECUTE FUNCTION public.sync_obra_status_from_etapas();