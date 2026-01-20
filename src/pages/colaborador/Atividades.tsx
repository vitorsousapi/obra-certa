import { ColaboradorLayout } from "@/components/layout/ColaboradorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";

export default function ColaboradorAtividades() {
  // TODO: Replace with real data from database
  const atividades: any[] = [];

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

        {/* Tabs */}
        <Tabs defaultValue="todas" className="w-full">
          <TabsList>
            <TabsTrigger value="hoje">
              Hoje
              <Badge variant="secondary" className="ml-2">
                0
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="atrasadas">
              Atrasadas
              <Badge variant="destructive" className="ml-2">
                0
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="todas">
              Todas
              <Badge variant="secondary" className="ml-2">
                0
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hoje" className="mt-4">
            <EmptyState />
          </TabsContent>

          <TabsContent value="atrasadas" className="mt-4">
            <EmptyState />
          </TabsContent>

          <TabsContent value="todas" className="mt-4">
            <EmptyState />
          </TabsContent>
        </Tabs>
      </div>
    </ColaboradorLayout>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">Nenhuma atividade</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Você não possui atividades nesta categoria.
        </p>
      </CardContent>
    </Card>
  );
}
