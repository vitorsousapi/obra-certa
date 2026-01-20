import { Progress } from "@/components/ui/progress";
import type { Database } from "@/integrations/supabase/types";

type EtapaStatus = Database["public"]["Enums"]["etapa_status"];

interface ObraProgressBarProps {
  etapas?: { id: string; status: EtapaStatus }[];
  showLabel?: boolean;
}

export function ObraProgressBar({ etapas = [], showLabel = true }: ObraProgressBarProps) {
  const total = etapas.length;
  const approved = etapas.filter((e) => e.status === "aprovada").length;
  const progress = total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <Progress value={progress} className="flex-1 h-2" />
      {showLabel && (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {approved}/{total} ({progress}%)
        </span>
      )}
    </div>
  );
}
