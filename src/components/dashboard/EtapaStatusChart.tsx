import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const COLORS = {
  pendente: "hsl(var(--muted-foreground))",
  em_andamento: "hsl(var(--primary))",
  submetida: "hsl(38, 92%, 50%)",
  aprovada: "hsl(142, 76%, 36%)",
  rejeitada: "hsl(var(--destructive))",
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  submetida: "Submetida",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
};

export function EtapaStatusChart() {
  const { data: etapaStats, isLoading } = useQuery({
    queryKey: ["etapas", "stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("etapas")
        .select("status");
      if (error) throw error;
      
      const counts: Record<string, number> = {
        pendente: 0,
        em_andamento: 0,
        submetida: 0,
        aprovada: 0,
        rejeitada: 0,
      };
      
      data.forEach(etapa => {
        counts[etapa.status] = (counts[etapa.status] || 0) + 1;
      });
      
      return Object.entries(counts).map(([status, count]) => ({
        status,
        name: STATUS_LABELS[status],
        count,
        color: COLORS[status as keyof typeof COLORS],
      }));
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Etapas por Status</CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center">
          <div className="animate-pulse bg-muted rounded h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalEtapas = etapaStats?.reduce((sum, item) => sum + item.count, 0) || 0;

  if (totalEtapas === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Etapas por Status</CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center text-muted-foreground">
          Nenhuma etapa cadastrada
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Etapas por Status</CardTitle>
      </CardHeader>
      <CardContent className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={etapaStats} layout="vertical" margin={{ left: 20, right: 20 }}>
            <XAxis type="number" allowDecimals={false} />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={100}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number) => [`${value} etapas`, '']}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)'
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {etapaStats?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
