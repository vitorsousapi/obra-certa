import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Etapa = Database["public"]["Tables"]["etapas"]["Row"];
type EtapaInsert = Database["public"]["Tables"]["etapas"]["Insert"];
type EtapaUpdate = Database["public"]["Tables"]["etapas"]["Update"];

export function useEtapas(obraId: string | undefined) {
  return useQuery({
    queryKey: ["etapas", obraId],
    queryFn: async () => {
      if (!obraId) return [];
      const { data, error } = await supabase
        .from("etapas")
        .select(`
          *,
          responsavel:profiles!etapas_responsavel_id_fkey(id, full_name, avatar_url),
          etapa_responsaveis(
            responsavel:profiles!etapa_responsaveis_responsavel_id_fkey(id, full_name, avatar_url)
          )
        `)
        .eq("obra_id", obraId)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!obraId,
  });
}

export function useManageEtapaResponsaveis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ etapaId, responsavelIds, obraId }: { etapaId: string; responsavelIds: string[]; obraId: string }) => {
      // Remove all existing responsáveis
      const { error: deleteError } = await supabase
        .from("etapa_responsaveis")
        .delete()
        .eq("etapa_id", etapaId);
      
      if (deleteError) throw deleteError;

      // Add new responsáveis
      if (responsavelIds.length > 0) {
        const { error: insertError } = await supabase
          .from("etapa_responsaveis")
          .insert(
            responsavelIds.map((responsavel_id) => ({
              etapa_id: etapaId,
              responsavel_id,
            }))
          );
        
        if (insertError) throw insertError;
      }

      return { obraId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["etapas", data.obraId] });
      queryClient.invalidateQueries({ queryKey: ["obras", data.obraId] });
    },
  });
}

export function useCreateEtapa() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (etapa: EtapaInsert) => {
      // Get the next order number
      const { data: existingEtapas } = await supabase
        .from("etapas")
        .select("ordem")
        .eq("obra_id", etapa.obra_id)
        .order("ordem", { ascending: false })
        .limit(1);

      const nextOrdem = existingEtapas && existingEtapas.length > 0 
        ? existingEtapas[0].ordem + 1 
        : 1;

      const { data, error } = await supabase
        .from("etapas")
        .insert({ ...etapa, ordem: nextOrdem })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["etapas", data.obra_id] });
      queryClient.invalidateQueries({ queryKey: ["obras", data.obra_id] });
      toast({
        title: "Etapa criada",
        description: "A etapa foi adicionada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar etapa",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateEtapa() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: EtapaUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("etapas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["etapas", data.obra_id] });
      queryClient.invalidateQueries({ queryKey: ["obras", data.obra_id] });
      queryClient.invalidateQueries({ queryKey: ["obras"] }); // Refresh dashboard list and stats
      toast({
        title: "Etapa atualizada",
        description: "A etapa foi atualizada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar etapa",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteEtapa() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, obraId }: { id: string; obraId: string }) => {
      const { error } = await supabase.from("etapas").delete().eq("id", id);
      if (error) throw error;
      return { obraId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["etapas", data.obraId] });
      queryClient.invalidateQueries({ queryKey: ["obras", data.obraId] });
      toast({
        title: "Etapa removida",
        description: "A etapa foi removida com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover etapa",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function usePendingEtapasCount() {
  return useQuery({
    queryKey: ["etapas", "pending-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("etapas")
        .select("id")
        .eq("status", "submetida");
      if (error) throw error;
      return data.length;
    },
  });
}
