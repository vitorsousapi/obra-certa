-- Fix the signature policy to use etapa_responsaveis junction table instead of legacy responsavel_id
DROP POLICY IF EXISTS "Colaboradores can sign obras they are responsible for" ON public.obras;

CREATE POLICY "Colaboradores can sign obras they are responsible for"
ON public.obras
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.etapas e
    JOIN public.etapa_responsaveis er ON er.etapa_id = e.id
    JOIN public.profiles p ON p.id = er.responsavel_id
    WHERE e.obra_id = obras.id
    AND p.user_id = auth.uid()
    AND e.ordem = (SELECT MAX(ordem) FROM public.etapas WHERE obra_id = obras.id)
  )
  AND assinatura_liberada = true
  AND assinatura_data IS NULL
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.etapas e
    JOIN public.etapa_responsaveis er ON er.etapa_id = e.id
    JOIN public.profiles p ON p.id = er.responsavel_id
    WHERE e.obra_id = obras.id
    AND p.user_id = auth.uid()
    AND e.ordem = (SELECT MAX(ordem) FROM public.etapas WHERE obra_id = obras.id)
  )
  AND assinatura_liberada = true
);