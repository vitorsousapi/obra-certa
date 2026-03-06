import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
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

// Max images per etapa to avoid CPU timeout
const MAX_IMAGES_PER_ETAPA = 1;

// Helper to fetch image and return a compressed URL for PDF usage
function getResizedImageUrl(url: string, width = 640): string {
  if (!url.includes("/storage/v1/object/public/")) {
    return url;
  }

  const renderUrl = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/",
  );

  const separator = renderUrl.includes("?") ? "&" : "?";
  return `${renderUrl}${separator}width=${width}&quality=45&format=jpeg`;
}

// Helper to convert image URL to base64 with safe fallbacks
async function imageToBase64(url: string): Promise<string | null> {
  const candidates = [getResizedImageUrl(url), url];

  for (let index = 0; index < candidates.length; index++) {
    const candidateUrl = candidates[index];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(candidateUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        continue;
      }

      const buffer = await response.arrayBuffer();
      const maxBytes = index === 0 ? 2 * 1024 * 1024 : 3 * 1024 * 1024;

      if (buffer.byteLength > maxBytes) {
        console.warn("Image too large, skipping:", buffer.byteLength, "bytes");
        continue;
      }

      console.log("Processing image:", buffer.byteLength, "bytes");

      const base64 = encode(buffer);
      const contentType = response.headers.get("content-type") || "image/jpeg";
      const mimeType = contentType.split(";")[0].trim();
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error("Error converting image to base64:", error);
    }
  }

  return null;
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
        data_inicio,
        data_conclusao,
        descricao,
        observacoes,
        etapa_responsaveis(
          responsavel:profiles!etapa_responsaveis_responsavel_id_fkey(full_name)
        )
      `)
      .eq("obra_id", obraId)
      .order("ordem", { ascending: true });

    if (etapaIds && etapaIds.length > 0) {
      etapasQuery = etapasQuery.in("id", etapaIds);
      console.log("Filtering etapas by IDs:", etapaIds);
    }

    const { data: etapasData, error: etapasError } = await etapasQuery;

    if (etapasError) {
      console.error("Error fetching etapas:", etapasError);
    }

    (obra as any).etapas = etapasData || [];

    // Fetch itens and anexos in parallel
    const anexoEtapaIds = (obra as any).etapas?.map((e: any) => e.id) || [];
    let itensByEtapa: Record<string, any[]> = {};
    let anexosByEtapa: Record<string, any[]> = {};

    if (anexoEtapaIds.length > 0) {
      const [itensResult, anexosResult] = await Promise.all([
        supabase
          .from("etapa_itens")
          .select("id, etapa_id, descricao, linha_produto, concluido, ordem")
          .in("etapa_id", anexoEtapaIds)
          .order("ordem", { ascending: true }),
        supabase
          .from("etapa_anexos")
          .select("id, etapa_id, nome, tipo, url, storage_path")
          .in("etapa_id", anexoEtapaIds)
          .order("created_at", { ascending: true }),
      ]);

      if (itensResult.data) {
        for (const item of itensResult.data) {
          if (!itensByEtapa[item.etapa_id]) itensByEtapa[item.etapa_id] = [];
          itensByEtapa[item.etapa_id].push(item);
        }
      }
      console.log("Found etapa_itens:", itensResult.data?.length || 0);

      if (anexosResult.data) {
        for (const anexo of anexosResult.data) {
          if (!anexosByEtapa[anexo.etapa_id]) anexosByEtapa[anexo.etapa_id] = [];
          const publicUrl = getPublicStorageUrl(supabaseUrl, "etapa-anexos", anexo.storage_path);
          anexosByEtapa[anexo.etapa_id].push({ ...anexo, url: publicUrl });
        }
      }
      console.log("Found anexos:", anexosResult.data?.length || 0);
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

    // Pre-fetch ALL images in parallel (limited per etapa) before PDF generation
    const allImageFetches: { etapaId: string; url: string; index: number }[] = [];
    for (const etapa of etapas) {
      const etapaAnexos = anexosByEtapa[etapa.id] || [];
      const imageAnexos = etapaAnexos
        .filter((a: any) => a.tipo?.startsWith("image/"))
        .slice(0, MAX_IMAGES_PER_ETAPA);
      
      imageAnexos.forEach((anexo: any, idx: number) => {
        allImageFetches.push({ etapaId: etapa.id, url: anexo.url, index: idx });
      });
    }

    console.log("Pre-fetching", allImageFetches.length, "images in parallel");

    // Fetch images in batches of 4 to avoid overwhelming the runtime
    const imageCache: Record<string, (string | null)[]> = {};
    const BATCH_SIZE = 1;
    
    for (let i = 0; i < allImageFetches.length; i += BATCH_SIZE) {
      const batch = allImageFetches.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (item) => {
          const base64 = await imageToBase64(item.url);
          return { ...item, base64 };
        })
      );
      
      for (const result of results) {
        if (!imageCache[result.etapaId]) imageCache[result.etapaId] = [];
        imageCache[result.etapaId][result.index] = result.base64;
      }
    }

    console.log("All images pre-fetched, generating PDF");

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 20;
    const marginRight = 20;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let yPos = 20;

    const checkPageBreak = (neededSpace: number) => {
      if (yPos + neededSpace > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };

    // Add logo if provided
    if (logoUrl) {
      try {
        let logoBase64 = logoUrl;
        let imageFormat = "PNG";

        if (!logoUrl.startsWith("data:")) {
          const fetchedLogo = await imageToBase64(logoUrl);
          if (fetchedLogo) logoBase64 = fetchedLogo;
          else logoBase64 = "";
        }

        if (logoBase64 && logoBase64.startsWith("data:image/")) {
          if (logoBase64.includes("data:image/jpeg") || logoBase64.includes("data:image/jpg")) {
            imageFormat = "JPEG";
          }
          const base64Data = logoBase64.split(",")[1];
          if (base64Data && base64Data.length > 100) {
            doc.addImage(logoBase64, imageFormat, marginLeft, yPos, 40, 15);
            yPos += 20;
            console.log("Logo added successfully");
          }
        }
      } catch (e) {
        console.error("Error adding logo:", e);
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
        const responsaveis = (etapa.etapa_responsaveis || [])
          .map((er: any) => er.responsavel?.full_name)
          .filter(Boolean);
        const responsavelText = responsaveis.length > 0 ? responsaveis.join(", ") : "Não atribuído";
        doc.text(`Responsável: ${responsavelText}`, marginLeft + 5, yPos);
        yPos += 6;

        if (etapa.descricao) {
          const descLines = doc.splitTextToSize(`Descrição: ${etapa.descricao}`, contentWidth - 10);
          checkPageBreak(descLines.length * 5 + 5);
          doc.text(descLines, marginLeft + 5, yPos);
          yPos += descLines.length * 5 + 2;
        }

        if (etapa.observacoes) {
          const obsLines = doc.splitTextToSize(`Observações: ${etapa.observacoes}`, contentWidth - 10);
          checkPageBreak(obsLines.length * 5 + 5);
          doc.text(obsLines, marginLeft + 5, yPos);
          yPos += obsLines.length * 5 + 2;
        }

        // Itens (checklist)
        const etapaItens = itensByEtapa[etapa.id] || [];
        if (etapaItens.length > 0) {
          checkPageBreak(10 + etapaItens.length * 6);
          doc.setFont("helvetica", "bold");
          doc.text("Itens:", marginLeft + 5, yPos);
          yPos += 5;
          doc.setFont("helvetica", "normal");

          for (const item of etapaItens) {
            checkPageBreak(8);
            let itemText = `- ${item.descricao}`;
            if (item.linha_produto) itemText += ` — ${item.linha_produto}`;
            const itemLines = doc.splitTextToSize(itemText, contentWidth - 15);
            doc.text(itemLines, marginLeft + 10, yPos);
            yPos += itemLines.length * 4.5 + 2;
          }
          yPos += 3;
        }

        // Anexos (images) - use pre-fetched cache
        const cachedImages = (imageCache[etapa.id] || []).filter(Boolean) as string[];

        if (cachedImages.length > 0) {
          checkPageBreak(50);
          doc.setFont("helvetica", "bold");
          doc.text("Fotos:", marginLeft + 5, yPos);
          yPos += 5;

          let imgX = marginLeft + 5;
          const imgWidth = 50;
          const imgHeight = 35;
          const imgGap = 5;
          let imagesInRow = 0;

          for (const imgBase64 of cachedImages) {
            if (imagesInRow >= 3) {
              imagesInRow = 0;
              imgX = marginLeft + 5;
              yPos += imgHeight + imgGap;
              checkPageBreak(imgHeight + 10);
            }

            try {
              const imageFormat = imgBase64.includes("data:image/png") ? "PNG" : "JPEG";
              doc.addImage(imgBase64, imageFormat, imgX, yPos, imgWidth, imgHeight);
              imgX += imgWidth + imgGap;
              imagesInRow++;
            } catch (e) {
              console.error("Error adding image:", e);
            }
          }

          yPos += imgHeight + 10;
        } else {
          yPos += 5;
        }

        // Separator
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

    // Footer
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

    const pdfBase64 = doc.output("datauristring");

    return new Response(
      JSON.stringify({
        success: true,
        pdf: pdfBase64,
        filename: `relatorio-${obra.nome.toLowerCase().replace(/\s+/g, "-")}.pdf`,
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
