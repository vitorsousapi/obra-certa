import { useState } from "react";
import { ColaboradorLayout } from "@/components/layout/ColaboradorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ClipboardList, Building2, Calendar, Send, Clock, Check, X, AlertTriangle, Paperclip } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { EtapaAnexos } from "@/components/etapas/EtapaAnexos";
import type { Database } from "@/integrations/supabase/types";

type EtapaStatus = Database["public"]["Enums"]["etapa_status"];

interface MinhaEtapa {
  id: string;
  titulo: string;
  descricao: string | null;
  observacoes: string | null;
  prazo: string | null;
  status: EtapaStatus;
  ordem: number;
  obra: {
    id: string;
    nome: string;
    cliente_nome: string;
  };
}

function useMinhasEtapas() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["minhas-etapas", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
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
          obra:obras(id, nome, cliente_nome)
        `)
        .eq("responsavel_id", profile.id)
        .order("prazo", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as unknown as MinhaEtapa[];
    },
    enabled: !!profile?.id,
  });
}

function useSubmitEtapa() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, observacoes }: { id: string; observacoes: string }) => {
      const { error } = await supabase
        .from("etapas")
        .update({ status: "submetida", observacoes })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["minhas-etapas"] });
      toast({
        title: "Etapa submetida",
        description: "Sua etapa foi enviada para aprovação.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao submeter",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

function useStartEtapa() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("etapas")
        .update({ status: "em_andamento" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["minhas-etapas"] });
      toast({
        title: "Etapa iniciada",
        description: "Boa sorte com o trabalho!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao iniciar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

const statusConfig: Record<EtapaStatus, { label: string; icon: React.ReactNode; className: string }> = {
  pendente: { label: "Pendente", icon: <Clock className="h-4 w-4" />, className: "bg-gray-100 text-gray-700" },
  em_andamento: { label: "Em Andamento", icon: <Clock className="h-4 w-4" />, className: "bg-blue-100 text-blue-700" },
  submetida: { label: "Aguardando Aprovação", icon: <Send className="h-4 w-4" />, className: "bg-yellow-100 text-yellow-700" },
  aprovada: { label: "Aprovada", icon: <Check className="h-4 w-4" />, className: "bg-green-100 text-green-700" },
  rejeitada: { label: "Rejeitada", icon: <X className="h-4 w-4" />, className: "bg-red-100 text-red-700" },
};

function EtapaCard({ 
  etapa, 
  onSubmit,
  onStart,
}: { 
  etapa: MinhaEtapa;
  onSubmit: (etapa: MinhaEtapa) => void;
  onStart: (id: string) => void;
}) {
  const config = statusConfig[etapa.status];
  const isOverdue = etapa.prazo && isPast(new Date(etapa.prazo)) && !["aprovada", "submetida"].includes(etapa.status);
  
  return (
    <Card className={isOverdue ? "border-destructive" : ""}>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Building2 className="h-3 w-3" />
                <span>{etapa.obra.nome}</span>
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
            <Badge variant="outline" className={config.className}>
              {config.icon}
              <span className="ml-1">{config.label}</span>
            </Badge>
          </div>

          {/* Observações (para etapas rejeitadas) */}
          {etapa.status === "rejeitada" && etapa.observacoes && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-md">
              <p className="text-sm font-medium text-red-800 mb-1">Motivo da rejeição:</p>
              <p className="text-sm text-red-700">{etapa.observacoes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              {etapa.prazo && (
                <div className={`flex items-center gap-1 text-sm ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {isOverdue && <AlertTriangle className="h-4 w-4" />}
                  <Calendar className="h-3 w-3" />
                  <span>
                    {isOverdue ? "Atrasada - " : "Prazo: "}
                    {format(new Date(etapa.prazo), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {etapa.status === "pendente" && (
                <Button size="sm" onClick={() => onStart(etapa.id)}>
                  Iniciar
                </Button>
              )}
              {(etapa.status === "em_andamento" || etapa.status === "rejeitada") && (
                <Button size="sm" onClick={() => onSubmit(etapa)}>
                  <Send className="h-4 w-4 mr-1" />
                  Submeter
                </Button>
              )}
              {etapa.status === "submetida" && (
                <span className="text-sm text-muted-foreground">Aguardando revisão...</span>
              )}
              {etapa.status === "aprovada" && (
                <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  Concluída
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ColaboradorAtividades() {
  const [submittingEtapa, setSubmittingEtapa] = useState<MinhaEtapa | null>(null);
  const [observacoes, setObservacoes] = useState("");
  
  const { data: etapas, isLoading } = useMinhasEtapas();
  const submitEtapa = useSubmitEtapa();
  const startEtapa = useStartEtapa();

  const handleSubmit = async () => {
    if (!submittingEtapa) return;
    await submitEtapa.mutateAsync({ id: submittingEtapa.id, observacoes });
    setSubmittingEtapa(null);
    setObservacoes("");
  };

  // Filter etapas
  const hoje = etapas?.filter((e) => 
    e.prazo && isToday(new Date(e.prazo)) && !["aprovada"].includes(e.status)
  ) ?? [];
  
  const atrasadas = etapas?.filter((e) => 
    e.prazo && isPast(new Date(e.prazo)) && !["aprovada", "submetida"].includes(e.status)
  ) ?? [];
  
  const pendentes = etapas?.filter((e) => 
    ["pendente", "em_andamento", "rejeitada"].includes(e.status)
  ) ?? [];

  const concluidas = etapas?.filter((e) => 
    e.status === "aprovada"
  ) ?? [];

  return (
    <ColaboradorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas Atividades</h1>
          <p className="text-muted-foreground">
            Gerencie suas etapas e atividades atribuídas.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{pendentes.length}</div>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">
                {etapas?.filter((e) => e.status === "submetida").length ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Aguardando Aprovação</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{atrasadas.length}</div>
              <p className="text-xs text-muted-foreground">Atrasadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{concluidas.length}</div>
              <p className="text-xs text-muted-foreground">Concluídas</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pendentes" className="w-full">
          <TabsList>
            <TabsTrigger value="hoje">
              Hoje
              {hoje.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {hoje.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="atrasadas">
              Atrasadas
              {atrasadas.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {atrasadas.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pendentes">
              Pendentes
              {pendentes.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendentes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="concluidas">
              Concluídas
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="mt-4 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <TabsContent value="hoje" className="mt-4">
                {hoje.length === 0 ? (
                  <EmptyState message="Nenhuma atividade para hoje" />
                ) : (
                  <div className="space-y-4">
                    {hoje.map((etapa) => (
                      <EtapaCard
                        key={etapa.id}
                        etapa={etapa}
                        onSubmit={setSubmittingEtapa}
                        onStart={(id) => startEtapa.mutate(id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="atrasadas" className="mt-4">
                {atrasadas.length === 0 ? (
                  <EmptyState message="Nenhuma atividade atrasada. Parabéns!" icon={<Check className="h-12 w-12 text-green-500" />} />
                ) : (
                  <div className="space-y-4">
                    {atrasadas.map((etapa) => (
                      <EtapaCard
                        key={etapa.id}
                        etapa={etapa}
                        onSubmit={setSubmittingEtapa}
                        onStart={(id) => startEtapa.mutate(id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pendentes" className="mt-4">
                {pendentes.length === 0 ? (
                  <EmptyState message="Nenhuma atividade pendente" />
                ) : (
                  <div className="space-y-4">
                    {pendentes.map((etapa) => (
                      <EtapaCard
                        key={etapa.id}
                        etapa={etapa}
                        onSubmit={setSubmittingEtapa}
                        onStart={(id) => startEtapa.mutate(id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="concluidas" className="mt-4">
                {concluidas.length === 0 ? (
                  <EmptyState message="Nenhuma atividade concluída ainda" />
                ) : (
                  <div className="space-y-4">
                    {concluidas.map((etapa) => (
                      <EtapaCard
                        key={etapa.id}
                        etapa={etapa}
                        onSubmit={setSubmittingEtapa}
                        onStart={(id) => startEtapa.mutate(id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {/* Submit Dialog */}
      <Dialog open={!!submittingEtapa} onOpenChange={() => setSubmittingEtapa(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submeter Etapa: {submittingEtapa?.titulo}</DialogTitle>
            <DialogDescription>
              Adicione fotos, documentos e observações sobre o trabalho realizado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Anexos */}
            <EtapaAnexos etapaId={submittingEtapa?.id || ""} />

            <Separator />

            {/* Observações */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Observações</label>
              <Textarea
                placeholder="Descreva o que foi feito, dificuldades encontradas, etc..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmittingEtapa(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitEtapa.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              {submitEtapa.isPending ? "Enviando..." : "Enviar para Aprovação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ColaboradorLayout>
  );
}

function EmptyState({ message, icon }: { message: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {icon || <ClipboardList className="h-12 w-12 text-muted-foreground/50" />}
        <h3 className="mt-4 text-lg font-medium">{message}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Você não possui atividades nesta categoria.
        </p>
      </CardContent>
    </Card>
  );
}
