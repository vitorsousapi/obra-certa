import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, CheckSquare, Clock, Plus, ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useObraStats, useObras } from "@/hooks/useObras";
import { usePendingEtapasCount } from "@/hooks/useEtapas";
import { ObraStatusBadge } from "@/components/obras/ObraStatusBadge";
import { ObraProgressBar } from "@/components/obras/ObraProgressBar";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ObraStatusChart } from "@/components/dashboard/ObraStatusChart";
import { EtapaStatusChart } from "@/components/dashboard/EtapaStatusChart";
import { MonthlyObrasChart } from "@/components/dashboard/MonthlyObrasChart";

export default function AdminDashboard() {
  const { data: stats, isLoading: loadingStats } = useObraStats();
  const { data: pendingCount, isLoading: loadingPending } = usePendingEtapasCount();
  const { data: recentObras, isLoading: loadingObras } = useObras();

  const statsCards = [
    {
      title: "Total de Obras",
      value: loadingStats ? "..." : stats?.total ?? 0,
      description: "Cadastradas no sistema",
      icon: Building2,
    },
    {
      title: "Em Andamento",
      value: loadingStats ? "..." : stats?.emAndamento ?? 0,
      description: "Obras ativas",
      icon: Clock,
    },
    {
      title: "Pendentes de Aprovação",
      value: loadingPending ? "..." : pendingCount ?? 0,
      description: "Etapas aguardando revisão",
      icon: CheckSquare,
      link: "/aprovacoes",
    },
  ];

  const displayedObras = recentObras?.slice(0, 5) ?? [];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral das obras e atividades do sistema.
            </p>
          </div>
          <Button asChild>
            <Link to="/obras/nova">
              <Plus className="mr-2 h-4 w-4" />
              Nova Obra
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {statsCards.map((stat) => (
            <Card key={stat.title} className={stat.link ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}>
              {stat.link ? (
                <Link to={stat.link}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </CardContent>
                </Link>
              ) : (
                <>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </CardContent>
                </>
              )}
            </Card>
          ))}
        </div>

        {/* Analytics Charts */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ObraStatusChart stats={stats} isLoading={loadingStats} />
          <EtapaStatusChart />
          <MonthlyObrasChart />
        </div>

        {/* Recent Works */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Obras Recentes</CardTitle>
                <CardDescription>
                  Últimas obras cadastradas no sistema
                </CardDescription>
              </div>
              <Button variant="ghost" asChild>
                <Link to="/obras">
                  Ver todas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingObras ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : displayedObras.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">Nenhuma obra cadastrada</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Comece criando sua primeira obra.
                </p>
                <Button className="mt-4" asChild>
                  <Link to="/obras/nova">
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Obra
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {displayedObras.map((obra) => (
                  <Link
                    key={obra.id}
                    to={`/obras/${obra.id}`}
                    className="flex items-center justify-between py-3 px-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors border-b last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{obra.nome}</span>
                        <ObraStatusBadge status={obra.status} />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>{obra.cliente_nome}</span>
                        <span>•</span>
                        <span>Previsão: {format(new Date(obra.data_prevista), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    </div>
                    <div className="w-32 ml-4">
                      <ObraProgressBar etapas={(obra as any).etapas} showLabel={false} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
