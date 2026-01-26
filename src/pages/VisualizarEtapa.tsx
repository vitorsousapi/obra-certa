import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Building2, FileText, Image, PenLine, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";

interface EtapaAnexo {
  id: string;
  nome: string;
  url: string;
  tipo: string;
}

interface EtapaPublicData {
  assinatura: {
    id: string;
    assinatura_data: string | null;
    assinatura_nome: string | null;
  };
  etapa: {
    id: string;
    titulo: string;
    descricao: string | null;
    ordem: number;
  };
  obra: {
    nome: string;
    cliente_nome: string;
  };
  anexos: EtapaAnexo[];
}

export default function VisualizarEtapa() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["etapa-public", token],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<EtapaPublicData>("get-etapa-by-token", {
        body: { token }
      });
      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  const imageAnexos = data?.anexos?.filter((a) => a.tipo.startsWith("image/")) || [];

  const handlePrevImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  const handleNextImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex < imageAnexos.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <Skeleton className="h-12 w-32 mx-auto mb-4" />
            <Skeleton className="h-8 w-48 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-destructive">Link Inválido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Este link de visualização não é válido ou expirou.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { etapa, obra } = data;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <img
            src="/images/logo-tavitrum.png"
            alt="Tavitrum"
            className="h-12 mx-auto"
          />
          <h1 className="text-2xl font-bold text-foreground">
            Relatório da Etapa
          </h1>
          <p className="text-muted-foreground">
            Visualize os detalhes e fotos desta etapa
          </p>
        </div>

        {/* Obra Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Obra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="font-medium text-foreground">{obra?.nome}</p>
              <p className="text-sm text-muted-foreground">
                Cliente: {obra?.cliente_nome}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Etapa Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Etapa {etapa?.ordem}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium text-foreground">{etapa?.titulo}</p>
              {etapa?.descricao && (
                <p className="text-sm text-muted-foreground">{etapa.descricao}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Photos Gallery */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Image className="h-5 w-5 text-primary" />
              Fotos ({imageAnexos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {imageAnexos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma foto anexada a esta etapa.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {imageAnexos.map((anexo, index) => (
                  <button
                    key={anexo.id}
                    onClick={() => setSelectedImageIndex(index)}
                    className="aspect-square rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <img
                      src={anexo.url}
                      alt={anexo.nome}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="pt-4">
          <Button
            onClick={() => navigate(`/assinar/${token}`)}
            size="lg"
            className="w-full"
          >
            <PenLine className="h-5 w-5 mr-2" />
            Ir para Assinatura
          </Button>
        </div>
      </div>

      {/* Image Lightbox Dialog */}
      <Dialog
        open={selectedImageIndex !== null}
        onOpenChange={(open) => !open && setSelectedImageIndex(null)}
      >
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div className="relative">
            <button
              onClick={() => setSelectedImageIndex(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {selectedImageIndex !== null && imageAnexos[selectedImageIndex] && (
              <div className="flex items-center justify-center min-h-[60vh] p-4">
                <img
                  src={imageAnexos[selectedImageIndex].url}
                  alt={imageAnexos[selectedImageIndex].nome}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              </div>
            )}

            {/* Navigation */}
            {imageAnexos.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  disabled={selectedImageIndex === 0}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={handleNextImage}
                  disabled={selectedImageIndex === imageAnexos.length - 1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Counter */}
            {selectedImageIndex !== null && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-sm">
                {selectedImageIndex + 1} / {imageAnexos.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
