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
  logoUrl?: string;
  etapaIds?: string[];
}

// Helper to convert image URL to base64
async function imageToBase64(url: string): Promise<string | null> {
  try {
    console.log("Fetching image from URL:", url);
    const response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to fetch image, status:", response.status);
      return null;
    }
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const mimeType = blob.type || "image/png";
    console.log("Successfully converted image to base64, type:", mimeType);
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error("Error converting image to base64:", error);
    return null;
  }
}

// Helper to get public URL from storage path
function getPublicStorageUrl(supabaseUrl: string, bucketName: string, storagePath: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${storagePath}`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { obraId, logoUrl, etapaIds }: GeneratePdfRequest = await req.json();

    if (!obraId) {
      return new Response(
        JSON.stringify({ error: "obraId is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch obra details
    const { data: obra, error: obraError } = await supabase
      .from("obras")
      .select("*")
      .eq("id", obraId)
      .single();

    if (obraError || !obra) {
      console.error("Error fetching obra:", obraError);
      return new Response(
        JSON.stringify({ error: "Obra not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch etapas - filter by etapaIds if provided
    let etapasQuery = supabase
      .from("etapas")
      .select(`
        id,
        titulo,
        status,
        ordem,
        prazo,
        descricao,
        responsavel:profiles!etapas_responsavel_id_fkey(full_name)
      `)
      .eq("obra_id", obraId)
      .order("ordem", { ascending: true });

    // Apply filter if specific etapa IDs are provided
    if (etapaIds && etapaIds.length > 0) {
      etapasQuery = etapasQuery.in("id", etapaIds);
      console.log("Filtering etapas by IDs:", etapaIds);
    }

    const { data: etapasData, error: etapasError } = await etapasQuery;

    if (etapasError) {
      console.error("Error fetching etapas:", etapasError);
    }

    // Attach etapas to obra object for compatibility
    (obra as any).etapas = etapasData || [];

    // Fetch anexos for all etapas
    const anexoEtapaIds = (obra as any).etapas?.map((e: any) => e.id) || [];
    let anexosByEtapa: Record<string, any[]> = {};
    
    if (anexoEtapaIds.length > 0) {
      const { data: anexos } = await supabase
        .from("etapa_anexos")
        .select("id, etapa_id, nome, tipo, url, storage_path")
        .in("etapa_id", anexoEtapaIds)
        .order("created_at", { ascending: true });

      console.log("Found anexos:", anexos?.length || 0);

      if (anexos) {
        for (const anexo of anexos) {
          if (!anexosByEtapa[anexo.etapa_id]) {
            anexosByEtapa[anexo.etapa_id] = [];
          }
          // Generate fresh public URL from storage path with correct bucket name
          const publicUrl = getPublicStorageUrl(supabaseUrl, "etapa-anexos", anexo.storage_path);
          console.log("Generated public URL for anexo:", publicUrl);
          anexosByEtapa[anexo.etapa_id].push({
            ...anexo,
            url: publicUrl
          });
        }
      }
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
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 20;
    const marginRight = 20;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let yPos = 20;

    // Helper to check page break
    const checkPageBreak = (neededSpace: number) => {
      if (yPos + neededSpace > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };

    // Add logo if provided (can be base64 or URL)
    if (logoUrl) {
      try {
        let logoBase64 = logoUrl;
        let imageFormat = "PNG";
        
        // If it's not already base64, try to fetch it
        if (!logoUrl.startsWith("data:")) {
          const fetchedLogo = await imageToBase64(logoUrl);
          if (fetchedLogo) {
            logoBase64 = fetchedLogo;
          } else {
            console.error("Failed to fetch logo from URL:", logoUrl);
            logoBase64 = "";
          }
        }
        
        if (logoBase64 && logoBase64.startsWith("data:image/")) {
          // Extract format from data URL
          if (logoBase64.includes("data:image/jpeg") || logoBase64.includes("data:image/jpg")) {
            imageFormat = "JPEG";
          } else if (logoBase64.includes("data:image/png")) {
            imageFormat = "PNG";
          }
          
          // Extract only the base64 part for jsPDF
          const base64Data = logoBase64.split(",")[1];
          if (base64Data && base64Data.length > 100) {
            doc.addImage(logoBase64, imageFormat, marginLeft, yPos, 40, 15);
            yPos += 20;
            console.log("Logo added successfully, format:", imageFormat);
          } else {
            console.error("Logo base64 data too short or invalid");
          }
        }
      } catch (e) {
        console.error("Error adding logo:", e);
        // Continue without logo
      }
    }

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

    // Etapas section
    if (totalEtapas > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Etapas", marginLeft, yPos);
      yPos += 10;

      for (const etapa of etapas) {
        checkPageBreak(40);

        // Etapa header
        doc.setFillColor(249, 250, 251);
        doc.rect(marginLeft, yPos, contentWidth, 12, "F");
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${etapa.ordem}. ${etapa.titulo}`, marginLeft + 3, yPos + 8);
        
        // Status badge
        doc.setFontSize(8);
        const statusText = etapaStatusLabels[etapa.status] || etapa.status;
        const statusWidth = doc.getTextWidth(statusText) + 6;
        const statusX = marginLeft + contentWidth - statusWidth - 3;
        
        // Status color
        const statusColors: Record<string, [number, number, number]> = {
          pendente: [156, 163, 175],
          em_andamento: [59, 130, 246],
          submetida: [245, 158, 11],
          aprovada: [34, 197, 94],
          rejeitada: [239, 68, 68],
        };
        const color = statusColors[etapa.status] || [156, 163, 175];
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(statusX, yPos + 2, statusWidth, 8, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.text(statusText, statusX + 3, yPos + 7.5);
        doc.setTextColor(0, 0, 0);
        
        yPos += 15;

        // Etapa details
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Responsável: ${etapa.responsavel?.full_name || "Não atribuído"}`, marginLeft + 5, yPos);
        yPos += 6;

        // Anexos (images) for this etapa
        const etapaAnexos = anexosByEtapa[etapa.id] || [];
        const imageAnexos = etapaAnexos.filter((a: any) => a.tipo?.startsWith("image/"));

        if (imageAnexos.length > 0) {
          checkPageBreak(50);
          doc.setFont("helvetica", "bold");
          doc.text("Fotos:", marginLeft + 5, yPos);
          yPos += 5;

          // Display images in a grid (3 per row)
          let imgX = marginLeft + 5;
          const imgWidth = 50;
          const imgHeight = 35;
          const imgGap = 5;
          let imagesInRow = 0;

          for (const anexo of imageAnexos) {
            if (imagesInRow >= 3) {
              imagesInRow = 0;
              imgX = marginLeft + 5;
              yPos += imgHeight + imgGap;
              checkPageBreak(imgHeight + 10);
            }

            const imgBase64 = await imageToBase64(anexo.url);
            if (imgBase64) {
              try {
                doc.addImage(imgBase64, "JPEG", imgX, yPos, imgWidth, imgHeight);
                imgX += imgWidth + imgGap;
                imagesInRow++;
              } catch (e) {
                console.error("Error adding image:", e);
              }
            }
          }

          yPos += imgHeight + 10;
        } else {
          yPos += 5;
        }

        // Separator line
        doc.setDrawColor(229, 231, 235);
        doc.line(marginLeft, yPos, marginLeft + contentWidth, yPos);
        yPos += 8;
      }
    }

    // Signature section
    if (obra.assinatura_data && obra.assinatura_nome) {
      checkPageBreak(70);

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

      doc.setTextColor(0, 0, 0);
      yPos += 20;

      // Add signature image
      if (obra.assinatura_imagem_url) {
        const sigBase64 = await imageToBase64(obra.assinatura_imagem_url);
        if (sigBase64) {
          checkPageBreak(40);
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("Assinatura:", marginLeft, yPos);
          yPos += 5;
          try {
            doc.addImage(sigBase64, "PNG", marginLeft, yPos, 60, 25);
            yPos += 35;
          } catch (e) {
            console.error("Error adding signature:", e);
          }
        }
      }
    }

    // Footer on each page
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text(
        `Relatório gerado pelo TavList em ${new Date().toLocaleDateString("pt-BR")} - Página ${i} de ${totalPages}`,
        marginLeft,
        pageHeight - 10
      );
    }

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
