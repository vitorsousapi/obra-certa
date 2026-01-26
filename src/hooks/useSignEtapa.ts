import { useMutation, useQueryClient } from "@tanstack/react-query";
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
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/sign-etapa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          signatureBase64: signatureDataUrl,
          nome,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar assinatura");
      }

      return data;
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
