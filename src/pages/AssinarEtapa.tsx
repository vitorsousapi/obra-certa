import { useState, useRef } from "react";
import { useParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { useEtapaAssinaturaByToken } from "@/hooks/useEtapaAssinaturas";
import { useSignEtapa } from "@/hooks/useSignEtapa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Eraser, FileSignature, Loader2, Building2, ClipboardList } from "lucide-react";

export default function AssinarEtapa() {
  const { token } = useParams<{ token: string }>();
  const { data: assinatura, isLoading } = useEtapaAssinaturaByToken(token);
  const { mutateAsync: signEtapa, isPending } = useSignEtapa();
  
  const sigCanvasRef = useRef<SignatureCanvas | null>(null);
  const [nome, setNome] = useState("");
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
    }
    setIsEmpty(true);
  };

  const handleEnd = () => {
    if (sigCanvasRef.current) {
      setIsEmpty(sigCanvasRef.current.isEmpty());
    }
  };

  const handleConfirm = async () => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty() || !nome.trim() || !token) {
      return;
    }

    const canvas = sigCanvasRef.current.getCanvas();
    const dataUrl = canvas.toDataURL("image/png");
    
    await signEtapa({
      token,
      signatureDataUrl: dataUrl,
      nome: nome.trim(),
    });
  };

  const isValid = !isEmpty && nome.trim().length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!assinatura) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileSignature className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Link inválido ou expirado</h2>
              <p className="text-muted-foreground">
                Este link de assinatura não existe ou já foi utilizado.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If already signed
  if (assinatura.assinatura_data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Etapa já assinada!</h2>
              <p className="text-muted-foreground mb-4">
                Esta etapa já foi assinada por <strong>{assinatura.assinatura_nome}</strong> em{" "}
                {new Date(assinatura.assinatura_data).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {assinatura.assinatura_imagem_url && (
                <div className="bg-white rounded-md p-4 border inline-block">
                  <img
                    src={assinatura.assinatura_imagem_url}
                    alt="Assinatura"
                    className="h-20 max-w-[250px] object-contain"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const etapa = assinatura.etapa as any;
  const obra = etapa?.obra as { id: string; nome: string; cliente_nome: string };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <FileSignature className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Confirmar Recebimento</CardTitle>
          <CardDescription>
            Por favor, assine abaixo para confirmar o recebimento da etapa
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Obra and Etapa Info */}
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Obra:</span>
              <span className="font-medium">{obra?.nome}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Etapa {etapa?.ordem}:</span>
              <span className="font-medium">{etapa?.titulo}</span>
            </div>
            {etapa?.descricao && (
              <p className="text-sm text-muted-foreground mt-2">
                {etapa.descricao}
              </p>
            )}
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="nome">Seu nome completo</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite seu nome completo"
            />
          </div>

          {/* Signature Pad */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Sua assinatura</Label>
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
                ref={(ref) => { sigCanvasRef.current = ref; }}
                penColor="black"
                canvasProps={{
                  className: "w-full h-48",
                  style: { width: "100%", height: "192px" },
                }}
                onEnd={handleEnd}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use o dedo ou mouse para desenhar sua assinatura
            </p>
          </div>

          {/* Submit Button */}
          <Button
            className="w-full"
            size="lg"
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
        </CardContent>
      </Card>
    </div>
  );
}
