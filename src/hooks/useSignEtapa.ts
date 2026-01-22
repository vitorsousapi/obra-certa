import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SignEtapaParams {
  token: string;
  signatureDataUrl: string;
  nome: string;
}

export function useSignEtapa() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ token, signatureDataUrl, nome }: SignEtapaParams) => {
      // Convert data URL to blob
      const response = await fetch(signatureDataUrl);
      const blob = await response.blob();

      // Generate unique filename
      const filename = `etapa-${token}-${Date.now()}.png`;

      // Upload signature image to storage
      const { error: uploadError } = await supabase.storage
        .from("assinaturas")
        .upload(filename, blob, {
          contentType: "image/png",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Erro ao fazer upload da assinatura: ${uploadError.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("assinaturas")
        .getPublicUrl(filename);

      const assinaturaUrl = publicUrlData.publicUrl;

      // Try to get client IP
      let clientIp = "Não disponível";
      try {
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        clientIp = ipData.ip;
      } catch (e) {
        console.warn("Could not fetch client IP:", e);
      }

      // Update etapa_assinaturas with signature details
      const { error: updateError } = await (supabase as any)
        .from("etapa_assinaturas")
        .update({
          assinatura_nome: nome,
          assinatura_data: new Date().toISOString(),
          assinatura_ip: clientIp,
          assinatura_imagem_url: assinaturaUrl,
        })
        .eq("token", token);

      if (updateError) {
        throw new Error(`Erro ao salvar assinatura: ${updateError.message}`);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapa-assinatura-token"] });
      toast({
        title: "Assinatura confirmada",
        description: "Obrigado! Sua assinatura foi registrada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao assinar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
