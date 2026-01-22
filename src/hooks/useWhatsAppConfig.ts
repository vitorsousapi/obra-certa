import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface WhatsAppConfig {
  id: string;
  instance_name: string;
  api_url: string;
  api_key: string;
  connected: boolean;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
}

export function useWhatsAppConfig() {
  return useQuery({
    queryKey: ["whatsapp-config"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("whatsapp_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as WhatsAppConfig | null;
    },
  });
}

export function useSaveWhatsAppConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (config: {
      instance_name: string;
      api_url: string;
      api_key: string;
    }) => {
      // Check if config exists
      const { data: existing } = await (supabase as any)
        .from("whatsapp_config")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await (supabase as any)
          .from("whatsapp_config")
          .update({
            instance_name: config.instance_name,
            api_url: config.api_url,
            api_key: config.api_key,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await (supabase as any)
          .from("whatsapp_config")
          .insert({
            instance_name: config.instance_name,
            api_url: config.api_url,
            api_key: config.api_key,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-config"] });
      toast({
        title: "Configuração salva",
        description: "As configurações do WhatsApp foram salvas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useTestWhatsAppConnection() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (config: {
      instance_name: string;
      api_url: string;
      api_key: string;
    }) => {
      // Test connection by calling the Evolution API instance status endpoint
      const response = await fetch(`${config.api_url}/instance/connectionState/${config.instance_name}`, {
        method: "GET",
        headers: {
          "apikey": config.api_key,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Falha ao conectar com a Evolution API");
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      const state = data?.instance?.state || data?.state || "unknown";
      if (state === "open" || state === "connected") {
        toast({
          title: "Conexão bem-sucedida",
          description: "WhatsApp está conectado e pronto para uso.",
        });
      } else {
        toast({
          title: "Instância encontrada",
          description: `Status atual: ${state}. Verifique se o WhatsApp está conectado.`,
          variant: "default",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro de conexão",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
