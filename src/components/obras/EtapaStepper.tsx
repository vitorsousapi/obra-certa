import { Check, Clock, Send, X, Circle, Pencil, FileDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EtapaStatusBadge } from "./EtapaStatusBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type EtapaStatus = Database["public"]["Enums"]["etapa_status"];

interface Responsavel {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface EtapaWithResponsavel {
  id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  prazo: string | null;
  status: EtapaStatus;
  observacoes: string | null;
  obra_id?: string;
  responsavel_id?: string | null;
  responsavel: Responsavel | null;
  etapa_responsaveis?: Array<{
    responsavel: Responsavel;
  }>;
}

interface EtapaStepperProps {
  etapas: EtapaWithResponsavel[];
  onEtapaClick?: (etapa: EtapaWithResponsavel) => void;
  onEditClick?: (etapa: EtapaWithResponsavel) => void;
  onExportClick?: (etapa: EtapaWithResponsavel) => void;
  showEditButton?: boolean;
}

const statusIcons: Record<EtapaStatus, React.ReactNode> = {
  pendente: <Circle className="h-5 w-5 text-muted-foreground" />,
  em_andamento: <Clock className="h-5 w-5 text-blue-600 animate-pulse" />,
  submetida: <Send className="h-5 w-5 text-yellow-600" />,
  aprovada: <Check className="h-5 w-5 text-green-600" />,
  rejeitada: <X className="h-5 w-5 text-red-600" />,
};

const statusLineColors: Record<EtapaStatus, string> = {
  pendente: "bg-muted",
  em_andamento: "bg-blue-300",
  submetida: "bg-yellow-300",
  aprovada: "bg-green-500",
  rejeitada: "bg-red-300",
};

export function EtapaStepper({ etapas, onEtapaClick, onEditClick, onExportClick, showEditButton = false }: EtapaStepperProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get all responsáveis (from new table + legacy field)
  const getResponsaveis = (etapa: EtapaWithResponsavel): Responsavel[] => {
    const responsaveis: Responsavel[] = [];
    
    // Add from new junction table
    if (etapa.etapa_responsaveis && etapa.etapa_responsaveis.length > 0) {
      etapa.etapa_responsaveis.forEach((er) => {
        if (er.responsavel) {
          responsaveis.push(er.responsavel);
        }
      });
    }
    
    // Fallback to legacy single responsavel if no new responsáveis
    if (responsaveis.length === 0 && etapa.responsavel) {
      responsaveis.push(etapa.responsavel);
    }
    
    return responsaveis;
  };

  if (etapas.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma etapa cadastrada. Adicione etapas para acompanhar o progresso.
      </div>
    );
  }

  return (
    <div className="relative">
      {etapas.map((etapa, index) => {
        const isLast = index === etapas.length - 1;
        const responsaveis = getResponsaveis(etapa);
        
        return (
          <div key={etapa.id} className="relative flex gap-4">
            {/* Vertical Line */}
            {!isLast && (
              <div
                className={`absolute left-[18px] top-10 w-0.5 h-[calc(100%-16px)] ${statusLineColors[etapa.status]}`}
              />
            )}

            {/* Icon */}
            <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-background bg-background shadow-sm">
              {statusIcons[etapa.status]}
            </div>

            {/* Content */}
            <div
              className={`flex-1 pb-8 ${onEtapaClick ? "cursor-pointer hover:bg-muted/50 -ml-2 pl-2 pr-2 pt-0 pb-6 rounded-lg transition-colors" : ""}`}
              onClick={() => onEtapaClick?.(etapa)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground font-medium">
                      Etapa {etapa.ordem}
                    </span>
                    <EtapaStatusBadge status={etapa.status} />
                  </div>
                  <h4 className="font-medium mt-1">{etapa.titulo}</h4>
                  {etapa.descricao && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {etapa.descricao}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1">
                    {onExportClick && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExportClick(etapa);
                        }}
                        title="Exportar etapa como PDF"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {showEditButton && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditClick?.(etapa);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Editar
                      </Button>
                    )}
                  </div>
                  {etapa.prazo && (
                    <span className="text-xs text-muted-foreground">
                      Prazo: {format(new Date(etapa.prazo), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  )}
                  {responsaveis.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {responsaveis.length === 1 
                          ? responsaveis[0].full_name 
                          : `${responsaveis.length} responsáveis`}
                      </span>
                      <div className="flex -space-x-2">
                        {responsaveis.slice(0, 3).map((resp) => (
                          <Avatar key={resp.id} className="h-6 w-6 border-2 border-background">
                            <AvatarImage src={resp.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(resp.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {responsaveis.length > 3 && (
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                            +{responsaveis.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {etapa.observacoes && (
                <div className="mt-2 p-2 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Observações:</span> {etapa.observacoes}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
