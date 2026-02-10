
-- Remove overly permissive public RLS policies on etapa_assinaturas
-- Edge functions already handle all signature operations securely via service role
DROP POLICY IF EXISTS "Public can sign with valid token" ON public.etapa_assinaturas;
DROP POLICY IF EXISTS "Public can view with valid token" ON public.etapa_assinaturas;
