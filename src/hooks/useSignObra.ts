import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SignObraParams {
  obraId: string;
  signatureDataUrl: string;
  nome: string;
}

export function useSignObra() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ obraId, signatureDataUrl, nome }: SignObraParams) => {
      // Convert base64 data URL to blob
      const response = await fetch(signatureDataUrl);
      const blob = await response.blob();

      // Generate unique filename
      const filename = `${obraId}_${Date.now()}.png`;

      // Upload signature image to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("assinaturas")
        .upload(filename, blob, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        console.error("Error uploading signature:", uploadError);
        throw new Error("Erro ao salvar imagem da assinatura");
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("assinaturas")
        .getPublicUrl(uploadData.path);

      const signatureUrl = urlData.publicUrl;

      // Get client IP (best effort)
      let clientIp = "unknown";
      try {
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        clientIp = ipData.ip;
      } catch {
        console.log("Could not fetch client IP");
      }

      // Update obra with signature data
      const { error: updateError } = await supabase
        .from("obras")
        .update({
          assinatura_data: new Date().toISOString(),
          assinatura_nome: nome,
          assinatura_ip: clientIp,
          assinatura_imagem_url: signatureUrl,
        })
        .eq("id", obraId);

      if (updateError) {
        console.error("Error updating obra:", updateError);
        throw new Error("Erro ao registrar assinatura");
      }

      return { success: true, signatureUrl };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["obra", variables.obraId] });
      toast({
        title: "Assinatura confirmada",
        description: "O recebimento da obra foi confirmado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao assinar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
