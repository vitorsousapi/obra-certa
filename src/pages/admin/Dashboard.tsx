import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, CheckSquare, Clock, Plus, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  // TODO: Replace with real data from database
  const stats = [
    {
      title: "Total de Obras",
      value: "0",
      description: "Cadastradas no sistema",
      icon: Building2,
    },
    {
      title: "Em Andamento",
      value: "0",
      description: "Obras ativas",
      icon: Clock,
    },
    {
      title: "Pendentes de Aprovação",
      value: "0",
      description: "Etapas aguardando revisão",
      icon: CheckSquare,
    },
  ];

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
          {stats.map((stat) => (
            <Card key={stat.title}>
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
            </Card>
          ))}
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
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
