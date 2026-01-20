import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Pencil, Mail, Calendar, User, Send, Loader2, Unlock, CheckCircle2, Clock, FileDown } from "lucide-react";
import { useObra } from "@/hooks/useObras";
import { useSendReport } from "@/hooks/useSendReport";
import { useReleaseSignature } from "@/hooks/useReleaseSignature";
import { useDownloadPdf } from "@/hooks/useDownloadPdf";
import { ObraStatusBadge } from "@/components/obras/ObraStatusBadge";
import { ObraProgressBar } from "@/components/obras/ObraProgressBar";
import { EtapaStepper, type EtapaWithResponsavel } from "@/components/obras/EtapaStepper";
import { AdicionarEtapaDialog } from "@/components/obras/AdicionarEtapaDialog";
import { EditarEtapaDialog } from "@/components/obras/EditarEtapaDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export default function ObraDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: obra, isLoading } = useObra(id);
  const { mutate: sendReport, isPending: isSendingReport } = useSendReport();
  const { mutate: releaseSignature, isPending: isReleasing } = useReleaseSignature();
  const { mutate: downloadPdf, isPending: isDownloadingPdf } = useDownloadPdf();
  const [editingEtapa, setEditingEtapa] = useState<EtapaWithResponsavel | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleEditEtapa = (etapa: EtapaWithResponsavel) => {
    setEditingEtapa(etapa);
    setEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <AdminLayout title="Carregando...">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (!obra) {
    return (
      <AdminLayout title="Obra não encontrada">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            A obra solicitada não foi encontrada.
          </p>
          <Link to="/obras">
            <Button>Voltar para Obras</Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const etapas = (obra as any).etapas || [];
  const obraData = obra as any;
  const isObraConcluida = obra.status === "concluida";
  const isAssinada = !!obraData.assinatura_data;
  const isAssinaturaLiberada = !!obraData.assinatura_liberada;

  return (
    <AdminLayout title={obra.nome}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{obra.nome}</h1>
                <ObraStatusBadge status={obra.status} />
              </div>
              <p className="text-muted-foreground">
                Criada em {format(new Date(obra.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline"
              onClick={() => downloadPdf(obra.id)}
              disabled={isDownloadingPdf}
            >
              {isDownloadingPdf ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 mr-2" />
              )}
              Baixar PDF
            </Button>
            <Button 
              variant="outline"
              onClick={() => sendReport(obra.id)}
              disabled={isSendingReport}
            >
              {isSendingReport ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar Relatório
            </Button>
            {isObraConcluida && !isAssinada && !isAssinaturaLiberada && (
              <Button 
                variant="default"
                onClick={() => releaseSignature(obra.id)}
                disabled={isReleasing}
              >
                {isReleasing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Unlock className="h-4 w-4 mr-2" />
                )}
                Liberar para Assinatura
              </Button>
            )}
            <Link to={`/obras/${obra.id}/editar`}>
              <Button variant="outline">
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </Link>
          </div>
        </div>

        {/* Signature Released Status */}
        {isAssinaturaLiberada && !isAssinada && (
          <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Aguardando assinatura do cliente
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    O colaborador responsável pela última etapa pode agora solicitar a assinatura presencialmente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signature Status */}
        {isAssinada && (
          <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Recebimento confirmado pelo cliente
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Assinado por <strong>{obraData.assinatura_nome}</strong> em{" "}
                      {format(new Date(obraData.assinatura_data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                {obraData.assinatura_imagem_url && (
                  <div className="bg-white rounded-md p-2 border">
                    <img
                      src={obraData.assinatura_imagem_url}
                      alt="Assinatura do cliente"
                      className="h-16 max-w-[200px] object-contain"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{obra.cliente_nome}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{obra.cliente_email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Previsão</p>
                  <p className="font-medium">
                    {format(new Date(obra.data_prevista), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progresso Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <ObraProgressBar etapas={etapas} />
          </CardContent>
        </Card>

        {/* Etapas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Etapas</CardTitle>
            <AdicionarEtapaDialog obraId={obra.id} />
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <EtapaStepper 
              etapas={etapas} 
              showEditButton={true}
              onEditClick={handleEditEtapa}
            />
          </CardContent>
        </Card>

        <EditarEtapaDialog
          etapa={editingEtapa}
          obraId={obra.id}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      </div>
    </AdminLayout>
  );
}
