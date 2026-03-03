import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SendReportParams {
  obraId: string;
  obraNome: string;
  clienteTelefone: string;
  pdfData: string; // base64 data URL
}

export function useSendReport() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ obraId, obraNome, clienteTelefone, pdfData }: SendReportParams) => {
      if (!clienteTelefone) {
        throw new Error("Telefone do cliente não cadastrado. Edite a obra e adicione o telefone.");
      }

      // Convert base64 data URL to blob
      const response = await fetch(pdfData);
      const blob = await response.blob();

      // Upload PDF to storage
      const filename = `relatorio-${obraId}-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("relatorios")
        .upload(filename, blob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Erro ao fazer upload do relatório.");
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("relatorios")
        .getPublicUrl(filename);

      const publicUrl = urlData.publicUrl;

      // Send WhatsApp message with link
      const message = `📋 *Relatório da Obra: ${obraNome}*\n\nOlá! Segue o relatório atualizado da sua obra.\n\n📄 Acesse o relatório completo:\n${publicUrl}\n\n_Relatório gerado pelo HubTav_`;

      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { phone: clienteTelefone, message },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Relatório enviado",
        description: "O relatório foi enviado com sucesso via WhatsApp.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar relatório",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
