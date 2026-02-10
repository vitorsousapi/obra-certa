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
    const { token, signatureBase64, nome } = await req.json();

    if (!token || !signatureBase64 || !nome) {
      return new Response(
        JSON.stringify({ error: "Token, assinatura e nome são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate token is UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate nome: trim, length, and character checks
    const nomeTrimmed = nome.trim();
    if (nomeTrimmed.length < 2 || nomeTrimmed.length > 100) {
      return new Response(
        JSON.stringify({ error: "Nome deve ter entre 2 e 100 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!/^[a-zA-ZÀ-ÿ\s'\-\.]+$/.test(nomeTrimmed)) {
      return new Response(
        JSON.stringify({ error: "Nome contém caracteres inválidos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate base64 signature format and size
    if (!/^data:image\/(png|jpeg|jpg);base64,/.test(signatureBase64)) {
      return new Response(
        JSON.stringify({ error: "Formato de assinatura inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const base64Size = signatureBase64.length * 0.75;
    if (base64Size > 500000) {
      return new Response(
        JSON.stringify({ error: "Imagem de assinatura muito grande (máx 500KB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate token exists and is not already signed
    const { data: assinatura, error: fetchError } = await supabase
      .from("etapa_assinaturas")
      .select("id, assinatura_data")
      .eq("token", token)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching assinatura:", fetchError);
      return new Response(
        JSON.stringify({ error: "Erro ao validar token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!assinatura) {
      return new Response(
        JSON.stringify({ error: "Token inválido ou não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (assinatura.assinatura_data) {
      return new Response(
        JSON.stringify({ error: "Esta etapa já foi assinada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert base64 to blob
    const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, "");
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Generate unique filename
    const filename = `etapa-${token}-${Date.now()}.png`;

    // Upload to storage using service role (bypasses RLS)
    const { error: uploadError } = await supabase.storage
      .from("assinaturas")
      .upload(filename, bytes, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading signature:", uploadError);
      return new Response(
        JSON.stringify({ error: `Erro ao fazer upload da assinatura: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("assinaturas")
      .getPublicUrl(filename);

    const assinaturaUrl = publicUrlData.publicUrl;

    // Get client IP from headers
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "Não disponível";

    // Update etapa_assinaturas with signature details
    const { error: updateError } = await supabase
      .from("etapa_assinaturas")
      .update({
        assinatura_nome: nomeTrimmed,
        assinatura_data: new Date().toISOString(),
        assinatura_ip: clientIp,
        assinatura_imagem_url: assinaturaUrl,
      })
      .eq("token", token);

    if (updateError) {
      console.error("Error updating assinatura:", updateError);
      return new Response(
        JSON.stringify({ error: `Erro ao salvar assinatura: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Assinatura registrada com sucesso" }),
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
