import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Convert image to base64 with proper validation
async function imageToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to fetch image:", response.status);
      return null;
    }
    const blob = await response.blob();
    
    // Validate blob
    if (blob.size === 0) {
      console.error("Empty blob received");
      return null;
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Validate that we got a proper data URL
        if (result && result.startsWith("data:image/")) {
          console.log("Successfully converted image, size:", result.length);
          resolve(result);
        } else {
          console.error("Invalid data URL format");
          resolve(null);
        }
      };
      reader.onerror = () => {
        console.error("FileReader error:", reader.error);
        reject(reader.error);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image to base64:", error);
    return null;
  }
}

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obraId: string;
  obraNome: string;
}

export function PdfPreviewDialog({
  open,
  onOpenChange,
  obraId,
  obraNome,
}: PdfPreviewDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("relatorio.pdf");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadPreview = async () => {
    setIsLoading(true);
    setPdfData(null);
    setError(null);

    try {
      // Get logo as base64 - but don't fail if it doesn't work
      let logoBase64: string | null = null;
      try {
        const logoUrl = `${window.location.origin}/images/logo-tavitrum.png`;
        logoBase64 = await imageToBase64(logoUrl);
      } catch (e) {
        console.warn("Could not load logo:", e);
      }

      console.log("Calling generate-pdf with obraId:", obraId);
      const { data, error: invokeError } = await supabase.functions.invoke("generate-pdf", {
        body: { obraId, logoUrl: logoBase64 },
      });

      console.log("Response from generate-pdf:", { data: !!data, error: invokeError });

      if (invokeError) {
        console.error("Edge function error:", invokeError);
        throw new Error("Erro ao gerar PDF");
      }

      if (!data?.pdf) {
        throw new Error("PDF não foi gerado");
      }

      setPdfData(data.pdf);
      setFilename(data.filename || "relatorio.pdf");
    } catch (err: any) {
      console.error("Error loading PDF:", err);
      setError(err.message || "Erro desconhecido");
      toast({
        title: "Erro ao carregar pré-visualização",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfData) return;

    const link = document.createElement("a");
    link.href = pdfData;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "PDF baixado com sucesso",
      description: "O download do relatório foi concluído.",
    });

    onOpenChange(false);
  };

  const handleRetry = () => {
    loadPreview();
  };

  // Load preview when dialog opens
  React.useEffect(() => {
    if (open && !pdfData && !isLoading) {
      loadPreview();
    }
    if (!open) {
      setPdfData(null);
      setError(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Pré-visualização do Relatório</DialogTitle>
          <p className="text-sm text-muted-foreground">{obraNome}</p>
        </DialogHeader>

        <div className="flex-1 min-h-0 p-6 pt-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full bg-muted/30 rounded-lg">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Gerando relatório...</p>
            </div>
          ) : pdfData ? (
            <iframe
              src={pdfData}
              className="w-full h-full rounded-lg border"
              title="PDF Preview"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-muted/30 rounded-lg gap-4">
              <p className="text-muted-foreground">
                {error || "Não foi possível carregar o PDF"}
              </p>
              <Button variant="outline" onClick={handleRetry}>
                Tentar novamente
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-0 gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
          <Button onClick={handleDownload} disabled={!pdfData || isLoading}>
            <Download className="h-4 w-4 mr-2" />
            Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
