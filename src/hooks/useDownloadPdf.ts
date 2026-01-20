import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useDownloadPdf() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (obraId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-pdf", {
        body: { obraId },
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
