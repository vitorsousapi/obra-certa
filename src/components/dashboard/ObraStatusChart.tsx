import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface ObraStatusChartProps {
  stats: {
    total: number;
    emAndamento: number;
    aguardandoAprovacao: number;
    concluidas: number;
  } | undefined;
  isLoading: boolean;
}

const COLORS = {
  nao_iniciada: "hsl(var(--muted-foreground))",
  em_andamento: "hsl(var(--primary))",
  aguardando_aprovacao: "hsl(38, 92%, 50%)",
  concluida: "hsl(142, 76%, 36%)",
  cancelada: "hsl(var(--destructive))",
};

export function ObraStatusChart({ stats, isLoading }: ObraStatusChartProps) {
  if (isLoading || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição por Status</CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center">
          <div className="animate-pulse bg-muted rounded-full h-32 w-32" />
        </CardContent>
      </Card>
    );
  }

  const naoIniciada = stats.total - stats.emAndamento - stats.aguardandoAprovacao - stats.concluidas;

  const data = [
    { name: "Não Iniciadas", value: naoIniciada > 0 ? naoIniciada : 0, color: COLORS.nao_iniciada },
    { name: "Em Andamento", value: stats.emAndamento, color: COLORS.em_andamento },
    { name: "Aguardando Aprovação", value: stats.aguardandoAprovacao, color: COLORS.aguardando_aprovacao },
    { name: "Concluídas", value: stats.concluidas, color: COLORS.concluida },
  ].filter(item => item.value > 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição por Status</CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center text-muted-foreground">
          Nenhuma obra cadastrada
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição por Status</CardTitle>
      </CardHeader>
      <CardContent className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value} obras`, '']}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)'
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
