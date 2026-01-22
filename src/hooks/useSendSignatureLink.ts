import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SendSignatureLinkParams {
  etapaId: string;
  phone: string;
}

export function useSendSignatureLink() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ etapaId, phone }: SendSignatureLinkParams) => {
      const baseUrl = window.location.origin;

      const { data, error } = await supabase.functions.invoke("send-signature-link", {
        body: { etapaId, phone, baseUrl },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapa-assinaturas"] });
      queryClient.invalidateQueries({ queryKey: ["etapas"] });
      toast({
        title: "Link enviado",
        description: "O link de assinatura foi enviado para o cliente via WhatsApp.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar link",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
