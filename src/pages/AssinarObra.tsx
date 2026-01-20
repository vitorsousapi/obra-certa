import { useState } from "react";
import { useParams } from "react-router-dom";
import { useObraByToken, useSignObra } from "@/hooks/useSignObra";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, FileCheck, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function AssinarObra() {
  const { token } = useParams<{ token: string }>();
  const { data: obra, isLoading } = useObraByToken(token);
  const { mutate: signObra, isPending, isSuccess } = useSignObra();
  const [nome, setNome] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !nome.trim()) return;
    signObra({ token, nome: nome.trim() });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!obra) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">Link inválido</h1>
              <p className="text-muted-foreground">
                Este link de assinatura não é válido ou já expirou.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (obra.assinatura_data || isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Recebimento Confirmado!</h1>
              <p className="text-muted-foreground">
                A confirmação de recebimento da obra foi registrada com sucesso.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const etapasAprovadas = obra.etapas?.filter((e) => e.status === "aprovada") || [];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <FileCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Confirmação de Recebimento</CardTitle>
          <CardDescription>
            Por favor, confirme o recebimento da obra abaixo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Obra Info */}
          <div className="space-y-3 bg-muted/50 rounded-lg p-4">
            <div>
              <p className="text-sm text-muted-foreground">Obra</p>
              <p className="font-semibold text-lg">{obra.nome}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-medium">{obra.cliente_nome}</p>
            </div>
            {etapasAprovadas.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Etapas concluídas ({etapasAprovadas.length})
                </p>
                <ul className="space-y-1">
                  {etapasAprovadas.map((etapa) => (
                    <li key={etapa.id} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      {etapa.titulo}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Separator />

          {/* Terms */}
          <p className="text-sm text-muted-foreground">
            Ao assinar, você confirma o recebimento satisfatório desta obra 
            conforme as etapas descritas acima.
          </p>

          {/* Signature Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                placeholder="Digite seu nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={isPending || !nome.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assinando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Assinar e Confirmar Recebimento
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
