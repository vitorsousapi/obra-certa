import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SendEtapaSummaryParams {
  etapaId: string;
  phone: string;
}

export function useSendEtapaSummary() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ etapaId, phone }: SendEtapaSummaryParams) => {
      const { data, error } = await supabase.functions.invoke("send-etapa-summary", {
        body: { etapaId, phone },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Resumo enviado",
        description: "O resumo foi enviado. Pode levar alguns instantes para aparecer no WhatsApp do cliente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar resumo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
