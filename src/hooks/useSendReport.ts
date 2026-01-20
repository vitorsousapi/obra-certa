import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useSendReport() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (obraId: string) => {
      const { data, error } = await supabase.functions.invoke("send-report", {
        body: { obraId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Relatório enviado",
        description: "O relatório foi enviado com sucesso para o email do cliente.",
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
