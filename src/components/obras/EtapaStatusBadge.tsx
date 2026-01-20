import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";

type EtapaStatus = Database["public"]["Enums"]["etapa_status"];

const statusConfig: Record<EtapaStatus, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-gray-100 text-gray-700 border-gray-300" },
  em_andamento: { label: "Em Andamento", className: "bg-blue-100 text-blue-700 border-blue-300" },
  submetida: { label: "Submetida", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  aprovada: { label: "Aprovada", className: "bg-green-100 text-green-700 border-green-300" },
  rejeitada: { label: "Rejeitada", className: "bg-red-100 text-red-700 border-red-300" },
};

interface EtapaStatusBadgeProps {
  status: EtapaStatus;
}

export function EtapaStatusBadge({ status }: EtapaStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
