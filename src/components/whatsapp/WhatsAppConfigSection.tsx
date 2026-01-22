import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { useWhatsAppConfig, useSaveWhatsAppConfig, useTestWhatsAppConnection } from "@/hooks/useWhatsAppConfig";

export function WhatsAppConfigSection() {
  const { data: config, isLoading } = useWhatsAppConfig();
  const saveConfig = useSaveWhatsAppConfig();
  const testConnection = useTestWhatsAppConnection();

  const [instanceName, setInstanceName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (config) {
      setInstanceName(config.instance_name);
      setApiUrl(config.api_url);
      setApiKey(config.api_key);
    }
  }, [config]);

  const handleSave = async () => {
    await saveConfig.mutateAsync({
      instance_name: instanceName,
      api_url: apiUrl.replace(/\/$/, ""), // Remove trailing slash
      api_key: apiKey,
    });
  };

  const handleTest = async () => {
    await testConnection.mutateAsync({
      instance_name: instanceName,
      api_url: apiUrl.replace(/\/$/, ""),
      api_key: apiKey,
    });
  };

  const hasChanges =
    instanceName !== (config?.instance_name || "") ||
    apiUrl !== (config?.api_url || "") ||
    apiKey !== (config?.api_key || "");

  const isFormValid = instanceName.trim() && apiUrl.trim() && apiKey.trim();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp (Evolution API)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <CardTitle>WhatsApp (Evolution API)</CardTitle>
          </div>
          {config && (
            <Badge variant={config.connected ? "default" : "secondary"} className="gap-1">
              {config.connected ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Conectado
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3" />
                  Desconectado
                </>
              )}
            </Badge>
          )}
        </div>
        <CardDescription>
          Configure a integração com WhatsApp via Evolution API para enviar links de assinatura e resumos de etapas para os clientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiUrl">URL da API</Label>
            <Input
              id="apiUrl"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://sua-instancia-evolution.com"
            />
            <p className="text-xs text-muted-foreground">
              URL base da sua instância da Evolution API
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instanceName">Nome da Instância</Label>
            <Input
              id="instanceName"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="minha-instancia"
            />
            <p className="text-xs text-muted-foreground">
              Nome da instância criada na Evolution API
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Sua chave de API"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Chave de autenticação da Evolution API
            </p>
          </div>
        </div>

        <Separator />

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={!isFormValid || testConnection.isPending}
          >
            {testConnection.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Testar Conexão
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isFormValid || !hasChanges || saveConfig.isPending}
          >
            {saveConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Configurações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
