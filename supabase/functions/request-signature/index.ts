import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestSignatureBody {
  obraId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { obraId }: RequestSignatureBody = await req.json();

    if (!obraId) {
      return new Response(
        JSON.stringify({ error: "obraId is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch the obra
    const { data: obra, error: obraError } = await supabase
      .from("obras")
      .select("id, nome, cliente_nome, cliente_email, status, assinatura_data")
      .eq("id", obraId)
      .single();

    if (obraError || !obra) {
      console.error("Error fetching obra:", obraError);
      return new Response(
        JSON.stringify({ error: "Obra not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (obra.assinatura_data) {
      return new Response(
        JSON.stringify({ error: "Esta obra já foi assinada pelo cliente" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate unique token
    const token = crypto.randomUUID();

    // Update obra with token
    const { error: updateError } = await supabase
      .from("obras")
      .update({ assinatura_token: token })
      .eq("id", obraId);

    if (updateError) {
      console.error("Error updating obra with token:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to generate signature token" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build signature link
    const baseUrl = Deno.env.get("SITE_URL") || "https://id-preview--4ce2002e-2bcd-4b5e-b25a-8c20c42d905c.lovable.app";
    const signatureUrl = `${baseUrl}/assinar/${token}`;

    // Send email using Resend API directly via fetch
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TaviList <onboarding@resend.dev>",
        to: [obra.cliente_email],
        subject: `Confirmação de Recebimento - ${obra.nome}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                <h1 style="color: #18181b; font-size: 24px; font-weight: 600; margin: 0 0 24px 0;">
                  Confirmação de Recebimento
                </h1>
                
                <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                  Olá <strong>${obra.cliente_nome}</strong>,
                </p>
                
                <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  A obra <strong>"${obra.nome}"</strong> foi concluída e estamos aguardando sua confirmação de recebimento.
                </p>
                
                <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                  Para atestar o recebimento da obra, clique no botão abaixo:
                </p>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${signatureUrl}" style="display: inline-block; background-color: #18181b; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 500; font-size: 16px;">
                    Confirmar Recebimento
                  </a>
                </div>
                
                <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 32px 0 0 0;">
                  Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
                </p>
                <p style="color: #71717a; font-size: 14px; word-break: break-all; margin: 8px 0 0 0;">
                  ${signatureUrl}
                </p>
              </div>
              
              <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 24px 0 0 0;">
                Este é um email automático enviado pelo sistema TaviList.
              </p>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Email send error:", emailResult);
      return new Response(
        JSON.stringify({ error: emailResult.message || "Failed to send email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Signature request email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, message: "Email de solicitação enviado com sucesso" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in request-signature function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
