import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendEtapaSummaryRequest {
  etapaId: string;
  phone: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { etapaId, phone }: SendEtapaSummaryRequest = await req.json();

    if (!etapaId || !phone) {
      return new Response(
        JSON.stringify({ error: "etapaId and phone are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch etapa with obra details
    const { data: etapa, error: etapaError } = await supabase
      .from("etapas")
      .select(`
        id,
        titulo,
        descricao,
        ordem,
        status,
        prazo,
        updated_at,
        obra:obras(id, nome, cliente_nome)
      `)
      .eq("id", etapaId)
      .single();

    if (etapaError || !etapa) {
      console.error("Etapa not found:", etapaError);
      return new Response(
        JSON.stringify({ error: "Etapa não encontrada" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const obraData = etapa.obra as any;
    const obra = Array.isArray(obraData) ? obraData[0] : obraData;
    
    // Format dates
    const completedDate = new Date(etapa.updated_at).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Build message
    let message = `Olá ${obra.cliente_nome}! 👋

Temos uma atualização sobre sua obra *"${obra.nome}"*:

✅ *Etapa ${etapa.ordem}: ${etapa.titulo}*
Status: Aprovada e Concluída
Data de conclusão: ${completedDate}`;

    if (etapa.descricao) {
      message += `\n\nDescrição: ${etapa.descricao}`;
    }

    message += `\n\nAgradecemos sua confiança!
Equipe Tavitrum`;

    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

    // Fetch WhatsApp config
    const { data: config, error: configError } = await supabase
      .from("whatsapp_config")
      .select("*")
      .limit(1)
      .single();

    if (configError || !config) {
      console.error("WhatsApp config not found:", configError);
      return new Response(
        JSON.stringify({ error: "WhatsApp não configurado. Acesse Configurações para configurar." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { api_url, api_key, instance_name } = config;

    // Send message via Evolution API
    const evolutionUrl = `${api_url}/message/sendText/${instance_name}`;
    
    console.log("Sending etapa summary to:", formattedPhone);

    const evolutionResponse = await fetch(evolutionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": api_key,
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
      }),
    });

    const evolutionData = await evolutionResponse.json();
    console.log("Evolution API response:", JSON.stringify(evolutionData));

    if (!evolutionResponse.ok) {
      console.error("Evolution API error:", evolutionData);
      return new Response(
        JSON.stringify({ 
          error: "Erro ao enviar mensagem via WhatsApp",
          details: evolutionData 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Resumo enviado com sucesso"
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-etapa-summary function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
