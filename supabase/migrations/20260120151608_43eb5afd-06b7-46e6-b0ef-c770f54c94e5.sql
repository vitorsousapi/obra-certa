-- Drop old policies that use the legacy responsavel_id column
DROP POLICY IF EXISTS "Colaboradores can view assigned etapas" ON public.etapas;
DROP POLICY IF EXISTS "Colaboradores can update assigned etapas" ON public.etapas;

-- Create new policies that use the etapa_responsaveis junction table
CREATE POLICY "Colaboradores can view assigned etapas"
ON public.etapas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.etapa_responsaveis er
    JOIN public.profiles p ON p.id = er.responsavel_id
    WHERE er.etapa_id = etapas.id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Colaboradores can update assigned etapas"
ON public.etapas
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.etapa_responsaveis er
    JOIN public.profiles p ON p.id = er.responsavel_id
    WHERE er.etapa_id = etapas.id
    AND p.user_id = auth.uid()
  )
);

-- Also fix etapa_anexos policies to use junction table
DROP POLICY IF EXISTS "Users can view their etapa anexos" ON public.etapa_anexos;
DROP POLICY IF EXISTS "Users can insert their etapa anexos" ON public.etapa_anexos;

CREATE POLICY "Users can view their etapa anexos"
ON public.etapa_anexos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.etapa_responsaveis er
    JOIN public.profiles p ON p.id = er.responsavel_id
    WHERE er.etapa_id = etapa_anexos.etapa_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their etapa anexos"
ON public.etapa_anexos
FOR INSERT
WITH CHECK (
  uploaded_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.etapa_responsaveis er
    JOIN public.profiles p ON p.id = er.responsavel_id
    WHERE er.etapa_id = etapa_anexos.etapa_id
    AND p.user_id = auth.uid()
  )
);

-- Fix obras policy to use junction table for colaboradores viewing
DROP POLICY IF EXISTS "Colaboradores can view assigned obras" ON public.obras;

CREATE POLICY "Colaboradores can view assigned obras"
ON public.obras
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.etapas e
    JOIN public.etapa_responsaveis er ON er.etapa_id = e.id
    JOIN public.profiles p ON p.id = er.responsavel_id
    WHERE e.obra_id = obras.id
    AND p.user_id = auth.uid()
  )
);