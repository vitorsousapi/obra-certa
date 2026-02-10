import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendWhatsAppRequest {
  phone: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user has admin role
    const { data: roleData } = await userClient.from("user_roles").select("role").eq("user_id", user.id).single();
    if (roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { phone, message }: SendWhatsAppRequest = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "phone and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phone.replace(/\D/g, "");
    
    // Ensure it has country code (Brazil = 55)
    const formattedPhone = cleanPhone.startsWith("55") 
      ? cleanPhone 
      : `55${cleanPhone}`;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    
    console.log("Sending WhatsApp message to:", formattedPhone);

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
        message: "Mensagem enviada com sucesso",
        data: evolutionData 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-whatsapp function:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
