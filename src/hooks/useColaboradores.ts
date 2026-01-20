import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ColaboradorWithRole {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  role: AppRole;
}

export function useColaboradores() {
  return useQuery({
    queryKey: ["colaboradores"],
    queryFn: async (): Promise<ColaboradorWithRole[]> => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });
      
      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      
      if (rolesError) throw rolesError;

      // Create a map of user_id -> role
      const roleMap = new Map<string, AppRole>();
      roles.forEach((r) => roleMap.set(r.user_id, r.role));
      
      return profiles.map((profile) => ({
        ...profile,
        role: roleMap.get(profile.user_id) || "colaborador",
      }));
    },
  });
}

export function usePromoteToAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Get the profile to find the user_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", userId)
        .single();
      
      if (profileError) throw profileError;

      // Update the user_roles table
      const { error } = await supabase
        .from("user_roles")
        .update({ role: "admin" })
        .eq("user_id", profile.user_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
      toast({
        title: "Colaborador promovido",
        description: "O colaborador agora é um administrador.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao promover colaborador",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDemoteToColaborador() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Get the profile to find the user_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", userId)
        .single();
      
      if (profileError) throw profileError;

      // Update the user_roles table
      const { error } = await supabase
        .from("user_roles")
        .update({ role: "colaborador" })
        .eq("user_id", profile.user_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
      toast({
        title: "Administrador rebaixado",
        description: "O usuário agora é um colaborador.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao rebaixar administrador",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
