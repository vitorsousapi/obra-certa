import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ObraForSigning {
  id: string;
  nome: string;
  cliente_nome: string;
  assinatura_data: string | null;
  etapas: { id: string; titulo: string; status: string }[];
}

export function useObraByToken(token: string | undefined) {
  return useQuery({
    queryKey: ["obra-token", token],
    queryFn: async (): Promise<ObraForSigning | null> => {
      if (!token) return null;

      const { data, error } = await supabase
        .from("obras")
        .select(`
          id,
          nome,
          cliente_nome,
          assinatura_data,
          etapas(id, titulo, status)
        `)
        .eq("assinatura_token", token)
        .single();

      if (error) {
        console.error("Error fetching obra by token:", error);
        return null;
      }

      return data as ObraForSigning;
    },
    enabled: !!token,
  });
}

export function useSignObra() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ token, nome }: { token: string; nome: string }) => {
      // Get client IP (best effort)
      let clientIp = "unknown";
      try {
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        clientIp = ipData.ip;
      } catch {
        console.log("Could not fetch client IP");
      }

      const { error } = await supabase
        .from("obras")
        .update({
          assinatura_data: new Date().toISOString(),
          assinatura_nome: nome,
          assinatura_ip: clientIp,
        })
        .eq("assinatura_token", token)
        .is("assinatura_data", null);

      if (error) throw error;

      return { success: true };
    },
    onSuccess: () => {
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
