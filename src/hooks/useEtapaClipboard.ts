import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCreateEtapa, useManageEtapaResponsaveis } from "@/hooks/useEtapas";
import { useSaveEtapaItens } from "@/hooks/useEtapaItens";
import { useToast } from "@/hooks/use-toast";

const CLIPBOARD_KEY = "etapa-clipboard";

interface ClipboardEtapa {
  titulo: string;
  descricao: string | null;
  prazo: string | null;
  observacoes: string | null;
  itens: Array<{ descricao: string; linha_produto: string }>;
  responsavelIds: string[];
}

export function useEtapaClipboard() {
  const [clipboard, setClipboard] = useState<ClipboardEtapa | null>(null);
  const createEtapa = useCreateEtapa();
  const manageResponsaveis = useManageEtapaResponsaveis();
  const saveItens = useSaveEtapaItens();
  const { toast } = useToast();

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CLIPBOARD_KEY);
      if (stored) setClipboard(JSON.parse(stored));
    } catch {}
  }, []);

  const copyEtapa = useCallback(async (etapaId: string) => {
    try {
      // Fetch etapa details
      const { data: etapa, error: etapaError } = await supabase
        .from("etapas")
        .select("titulo, descricao, prazo, observacoes")
        .eq("id", etapaId)
        .single();
      if (etapaError) throw etapaError;

      // Fetch items
      const { data: itens } = await supabase
        .from("etapa_itens")
        .select("descricao, linha_produto")
        .eq("etapa_id", etapaId)
        .order("ordem", { ascending: true });

      // Fetch responsáveis
      const { data: responsaveis } = await supabase
        .from("etapa_responsaveis")
        .select("responsavel_id")
        .eq("etapa_id", etapaId);

      const clipboardData: ClipboardEtapa = {
        titulo: etapa.titulo,
        descricao: etapa.descricao,
        prazo: etapa.prazo,
        observacoes: etapa.observacoes,
        itens: itens?.map((i) => ({ descricao: i.descricao, linha_produto: i.linha_produto })) || [],
        responsavelIds: responsaveis?.map((r) => r.responsavel_id) || [],
      };

      localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(clipboardData));
      setClipboard(clipboardData);

      toast({
        title: "Etapa copiada",
        description: `"${etapa.titulo}" foi copiada. Cole em qualquer obra.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao copiar",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  const pasteEtapa = useCallback(async (obraId: string) => {
    if (!clipboard) return;

    try {
      const newEtapa = await createEtapa.mutateAsync({
        obra_id: obraId,
        titulo: clipboard.titulo,
        descricao: clipboard.descricao,
        prazo: clipboard.prazo,
      });

      if (!newEtapa?.id) return;

      // Save observacoes via update since createEtapa doesn't include it
      if (clipboard.observacoes) {
        await supabase
          .from("etapas")
          .update({ observacoes: clipboard.observacoes })
          .eq("id", newEtapa.id);
      }

      // Copy responsáveis
      if (clipboard.responsavelIds.length > 0) {
        await manageResponsaveis.mutateAsync({
          etapaId: newEtapa.id,
          responsavelIds: clipboard.responsavelIds,
          obraId,
        });
      }

      // Copy items
      if (clipboard.itens.length > 0) {
        await saveItens.mutateAsync({
          etapaId: newEtapa.id,
          itens: clipboard.itens,
        });
      }

      toast({
        title: "Etapa colada",
        description: `"${clipboard.titulo}" foi adicionada à obra.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao colar",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [clipboard, createEtapa, manageResponsaveis, saveItens, toast]);

  const isPasting = createEtapa.isPending || manageResponsaveis.isPending || saveItens.isPending;

  return { clipboard, copyEtapa, pasteEtapa, isPasting };
}
