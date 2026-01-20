-- Allow colaboradores to update signature fields on obras where they are the last stage responsible
CREATE POLICY "Colaboradores can sign obras they are responsible for"
ON public.obras
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM etapas e
    WHERE e.obra_id = obras.id
    AND e.responsavel_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND e.ordem = (SELECT MAX(ordem) FROM etapas WHERE obra_id = obras.id)
  )
  AND assinatura_liberada = true
  AND assinatura_data IS NULL
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM etapas e
    WHERE e.obra_id = obras.id
    AND e.responsavel_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND e.ordem = (SELECT MAX(ordem) FROM etapas WHERE obra_id = obras.id)
  )
  AND assinatura_liberada = true
);