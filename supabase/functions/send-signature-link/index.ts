import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendSignatureLinkRequest {
  etapaId: string;
  phone: string;
  baseUrl: string; // Frontend URL for building the signature link
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { etapaId, phone, baseUrl }: SendSignatureLinkRequest = await req.json();

    if (!etapaId || !phone || !baseUrl) {
      return new Response(
        JSON.stringify({ error: "etapaId, phone, and baseUrl are required" }),
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
        ordem,
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

    // Check if signature already exists for this etapa
    const { data: existingSignature } = await supabase
      .from("etapa_assinaturas")
      .select("id, assinatura_data")
      .eq("etapa_id", etapaId)
      .maybeSingle();

    if (existingSignature?.assinatura_data) {
      return new Response(
        JSON.stringify({ error: "Esta etapa já foi assinada" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let token: string;

    if (existingSignature) {
      // Update the existing signature record with new link sent time
      const { data: updated, error: updateError } = await supabase
        .from("etapa_assinaturas")
        .update({ link_enviado_em: new Date().toISOString() })
        .eq("id", existingSignature.id)
        .select("token")
        .single();

      if (updateError || !updated) {
        console.error("Error updating signature record:", updateError);
        return new Response(
          JSON.stringify({ error: "Erro ao atualizar registro de assinatura" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      token = updated.token;
    } else {
      // Create new signature record
      const { data: signature, error: signatureError } = await supabase
        .from("etapa_assinaturas")
        .insert({
          etapa_id: etapaId,
          link_enviado_em: new Date().toISOString(),
        })
        .select("token")
        .single();

      if (signatureError || !signature) {
        console.error("Error creating signature record:", signatureError);
        return new Response(
          JSON.stringify({ error: "Erro ao criar registro de assinatura" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      token = signature.token;
    }

    // Build signature link
    const signatureLink = `${baseUrl}/assinar/${token}`;

    // Build message
    const obraData = etapa.obra as any;
    const obra = Array.isArray(obraData) ? obraData[0] : obraData;
    const message = `Olá ${obra.cliente_nome}! 👋

A etapa *"${etapa.titulo}"* (etapa ${etapa.ordem}) da obra *"${obra.nome}"* foi aprovada e concluída.

Por favor, acesse o link abaixo para confirmar o recebimento com sua assinatura:

${signatureLink}

Atenciosamente,
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

    // Check connection status before sending
    const statusUrl = `${api_url}/instance/connectionState/${instance_name}`;
    const statusResponse = await fetch(statusUrl, {
      headers: { "apikey": api_key }
    });
    const statusData = await statusResponse.json();
    const connectionState = statusData?.instance?.state || statusData?.state || "unknown";
    
    console.log("WhatsApp connection state:", connectionState);
    
    if (connectionState !== "open" && connectionState !== "connected") {
      // Update connected status in database
      await supabase
        .from("whatsapp_config")
        .update({ connected: false, updated_at: new Date().toISOString() })
        .eq("id", config.id);

      return new Response(
        JSON.stringify({ 
          error: "WhatsApp desconectado. Por favor, reconecte a instância nas Configurações.",
          connectionState: connectionState
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update connected status to true
    await supabase
      .from("whatsapp_config")
      .update({ connected: true, updated_at: new Date().toISOString() })
      .eq("id", config.id);

    // Send message via Evolution API
    const evolutionUrl = `${api_url}/message/sendText/${instance_name}`;
    
    console.log("Sending signature link to:", formattedPhone);

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
        message: "Link de assinatura enviado com sucesso",
        signatureLink,
        token
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-signature-link function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
