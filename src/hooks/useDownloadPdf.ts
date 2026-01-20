import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Convert image to base64
async function imageToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image to base64:", error);
    return null;
  }
}

// Get logo as base64
const getLogoBase64 = async () => {
  const logoUrl = `${window.location.origin}/images/logo-tavitrum.png`;
  const base64 = await imageToBase64(logoUrl);
  return base64;
};

interface DownloadPdfParams {
  obraId: string;
  logoUrl?: string;
}

export function useDownloadPdf() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ obraId, logoUrl }: DownloadPdfParams) => {
      // Get logo as base64 if not provided
      const logoBase64 = logoUrl || await getLogoBase64();
      
      const { data, error } = await supabase.functions.invoke("generate-pdf", {
        body: { obraId, logoUrl: logoBase64 },
      });

      if (error) {
        console.error("Error generating PDF:", error);
        throw new Error("Erro ao gerar PDF");
      }

      if (!data?.pdf) {
        throw new Error("PDF não foi gerado");
      }

      // Download the PDF
      const link = document.createElement("a");
      link.href = data.pdf;
      link.download = data.filename || "relatorio.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return data;
    },
    onSuccess: () => {
      toast({
        title: "PDF gerado com sucesso",
        description: "O download do relatório foi iniciado.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar PDF",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
