import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Logo URL - can be updated to use a dynamic URL from settings
const COMPANY_LOGO_URL = "";

interface DownloadPdfParams {
  obraId: string;
  logoUrl?: string;
}

export function useDownloadPdf() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ obraId, logoUrl }: DownloadPdfParams) => {
      const { data, error } = await supabase.functions.invoke("generate-pdf", {
        body: { obraId, logoUrl: logoUrl || COMPANY_LOGO_URL || undefined },
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
