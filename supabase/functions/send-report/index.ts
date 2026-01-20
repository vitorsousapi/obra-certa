import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendReportRequest {
  obraId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { obraId }: SendReportRequest = await req.json();

    if (!obraId) {
      return new Response(
        JSON.stringify({ error: "obraId is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch obra details with etapas
    const { data: obra, error: obraError } = await supabase
      .from("obras")
      .select(`
        *,
        etapas(
          id,
          titulo,
          status,
          ordem,
          prazo,
          responsavel:profiles!etapas_responsavel_id_fkey(full_name)
        )
      `)
      .eq("id", obraId)
      .single();

    if (obraError || !obra) {
      console.error("Error fetching obra:", obraError);
      return new Response(
        JSON.stringify({ error: "Obra not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sort etapas by ordem
    const etapas = obra.etapas?.sort((a: any, b: any) => a.ordem - b.ordem) || [];
    const totalEtapas = etapas.length;
    const etapasConcluidas = etapas.filter((e: any) => e.status === "aprovada").length;
    const progresso = totalEtapas > 0 ? Math.round((etapasConcluidas / totalEtapas) * 100) : 0;

    // Generate etapas HTML
    const etapasHtml = etapas.map((etapa: any) => {
      const statusColors: Record<string, string> = {
        pendente: "#9ca3af",
        em_andamento: "#3b82f6",
        submetida: "#f59e0b",
        aprovada: "#22c55e",
        rejeitada: "#ef4444",
      };
      const statusLabels: Record<string, string> = {
        pendente: "Pendente",
        em_andamento: "Em Andamento",
        submetida: "Submetida",
        aprovada: "Aprovada",
        rejeitada: "Rejeitada",
      };
      
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${etapa.ordem}. ${etapa.titulo}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <span style="background-color: ${statusColors[etapa.status]}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
              ${statusLabels[etapa.status]}
            </span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${etapa.responsavel?.full_name || "Não atribuído"}</td>
        </tr>
      `;
    }).join("");

    const statusLabels: Record<string, string> = {
      nao_iniciada: "Não Iniciada",
      em_andamento: "Em Andamento",
      aguardando_aprovacao: "Aguardando Aprovação",
      concluida: "Concluída",
      cancelada: "Cancelada",
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Relatório da Obra: ${obra.nome}</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="color: #111827; margin-bottom: 8px;">Relatório da Obra</h1>
            <h2 style="color: #6b7280; font-weight: normal; margin-top: 0;">${obra.nome}</h2>
            
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="margin: 8px 0;"><strong>Cliente:</strong> ${obra.cliente_nome}</p>
              <p style="margin: 8px 0;"><strong>Status:</strong> ${statusLabels[obra.status]}</p>
              <p style="margin: 8px 0;"><strong>Data de Início:</strong> ${new Date(obra.data_inicio).toLocaleDateString("pt-BR")}</p>
              <p style="margin: 8px 0;"><strong>Data Prevista:</strong> ${new Date(obra.data_prevista).toLocaleDateString("pt-BR")}</p>
              ${obra.data_conclusao ? `<p style="margin: 8px 0;"><strong>Data de Conclusão:</strong> ${new Date(obra.data_conclusao).toLocaleDateString("pt-BR")}</p>` : ""}
            </div>

            <div style="margin: 24px 0;">
              <h3 style="color: #111827;">Progresso: ${progresso}%</h3>
              <div style="background-color: #e5e7eb; border-radius: 4px; height: 20px; overflow: hidden;">
                <div style="background-color: #22c55e; height: 100%; width: ${progresso}%;"></div>
              </div>
              <p style="color: #6b7280; font-size: 14px;">${etapasConcluidas} de ${totalEtapas} etapas concluídas</p>
            </div>

            ${totalEtapas > 0 ? `
              <h3 style="color: #111827;">Etapas</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Etapa</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Status</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  ${etapasHtml}
                </tbody>
              </table>
            ` : "<p style='color: #6b7280;'>Nenhuma etapa cadastrada.</p>"}

            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px;">
                Este relatório foi gerado automaticamente pelo TaviList em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

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
        subject: `Relatório da Obra: ${obra.nome}`,
        html: htmlContent,
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

    console.log("Email sent successfully:", emailResult);

    // Update obra with data_conclusao if status is concluida
    if (obra.status === "concluida" && !obra.data_conclusao) {
      await supabase
        .from("obras")
        .update({ data_conclusao: new Date().toISOString() })
        .eq("id", obraId);
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-report function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
