import { useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Pencil, Mail, Calendar, User, Send, Loader2, CheckCircle2, FileDown, Phone } from "lucide-react";
import { useObra } from "@/hooks/useObras";
import { useSendReport } from "@/hooks/useSendReport";
import { ObraStatusBadge } from "@/components/obras/ObraStatusBadge";
import { ObraProgressBar } from "@/components/obras/ObraProgressBar";
import { EtapaStepper, type EtapaWithResponsavel } from "@/components/obras/EtapaStepper";
import { AdicionarEtapaDialog } from "@/components/obras/AdicionarEtapaDialog";
import { EditarEtapaDialog } from "@/components/obras/EditarEtapaDialog";
import { PdfPreviewDialog } from "@/components/obras/PdfPreviewDialog";
import { PdfEtapaSelector } from "@/components/obras/PdfEtapaSelector";
import { EtapaWhatsAppActions } from "@/components/obras/EtapaWhatsAppActions";
import { useEtapaAssinaturas } from "@/hooks/useEtapaAssinaturas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export default function ObraDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: obra, isLoading } = useObra(id);
  const { mutate: sendReport, isPending: isSendingReport } = useSendReport();
  const [editingEtapa, setEditingEtapa] = useState<EtapaWithResponsavel | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [pdfSelectorOpen, setPdfSelectorOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [selectedEtapaIds, setSelectedEtapaIds] = useState<string[]>([]);

  // Extract etapa IDs for the hook - must be called before any returns
  const etapas = (obra as any)?.etapas || [];
  const obraData = obra as any;
  
  // Stabilize etapaIds to prevent unnecessary re-renders
  const etapaIds = useMemo(() => etapas.map((e: any) => e.id), [etapas]);
  const { data: etapaAssinaturas } = useEtapaAssinaturas(etapaIds);

  const handleEditEtapa = (etapa: EtapaWithResponsavel) => {
    setEditingEtapa(etapa);
    setEditDialogOpen(true);
  };

  const handleGeneratePdf = (etapaIds: string[]) => {
    setSelectedEtapaIds(etapaIds);
    setPdfPreviewOpen(true);
  };

  const handleExportSingleEtapa = (etapa: EtapaWithResponsavel) => {
    setSelectedEtapaIds([etapa.id]);
    setPdfPreviewOpen(true);
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
              onClick={() => setPdfSelectorOpen(true)}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Visualizar PDF
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
            <Link to={`/obras/${obra.id}/editar`}>
              <Button variant="outline">
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </Link>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{obraData.cliente_telefone || "Não informado"}</p>
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
              onExportClick={handleExportSingleEtapa}
              clienteNome={obra.cliente_nome}
              clienteTelefone={obraData.cliente_telefone}
              showWhatsAppActions={true}
            />
          </CardContent>
        </Card>

        <EditarEtapaDialog
          etapa={editingEtapa}
          obraId={obra.id}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />

        <PdfEtapaSelector
          open={pdfSelectorOpen}
          onOpenChange={setPdfSelectorOpen}
          obraNome={obra.nome}
          etapas={etapas}
          onGenerate={handleGeneratePdf}
        />

        <PdfPreviewDialog
          open={pdfPreviewOpen}
          onOpenChange={setPdfPreviewOpen}
          obraId={obra.id}
          obraNome={obra.nome}
          selectedEtapaIds={selectedEtapaIds}
        />
      </div>
    </AdminLayout>
  );
}
