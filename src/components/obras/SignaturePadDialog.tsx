import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eraser, Loader2, FileSignature } from "lucide-react";

interface SignaturePadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obraName: string;
  clienteName: string;
  onConfirm: (signatureDataUrl: string, nome: string) => Promise<void>;
  isPending?: boolean;
}

export function SignaturePadDialog({
  open,
  onOpenChange,
  obraName,
  clienteName,
  onConfirm,
  isPending = false,
}: SignaturePadDialogProps) {
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const [nome, setNome] = useState(clienteName);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigCanvasRef.current?.clear();
    setIsEmpty(true);
  };

  const handleEnd = () => {
    setIsEmpty(sigCanvasRef.current?.isEmpty() ?? true);
  };

  const handleConfirm = async () => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty() || !nome.trim()) {
      return;
    }

    const dataUrl = sigCanvasRef.current.getTrimmedCanvas().toDataURL("image/png");
    await onConfirm(dataUrl, nome.trim());
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleClear();
      setNome(clienteName);
    }
    onOpenChange(newOpen);
  };

  const isValid = !isEmpty && nome.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Assinatura do Cliente
          </DialogTitle>
          <DialogDescription>
            Obra: <strong>{obraName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo do cliente</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite o nome completo"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Assinatura</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-8"
              >
                <Eraser className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            </div>
            <div className="border rounded-md bg-white overflow-hidden touch-none">
              <SignatureCanvas
                ref={sigCanvasRef}
                penColor="black"
                canvasProps={{
                  className: "w-full h-48",
                  style: { width: "100%", height: "192px" },
                }}
                onEnd={handleEnd}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use o mouse ou toque na tela para assinar
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid || isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileSignature className="h-4 w-4 mr-2" />
            )}
            Confirmar Assinatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
