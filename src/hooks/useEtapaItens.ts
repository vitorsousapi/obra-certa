import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface EtapaItem {
  id: string;
  etapa_id: string;
  descricao: string;
  linha_produto: string;
  concluido: boolean;
  ordem: number;
  created_at: string;
}

export function useEtapaItens(etapaId: string | undefined) {
  return useQuery({
    queryKey: ["etapa-itens", etapaId],
    queryFn: async () => {
      if (!etapaId) return [];
      const { data, error } = await supabase
        .from("etapa_itens")
        .select("*")
        .eq("etapa_id", etapaId)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as EtapaItem[];
    },
    enabled: !!etapaId,
  });
}

export function useSaveEtapaItens() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ etapaId, itens }: { etapaId: string; itens: { descricao: string; linha_produto: string }[] }) => {
      // Delete existing items
      const { error: deleteError } = await supabase
        .from("etapa_itens")
        .delete()
        .eq("etapa_id", etapaId);
      if (deleteError) throw deleteError;

      // Insert new items
      if (itens.length > 0) {
        const { error: insertError } = await supabase
          .from("etapa_itens")
          .insert(
            itens.map((item, index) => ({
              etapa_id: etapaId,
              descricao: item.descricao,
              linha_produto: item.linha_produto,
              ordem: index + 1,
            }))
          );
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["etapa-itens", variables.etapaId] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar itens",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useToggleEtapaItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, concluido, etapaId }: { id: string; concluido: boolean; etapaId: string }) => {
      const { error } = await supabase
        .from("etapa_itens")
        .update({ concluido })
        .eq("id", id);
      if (error) throw error;
      return { etapaId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["etapa-itens", data.etapaId] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar item",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
