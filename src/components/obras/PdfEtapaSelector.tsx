import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileDown, Check, X } from "lucide-react";
import { EtapaStatusBadge } from "./EtapaStatusBadge";
import type { EtapaWithResponsavel } from "./EtapaStepper";

interface PdfEtapaSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obraNome: string;
  etapas: EtapaWithResponsavel[];
  onGenerate: (selectedEtapaIds: string[]) => void;
}

export function PdfEtapaSelector({
  open,
  onOpenChange,
  obraNome,
  etapas,
  onGenerate,
}: PdfEtapaSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    etapas.map((e) => e.id)
  );

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(etapas.map((e) => e.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleGenerate = () => {
    onGenerate(selectedIds);
    onOpenChange(false);
  };

  // Reset selection when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSelectedIds(etapas.map((e) => e.id));
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar Etapas para o Relatório</DialogTitle>
          <p className="text-sm text-muted-foreground">{obraNome}</p>
        </DialogHeader>

        <div className="py-4 space-y-3 max-h-[400px] overflow-y-auto">
          {etapas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma etapa cadastrada.
            </p>
          ) : (
            etapas.map((etapa) => (
              <div
                key={etapa.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleToggle(etapa.id)}
              >
                <Checkbox
                  checked={selectedIds.includes(etapa.id)}
                  onCheckedChange={() => handleToggle(etapa.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      Etapa {etapa.ordem}
                    </span>
                    <EtapaStatusBadge status={etapa.status} />
                  </div>
                  <p className="font-medium truncate">{etapa.titulo}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2 justify-center border-t pt-4">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            <Check className="h-4 w-4 mr-1" />
            Selecionar Todas
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeselectAll}>
            <X className="h-4 w-4 mr-1" />
            Desmarcar Todas
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={selectedIds.length === 0}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Gerar PDF ({selectedIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
