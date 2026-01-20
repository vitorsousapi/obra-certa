import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GeneratePdfRequest {
  obraId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { obraId }: GeneratePdfRequest = await req.json();

    if (!obraId) {
      return new Response(
        JSON.stringify({ error: "obraId is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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
          descricao,
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

    const etapas = obra.etapas?.sort((a: any, b: any) => a.ordem - b.ordem) || [];
    const totalEtapas = etapas.length;
    const etapasConcluidas = etapas.filter((e: any) => e.status === "aprovada").length;
    const progresso = totalEtapas > 0 ? Math.round((etapasConcluidas / totalEtapas) * 100) : 0;

    const statusLabels: Record<string, string> = {
      nao_iniciada: "Não Iniciada",
      em_andamento: "Em Andamento",
      aguardando_aprovacao: "Aguardando Aprovação",
      concluida: "Concluída",
      cancelada: "Cancelada",
    };

    const etapaStatusLabels: Record<string, string> = {
      pendente: "Pendente",
      em_andamento: "Em Andamento",
      submetida: "Submetida",
      aprovada: "Aprovada",
      rejeitada: "Rejeitada",
    };

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 20;
    const marginRight = 20;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let yPos = 20;

    // Helper function to add text with word wrap
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number = 6): number => {
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * lineHeight);
    };

    // Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório da Obra", marginLeft, yPos);
    yPos += 10;

    doc.setFontSize(16);
    doc.setFont("helvetica", "normal");
    doc.text(obra.nome, marginLeft, yPos);
    yPos += 15;

    // Info Box
    doc.setFillColor(243, 244, 246);
    doc.rect(marginLeft, yPos, contentWidth, 40, "F");
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Cliente:", marginLeft + 5, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(obra.cliente_nome, marginLeft + 30, yPos);
    yPos += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Status:", marginLeft + 5, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(statusLabels[obra.status] || obra.status, marginLeft + 30, yPos);
    yPos += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Data de Início:", marginLeft + 5, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(new Date(obra.data_inicio).toLocaleDateString("pt-BR"), marginLeft + 40, yPos);
    yPos += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Data Prevista:", marginLeft + 5, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(new Date(obra.data_prevista).toLocaleDateString("pt-BR"), marginLeft + 40, yPos);
    yPos += 15;

    // Progress
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Progresso: ${progresso}%`, marginLeft, yPos);
    yPos += 8;

    // Progress bar
    doc.setFillColor(229, 231, 235);
    doc.rect(marginLeft, yPos, contentWidth, 8, "F");
    doc.setFillColor(34, 197, 94);
    doc.rect(marginLeft, yPos, contentWidth * (progresso / 100), 8, "F");
    yPos += 12;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${etapasConcluidas} de ${totalEtapas} etapas concluídas`, marginLeft, yPos);
    yPos += 15;

    // Etapas Table
    if (totalEtapas > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Etapas", marginLeft, yPos);
      yPos += 8;

      // Table header
      doc.setFillColor(243, 244, 246);
      doc.rect(marginLeft, yPos, contentWidth, 8, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Etapa", marginLeft + 2, yPos + 5.5);
      doc.text("Status", marginLeft + 80, yPos + 5.5);
      doc.text("Responsável", marginLeft + 115, yPos + 5.5);
      yPos += 10;

      // Table rows
      doc.setFont("helvetica", "normal");
      for (const etapa of etapas) {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }

        doc.setDrawColor(229, 231, 235);
        doc.line(marginLeft, yPos + 6, marginLeft + contentWidth, yPos + 6);

        const etapaTitle = `${etapa.ordem}. ${etapa.titulo}`;
        const truncatedTitle = etapaTitle.length > 40 ? etapaTitle.substring(0, 37) + "..." : etapaTitle;
        doc.text(truncatedTitle, marginLeft + 2, yPos + 4);
        doc.text(etapaStatusLabels[etapa.status] || etapa.status, marginLeft + 80, yPos + 4);
        doc.text(etapa.responsavel?.full_name || "Não atribuído", marginLeft + 115, yPos + 4);
        yPos += 10;
      }
      yPos += 10;
    }

    // Signature section
    if (obra.assinatura_data && obra.assinatura_nome) {
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(0.5);
      doc.rect(marginLeft, yPos, contentWidth, 50, "FD");
      yPos += 8;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 101, 52);
      doc.text("Atestado de Recebimento", marginLeft + 5, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.text("Assinado por:", marginLeft + 5, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(obra.assinatura_nome, marginLeft + 35, yPos);
      yPos += 8;

      doc.setFont("helvetica", "bold");
      doc.text("Data:", marginLeft + 5, yPos);
      doc.setFont("helvetica", "normal");
      const signDate = new Date(obra.assinatura_data);
      doc.text(
        `${signDate.toLocaleDateString("pt-BR")} às ${signDate.toLocaleTimeString("pt-BR")}`,
        marginLeft + 20,
        yPos
      );
      yPos += 8;

      if (obra.assinatura_ip) {
        doc.setFont("helvetica", "bold");
        doc.text("IP:", marginLeft + 5, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(obra.assinatura_ip, marginLeft + 15, yPos);
      }

      // Reset text color
      doc.setTextColor(0, 0, 0);
      yPos += 20;

      // Add signature image if available
      if (obra.assinatura_imagem_url) {
        try {
          const imgResponse = await fetch(obra.assinatura_imagem_url);
          if (imgResponse.ok) {
            const imgBlob = await imgResponse.blob();
            const imgBuffer = await imgBlob.arrayBuffer();
            const imgBase64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
            const imgData = `data:image/png;base64,${imgBase64}`;
            
            if (yPos > 230) {
              doc.addPage();
              yPos = 20;
            }

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("Assinatura:", marginLeft, yPos);
            yPos += 5;

            doc.addImage(imgData, "PNG", marginLeft, yPos, 60, 25);
            yPos += 35;
          }
        } catch (imgError) {
          console.error("Error loading signature image:", imgError);
        }
      }
    }

    // Footer
    yPos = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(
      `Relatório gerado automaticamente pelo TaviList em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`,
      marginLeft,
      yPos
    );

    // Generate PDF as base64
    const pdfBase64 = doc.output("datauristring");

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdf: pdfBase64,
        filename: `relatorio-${obra.nome.toLowerCase().replace(/\s+/g, "-")}.pdf`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in generate-pdf function:", error);
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
