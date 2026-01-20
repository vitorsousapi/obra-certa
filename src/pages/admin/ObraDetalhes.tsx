import { Link, useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Pencil, Mail, Calendar, User } from "lucide-react";
import { useObra } from "@/hooks/useObras";
import { ObraStatusBadge } from "@/components/obras/ObraStatusBadge";
import { ObraProgressBar } from "@/components/obras/ObraProgressBar";
import { EtapaStepper } from "@/components/obras/EtapaStepper";
import { AdicionarEtapaDialog } from "@/components/obras/AdicionarEtapaDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export default function ObraDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: obra, isLoading } = useObra(id);

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
          <Link to={`/obras/${obra.id}/editar`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </Link>
        </div>

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
            <EtapaStepper etapas={etapas} />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
