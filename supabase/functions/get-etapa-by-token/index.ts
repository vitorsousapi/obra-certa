import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch assinatura by token
    const { data: assinatura, error: assinaturaError } = await supabase
      .from("etapa_assinaturas")
      .select("id, etapa_id, assinatura_data, assinatura_nome, assinatura_imagem_url")
      .eq("token", token)
      .maybeSingle();

    if (assinaturaError) {
      console.error("Error fetching assinatura:", assinaturaError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar dados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!assinatura) {
      return new Response(
        JSON.stringify({ error: "Token inválido ou não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch etapa with obra
    const { data: etapa, error: etapaError } = await supabase
      .from("etapas")
      .select("id, titulo, descricao, ordem, obra:obras(nome, cliente_nome)")
      .eq("id", assinatura.etapa_id)
      .single();

    if (etapaError) {
      console.error("Error fetching etapa:", etapaError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar dados da etapa" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch anexos
    const { data: anexos, error: anexosError } = await supabase
      .from("etapa_anexos")
      .select("id, nome, url, tipo")
      .eq("etapa_id", assinatura.etapa_id);

    if (anexosError) {
      console.error("Error fetching anexos:", anexosError);
      // Continue without anexos, they're not critical
    }

    return new Response(
      JSON.stringify({
        assinatura: {
          id: assinatura.id,
          assinatura_data: assinatura.assinatura_data,
          assinatura_nome: assinatura.assinatura_nome,
          assinatura_imagem_url: assinatura.assinatura_imagem_url,
        },
        etapa: {
          id: etapa.id,
          titulo: etapa.titulo,
          descricao: etapa.descricao,
          ordem: etapa.ordem,
        },
        obra: etapa.obra,
        anexos: anexos || [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
