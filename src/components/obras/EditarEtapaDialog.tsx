import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Loader2 } from "lucide-react";
import { useUpdateEtapa, useDeleteEtapa, useManageEtapaResponsaveis } from "@/hooks/useEtapas";
import { useColaboradores } from "@/hooks/useColaboradores";
import type { Database } from "@/integrations/supabase/types";

type EtapaStatus = Database["public"]["Enums"]["etapa_status"];

const etapaSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  descricao: z.string().optional(),
  prazo: z.string().optional(),
  status: z.enum(["pendente", "em_andamento", "submetida", "aprovada", "rejeitada"]),
  observacoes: z.string().optional(),
});

type EtapaFormData = z.infer<typeof etapaSchema>;

interface Responsavel {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface EtapaWithResponsavel {
  id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  prazo: string | null;
  status: EtapaStatus;
  observacoes: string | null;
  obra_id?: string;
  responsavel: Responsavel | null;
  responsavel_id?: string | null;
  etapa_responsaveis?: Array<{
    responsavel: Responsavel;
  }>;
}

interface EditarEtapaDialogProps {
  etapa: EtapaWithResponsavel | null;
  obraId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabels: Record<EtapaStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  submetida: "Submetida",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
};

export function EditarEtapaDialog({ etapa, obraId, open, onOpenChange }: EditarEtapaDialogProps) {
  const updateEtapa = useUpdateEtapa();
  const deleteEtapa = useDeleteEtapa();
  const manageResponsaveis = useManageEtapaResponsaveis();
  const { data: colaboradores } = useColaboradores();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedResponsaveis, setSelectedResponsaveis] = useState<string[]>([]);

  const form = useForm<EtapaFormData>({
    resolver: zodResolver(etapaSchema),
    defaultValues: {
      titulo: "",
      descricao: "",
      prazo: "",
      status: "pendente",
      observacoes: "",
    },
  });

  useEffect(() => {
    if (etapa && open) {
      form.reset({
        titulo: etapa.titulo,
        descricao: etapa.descricao || "",
        prazo: etapa.prazo || "",
        status: etapa.status,
        observacoes: etapa.observacoes || "",
      });
      
      // Set selected responsáveis from junction table
      const responsavelIds: string[] = [];
      if (etapa.etapa_responsaveis && etapa.etapa_responsaveis.length > 0) {
        etapa.etapa_responsaveis.forEach((er) => {
          if (er.responsavel) {
            responsavelIds.push(er.responsavel.id);
          }
        });
      } else if (etapa.responsavel) {
        // Fallback to legacy single responsavel
        responsavelIds.push(etapa.responsavel.id);
      }
      setSelectedResponsaveis(responsavelIds);
    }
  }, [etapa, open, form]);

  const toggleResponsavel = (id: string) => {
    setSelectedResponsaveis((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const onSubmit = async (data: EtapaFormData) => {
    if (!etapa) return;
    
    try {
      // Update etapa basic info
      await updateEtapa.mutateAsync({
        id: etapa.id,
        titulo: data.titulo,
        descricao: data.descricao || null,
        prazo: data.prazo || null,
        status: data.status,
        observacoes: data.observacoes || null,
      });

      // Update responsáveis
      await manageResponsaveis.mutateAsync({
        etapaId: etapa.id,
        responsavelIds: selectedResponsaveis,
        obraId,
      });

      onOpenChange(false);
    } catch (error) {
      // Error is already handled by the mutation's onError
      console.error("Erro ao atualizar etapa:", error);
    }
  };

  const handleDelete = async () => {
    if (!etapa) return;
    
    await deleteEtapa.mutateAsync({ id: etapa.id, obraId });
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  const colaboradoresList = colaboradores?.filter((c) => c.role === "colaborador") || [];

  if (!etapa) return null;

  const isPending = updateEtapa.isPending || manageResponsaveis.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Etapa</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Preparação do terreno" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o que deve ser feito nesta etapa..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="prazo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(statusLabels) as EtapaStatus[]).map((status) => (
                          <SelectItem key={status} value={status}>
                            {statusLabels[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormLabel>Responsáveis</FormLabel>
              <p className="text-xs text-muted-foreground mb-2">
                Selecione um ou mais colaboradores
              </p>
              <ScrollArea className="h-32 border rounded-md p-2">
                {colaboradoresList.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum colaborador disponível
                  </p>
                ) : (
                  <div className="space-y-2">
                    {colaboradoresList.map((colaborador) => (
                      <div
                        key={colaborador.id}
                        className="flex items-center space-x-2 p-1 rounded hover:bg-muted"
                      >
                        <Checkbox
                          id={`resp-${colaborador.id}`}
                          checked={selectedResponsaveis.includes(colaborador.id)}
                          onCheckedChange={() => toggleResponsavel(colaborador.id)}
                        />
                        <label
                          htmlFor={`resp-${colaborador.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {colaborador.full_name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              {selectedResponsaveis.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedResponsaveis.length} selecionado(s)
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre a etapa..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between pt-4">
              <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir etapa?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. A etapa "{etapa.titulo}" será removida permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteEtapa.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Excluir"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
