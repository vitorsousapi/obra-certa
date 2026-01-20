import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useReleaseSignature() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (obraId: string) => {
      const { error } = await supabase
        .from("obras")
        .update({ assinatura_liberada: true })
        .eq("id", obraId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: (_, obraId) => {
      queryClient.invalidateQueries({ queryKey: ["obra", obraId] });
      toast({
        title: "Assinatura liberada",
        description: "O colaborador responsável pela última etapa pode agora solicitar a assinatura do cliente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao liberar assinatura",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
