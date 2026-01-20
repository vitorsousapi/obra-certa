import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Obra = Database["public"]["Tables"]["obras"]["Row"];
type ObraInsert = Database["public"]["Tables"]["obras"]["Insert"];
type ObraUpdate = Database["public"]["Tables"]["obras"]["Update"];
type ObraStatus = Database["public"]["Enums"]["obra_status"];

export function useObras(filters?: { status?: ObraStatus; search?: string }) {
  return useQuery({
    queryKey: ["obras", filters],
    queryFn: async () => {
      let query = supabase
        .from("obras")
        .select(`
          *,
          created_by_profile:profiles!obras_created_by_fkey(full_name)
        `)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.search) {
        query = query.or(
          `nome.ilike.%${filters.search}%,cliente_nome.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useObra(id: string | undefined) {
  return useQuery({
    queryKey: ["obras", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("obras")
        .select(`
          *,
          created_by_profile:profiles!obras_created_by_fkey(full_name),
          etapas(
            *,
            responsavel:profiles!etapas_responsavel_id_fkey(id, full_name, avatar_url)
          )
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateObra() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (obra: Omit<ObraInsert, "created_by">) => {
      // Get current user's profile id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!profile) throw new Error("Perfil não encontrado");

      const { data, error } = await supabase
        .from("obras")
        .insert({ ...obra, created_by: profile.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      toast({
        title: "Obra criada",
        description: "A obra foi criada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar obra",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateObra() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ObraUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("obras")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      queryClient.invalidateQueries({ queryKey: ["obras", data.id] });
      toast({
        title: "Obra atualizada",
        description: "A obra foi atualizada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar obra",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteObra() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("obras").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      toast({
        title: "Obra removida",
        description: "A obra foi removida com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover obra",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useObraStats() {
  return useQuery({
    queryKey: ["obras", "stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("obras").select("status");
      if (error) throw error;

      const total = data.length;
      const emAndamento = data.filter((o) => o.status === "em_andamento").length;
      const aguardandoAprovacao = data.filter((o) => o.status === "aguardando_aprovacao").length;
      const concluidas = data.filter((o) => o.status === "concluida").length;

      return { total, emAndamento, aguardandoAprovacao, concluidas };
    },
  });
}
