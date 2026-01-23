import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageCircle, Send, FileSignature, Loader2, WifiOff } from "lucide-react";
import { useSendSignatureLink } from "@/hooks/useSendSignatureLink";
import { useSendEtapaSummary } from "@/hooks/useSendEtapaSummary";
import { useWhatsAppConfig } from "@/hooks/useWhatsAppConfig";

interface EtapaWhatsAppActionsProps {
  etapaId: string;
  etapaTitulo: string;
  clienteNome: string;
  clienteTelefone: string | null;
  isAprovada: boolean;
  variant?: "button" | "dropdown";
}

type ActionType = "signature" | "summary" | null;

export function EtapaWhatsAppActions({
  etapaId,
  etapaTitulo,
  clienteNome,
  clienteTelefone,
  isAprovada,
  variant = "button",
}: EtapaWhatsAppActionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [phone, setPhone] = useState(clienteTelefone || "");

  const { data: whatsappConfig } = useWhatsAppConfig();
  const sendSignatureLink = useSendSignatureLink();
  const sendEtapaSummary = useSendEtapaSummary();

  const isConfigured = !!whatsappConfig?.api_url;
  const isConnected = whatsappConfig?.connected ?? false;

  const openDialog = (type: ActionType) => {
    setActionType(type);
    setPhone(clienteTelefone || "");
    setDialogOpen(true);
  };

  const handleSend = async () => {
    if (!phone.trim()) return;

    if (actionType === "signature") {
      await sendSignatureLink.mutateAsync({ etapaId, phone });
    } else if (actionType === "summary") {
      await sendEtapaSummary.mutateAsync({ etapaId, phone });
    }

    setDialogOpen(false);
    setActionType(null);
  };

  const isPending = sendSignatureLink.isPending || sendEtapaSummary.isPending;

  if (!isAprovada) {
    return null;
  }

  if (!isConfigured) {
    return null;
  }

  if (variant === "dropdown") {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className={`gap-1 ${!isConnected ? "opacity-70" : ""}`}
            >
              {!isConnected ? (
                <WifiOff className="h-4 w-4 text-destructive" />
              ) : (
                <MessageCircle className="h-4 w-4" />
              )}
              WhatsApp
              {!isConnected && <span className="text-xs text-destructive ml-1">(offline)</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isConnected && (
              <div className="px-2 py-1.5 text-xs text-destructive bg-destructive/10 rounded mb-1">
                WhatsApp desconectado
              </div>
            )}
            <DropdownMenuItem onClick={() => openDialog("signature")}>
              <FileSignature className="h-4 w-4 mr-2" />
              Enviar Link de Assinatura
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDialog("summary")}>
              <Send className="h-4 w-4 mr-2" />
              Enviar Resumo da Etapa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "signature" ? "Enviar Link de Assinatura" : "Enviar Resumo da Etapa"}
              </DialogTitle>
              <DialogDescription>
                {actionType === "signature"
                  ? `Envie um link para ${clienteNome} assinar e confirmar o recebimento da etapa "${etapaTitulo}".`
                  : `Envie um resumo da etapa "${etapaTitulo}" para ${clienteNome}.`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {!isConnected && (
                <Alert variant="destructive">
                  <WifiOff className="h-4 w-4" />
                  <AlertDescription>
                    WhatsApp desconectado. A mensagem será enviada quando a conexão for restabelecida.
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone do Cliente</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
                <p className="text-xs text-muted-foreground">
                  Número com DDD. Formato: (11) 99999-9999
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSend} disabled={!phone.trim() || isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <MessageCircle className="h-4 w-4 mr-2" />
                Enviar via WhatsApp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className="flex gap-2 items-center">
        {!isConnected && (
          <span className="text-xs text-destructive flex items-center gap-1">
            <WifiOff className="h-3 w-3" />
            Offline
          </span>
        )}
        <Button variant="outline" size="sm" onClick={() => openDialog("signature")}>
          <FileSignature className="h-4 w-4 mr-1" />
          Link de Assinatura
        </Button>
        <Button variant="outline" size="sm" onClick={() => openDialog("summary")}>
          <Send className="h-4 w-4 mr-1" />
          Enviar Resumo
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "signature" ? "Enviar Link de Assinatura" : "Enviar Resumo da Etapa"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "signature"
                ? `Envie um link para ${clienteNome} assinar e confirmar o recebimento da etapa "${etapaTitulo}".`
                : `Envie um resumo da etapa "${etapaTitulo}" para ${clienteNome}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!isConnected && (
              <Alert variant="destructive">
                <WifiOff className="h-4 w-4" />
                <AlertDescription>
                  WhatsApp desconectado. A mensagem será enviada quando a conexão for restabelecida.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone do Cliente</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
              <p className="text-xs text-muted-foreground">
                Número com DDD. Formato: (11) 99999-9999
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSend} disabled={!phone.trim() || isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <MessageCircle className="h-4 w-4 mr-2" />
              Enviar via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
