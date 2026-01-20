import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Clock, Eye, Building2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";

type EtapaStatus = Database["public"]["Enums"]["etapa_status"];

interface EtapaComDetalhes {
  id: string;
  titulo: string;
  descricao: string | null;
  observacoes: string | null;
  prazo: string | null;
  status: EtapaStatus;
  ordem: number;
  updated_at: string;
  obra: {
    id: string;
    nome: string;
    cliente_nome: string;
  };
  responsavel: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

function usePendingEtapas() {
  return useQuery({
    queryKey: ["etapas", "pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("etapas")
        .select(`
          id,
          titulo,
          descricao,
          observacoes,
          prazo,
          status,
          ordem,
          updated_at,
          obra:obras(id, nome, cliente_nome),
          responsavel:profiles!etapas_responsavel_id_fkey(id, full_name, avatar_url)
        `)
        .eq("status", "submetida")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as unknown as EtapaComDetalhes[];
    },
  });
}

function useRecentApprovals() {
  return useQuery({
    queryKey: ["etapas", "recent-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("etapas")
        .select(`
          id,
          titulo,
          descricao,
          observacoes,
          prazo,
          status,
          ordem,
          updated_at,
          obra:obras(id, nome, cliente_nome),
          responsavel:profiles!etapas_responsavel_id_fkey(id, full_name, avatar_url)
        `)
        .in("status", ["aprovada", "rejeitada"])
        .order("updated_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as unknown as EtapaComDetalhes[];
    },
  });
}

function useApproveEtapa() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("etapas")
        .update({ status: "aprovada" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapas"] });
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      toast({
        title: "Etapa aprovada",
        description: "A etapa foi aprovada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao aprovar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

function useRejectEtapa() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await supabase
        .from("etapas")
        .update({ status: "rejeitada", observacoes: motivo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapas"] });
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      toast({
        title: "Etapa rejeitada",
        description: "A etapa foi rejeitada e devolvida ao colaborador.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao rejeitar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

function EtapaCard({ 
  etapa, 
  onApprove, 
  onReject,
  showActions = true 
}: { 
  etapa: EtapaComDetalhes;
  onApprove?: (id: string) => void;
  onReject?: (etapa: EtapaComDetalhes) => void;
  showActions?: boolean;
}) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Building2 className="h-3 w-3" />
                <Link 
                  to={`/obras/${etapa.obra.id}`}
                  className="hover:underline"
                >
                  {etapa.obra.nome}
                </Link>
                <span>•</span>
                <span>Etapa {etapa.ordem}</span>
              </div>
              <h3 className="font-semibold">{etapa.titulo}</h3>
              {etapa.descricao && (
                <p className="text-sm text-muted-foreground mt-1">
                  {etapa.descricao}
                </p>
              )}
            </div>
            {!showActions && (
              <Badge 
                variant={etapa.status === "aprovada" ? "default" : "destructive"}
                className={etapa.status === "aprovada" ? "bg-green-600" : ""}
              >
                {etapa.status === "aprovada" ? "Aprovada" : "Rejeitada"}
              </Badge>
            )}
          </div>

          {/* Observações do colaborador */}
          {etapa.observacoes && showActions && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-medium mb-1">Observações do colaborador:</p>
              <p className="text-sm text-muted-foreground">{etapa.observacoes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-3">
              {etapa.responsavel && (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={etapa.responsavel.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(etapa.responsavel.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{etapa.responsavel.full_name}</span>
                </div>
              )}
              <span className="text-xs text-muted-foreground">
                {format(new Date(etapa.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>

            {showActions && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReject?.(etapa)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Rejeitar
                </Button>
                <Button
                  size="sm"
                  onClick={() => onApprove?.(etapa.id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Aprovar
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Aprovacoes() {
  const [rejectingEtapa, setRejectingEtapa] = useState<EtapaComDetalhes | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState("");

  const { data: pendingEtapas, isLoading: loadingPending } = usePendingEtapas();
  const { data: recentApprovals, isLoading: loadingRecent } = useRecentApprovals();
  const approveEtapa = useApproveEtapa();
  const rejectEtapa = useRejectEtapa();

  const handleReject = async () => {
    if (!rejectingEtapa) return;
    await rejectEtapa.mutateAsync({ id: rejectingEtapa.id, motivo: rejectMotivo });
    setRejectingEtapa(null);
    setRejectMotivo("");
  };

  return (
    <AdminLayout title="Aprovações">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Aprovações</h1>
          <p className="text-muted-foreground">
            Revise e aprove as etapas submetidas pelos colaboradores.
          </p>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pendentes
              {pendingEtapas && pendingEtapas.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingEtapas.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Eye className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {loadingPending ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pendingEtapas?.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Check className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-medium">Tudo em dia!</h3>
                    <p className="text-muted-foreground mt-1">
                      Não há etapas pendentes de aprovação.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingEtapas?.map((etapa) => (
                  <EtapaCard
                    key={etapa.id}
                    etapa={etapa}
                    onApprove={(id) => approveEtapa.mutate(id)}
                    onReject={(e) => setRejectingEtapa(e)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {loadingRecent ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : recentApprovals?.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Nenhum histórico</h3>
                    <p className="text-muted-foreground mt-1">
                      As aprovações e rejeições aparecerão aqui.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {recentApprovals?.map((etapa) => (
                  <EtapaCard
                    key={etapa.id}
                    etapa={etapa}
                    showActions={false}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Reject Dialog */}
      <Dialog open={!!rejectingEtapa} onOpenChange={() => setRejectingEtapa(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Etapa</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Informe o motivo da rejeição para que o colaborador possa corrigir.
            </p>
            <Textarea
              placeholder="Descreva o que precisa ser corrigido..."
              value={rejectMotivo}
              onChange={(e) => setRejectMotivo(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingEtapa(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectMotivo.trim() || rejectEtapa.isPending}
            >
              {rejectEtapa.isPending ? "Rejeitando..." : "Rejeitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
