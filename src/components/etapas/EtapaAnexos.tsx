import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, X, Image, FileText, File, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface Anexo {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  url: string;
}

interface EtapaAnexosProps {
  etapaId: string;
  readOnly?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(tipo: string) {
  if (tipo.startsWith("image/")) return <Image className="h-4 w-4" />;
  if (tipo.includes("pdf")) return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
}

export function EtapaAnexos({ etapaId, readOnly = false }: EtapaAnexosProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<Anexo | null>(null);

  const { data: anexos, isLoading } = useQuery({
    queryKey: ["etapa-anexos", etapaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("etapa_anexos")
        .select("id, nome, tipo, tamanho, url")
        .eq("etapa_id", etapaId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Anexo[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!profile?.id) throw new Error("Perfil não encontrado");

      const fileExt = file.name.split(".").pop();
      const fileName = `${etapaId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("etapa-anexos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("etapa-anexos")
        .getPublicUrl(fileName);

      // Save metadata
      const { error: dbError } = await supabase.from("etapa_anexos").insert({
        etapa_id: etapaId,
        nome: file.name,
        tipo: file.type,
        tamanho: file.size,
        url: urlData.publicUrl,
        storage_path: fileName,
        uploaded_by: profile.id,
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapa-anexos", etapaId] });
      toast({
        title: "Arquivo enviado",
        description: "O anexo foi adicionado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (anexoId: string) => {
      const { error } = await supabase
        .from("etapa_anexos")
        .delete()
        .eq("id", anexoId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapa-anexos", etapaId] });
      toast({
        title: "Anexo removido",
        description: "O arquivo foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede o limite de 10MB.`,
          variant: "destructive",
        });
        continue;
      }
      await uploadMutation.mutateAsync(file);
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAnexoClick = (anexo: Anexo, e: React.MouseEvent) => {
    // If it's an image, open in popup
    if (anexo.tipo.startsWith("image/")) {
      e.preventDefault();
      setPreviewImage(anexo);
    }
    // Otherwise, let the default link behavior open in new tab
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Anexos</h4>
        {!readOnly && (
          <div>
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4 mr-1" />
              )}
              {isUploading ? "Enviando..." : "Adicionar"}
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando anexos...</div>
      ) : anexos?.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Nenhum anexo adicionado.
        </div>
      ) : (
        <div className="space-y-2">
          {anexos?.map((anexo) => (
            <div
              key={anexo.id}
              className="flex items-center justify-between p-2 bg-muted rounded-md"
            >
              <a
                href={anexo.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => handleAnexoClick(anexo, e)}
                className="flex items-center gap-2 flex-1 min-w-0 hover:underline cursor-pointer"
              >
                {getFileIcon(anexo.tipo)}
                <span className="text-sm truncate">{anexo.nome}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  ({formatFileSize(anexo.tamanho)})
                </span>
              </a>
              {!readOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => deleteMutation.mutate(anexo.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl w-full p-2">
          {previewImage && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-2 pt-2">
                <span className="text-sm font-medium truncate">{previewImage.nome}</span>
              </div>
              <div className="flex items-center justify-center bg-muted rounded-md overflow-hidden">
                <img
                  src={previewImage.url}
                  alt={previewImage.nome}
                  className="max-h-[80vh] max-w-full object-contain"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
