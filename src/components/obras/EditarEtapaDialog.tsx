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
import { Trash2, Loader2 } from "lucide-react";
import { useUpdateEtapa, useDeleteEtapa } from "@/hooks/useEtapas";
import { useColaboradores } from "@/hooks/useColaboradores";
import type { Database } from "@/integrations/supabase/types";

type EtapaStatus = Database["public"]["Enums"]["etapa_status"];

const etapaSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  descricao: z.string().optional(),
  prazo: z.string().optional(),
  responsavel_id: z.string().optional(),
  status: z.enum(["pendente", "em_andamento", "submetida", "aprovada", "rejeitada"]),
  observacoes: z.string().optional(),
});

type EtapaFormData = z.infer<typeof etapaSchema>;

interface EtapaWithResponsavel {
  id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  prazo: string | null;
  status: EtapaStatus;
  observacoes: string | null;
  obra_id?: string;
  responsavel: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  responsavel_id?: string | null;
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
  const { data: colaboradores } = useColaboradores();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const form = useForm<EtapaFormData>({
    resolver: zodResolver(etapaSchema),
    defaultValues: {
      titulo: "",
      descricao: "",
      prazo: "",
      responsavel_id: "",
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
        responsavel_id: etapa.responsavel?.id || etapa.responsavel_id || "",
        status: etapa.status,
        observacoes: etapa.observacoes || "",
      });
    }
  }, [etapa, open, form]);

  const onSubmit = async (data: EtapaFormData) => {
    if (!etapa) return;
    
    await updateEtapa.mutateAsync({
      id: etapa.id,
      titulo: data.titulo,
      descricao: data.descricao || null,
      prazo: data.prazo || null,
      responsavel_id: data.responsavel_id || null,
      status: data.status,
      observacoes: data.observacoes || null,
    });
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!etapa) return;
    
    await deleteEtapa.mutateAsync({ id: etapa.id, obraId });
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  if (!etapa) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Etapa</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <FormField
              control={form.control}
              name="responsavel_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um colaborador" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {colaboradores
                        ?.filter((c) => c.role === "colaborador")
                        .map((colaborador) => (
                          <SelectItem key={colaborador.id} value={colaborador.id}>
                            {colaborador.full_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                <Button type="submit" disabled={updateEtapa.isPending}>
                  {updateEtapa.isPending ? (
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
