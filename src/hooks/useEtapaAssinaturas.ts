import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EtapaAssinatura {
  id: string;
  etapa_id: string;
  token: string;
  assinatura_nome: string | null;
  assinatura_data: string | null;
  assinatura_ip: string | null;
  assinatura_imagem_url: string | null;
  link_enviado_em: string | null;
  created_at: string;
}

export function useEtapaAssinaturas(etapaIds: string[]) {
  return useQuery({
    queryKey: ["etapa-assinaturas", etapaIds],
    queryFn: async () => {
      if (etapaIds.length === 0) return [];

      const { data, error } = await (supabase as any)
        .from("etapa_assinaturas")
        .select("*")
        .in("etapa_id", etapaIds);

      if (error) throw error;
      return data as EtapaAssinatura[];
    },
    enabled: etapaIds.length > 0,
  });
}

export function useEtapaAssinaturaByToken(token: string | undefined) {
  return useQuery({
    queryKey: ["etapa-assinatura-token", token],
    queryFn: async () => {
      if (!token) return null;

      const { data, error } = await supabase.functions.invoke("get-etapa-by-token", {
        body: { token },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Map edge function response to the expected shape
      return {
        id: data.assinatura.id,
        etapa_id: data.etapa.id,
        token,
        assinatura_nome: data.assinatura.assinatura_nome,
        assinatura_data: data.assinatura.assinatura_data,
        assinatura_ip: null,
        assinatura_imagem_url: data.assinatura.assinatura_imagem_url || null,
        link_enviado_em: null,
        created_at: "",
        etapa: {
          id: data.etapa.id,
          titulo: data.etapa.titulo,
          descricao: data.etapa.descricao,
          ordem: data.etapa.ordem,
          obra: data.obra,
        },
      } as EtapaAssinatura & {
        etapa: {
          id: string;
          titulo: string;
          descricao: string | null;
          ordem: number;
          obra: { id: string; nome: string; cliente_nome: string };
        };
      };
    },
    enabled: !!token,
  });
}
