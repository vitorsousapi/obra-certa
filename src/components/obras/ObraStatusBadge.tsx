import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";

type ObraStatus = Database["public"]["Enums"]["obra_status"];

const statusConfig: Record<ObraStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  nao_iniciada: { label: "Não Iniciada", variant: "outline" },
  em_andamento: { label: "Em Andamento", variant: "default" },
  aguardando_aprovacao: { label: "Aguardando Aprovação", variant: "secondary" },
  concluida: { label: "Concluída", variant: "default" },
  cancelada: { label: "Cancelada", variant: "destructive" },
};

interface ObraStatusBadgeProps {
  status: ObraStatus;
}

export function ObraStatusBadge({ status }: ObraStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant={config.variant} className={status === "concluida" ? "bg-green-600" : ""}>
      {config.label}
    </Badge>
  );
}
