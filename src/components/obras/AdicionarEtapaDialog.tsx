import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { useCreateEtapa, useManageEtapaResponsaveis } from "@/hooks/useEtapas";
import { useSaveEtapaItens } from "@/hooks/useEtapaItens";
import { useColaboradores } from "@/hooks/useColaboradores";

const etapaSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  descricao: z.string().optional(),
  prazo: z.string().optional(),
});

type EtapaFormData = z.infer<typeof etapaSchema>;

interface ItemLocal {
  descricao: string;
  linha_produto: string;
}

interface AdicionarEtapaDialogProps {
  obraId: string;
  trigger?: React.ReactNode;
}

export function AdicionarEtapaDialog({ obraId, trigger }: AdicionarEtapaDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedResponsaveis, setSelectedResponsaveis] = useState<string[]>([]);
  const [itens, setItens] = useState<ItemLocal[]>([]);
  const createEtapa = useCreateEtapa();
  const manageResponsaveis = useManageEtapaResponsaveis();
  const saveItens = useSaveEtapaItens();
  const { data: colaboradores } = useColaboradores();

  const form = useForm<EtapaFormData>({
    resolver: zodResolver(etapaSchema),
    defaultValues: {
      titulo: "",
      descricao: "",
      prazo: "",
    },
  });

  const toggleResponsavel = (id: string) => {
    setSelectedResponsaveis((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const addItem = () => {
    setItens((prev) => [...prev, { descricao: "", linha_produto: "" }]);
  };

  const removeItem = (index: number) => {
    setItens((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ItemLocal, value: string) => {
    setItens((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const onSubmit = async (data: EtapaFormData) => {
    try {
      const newEtapa = await createEtapa.mutateAsync({
        obra_id: obraId,
        titulo: data.titulo,
        descricao: data.descricao || null,
        prazo: data.prazo || null,
      });

      // Add responsáveis to the new etapa
      if (selectedResponsaveis.length > 0 && newEtapa?.id) {
        await manageResponsaveis.mutateAsync({
          etapaId: newEtapa.id,
          responsavelIds: selectedResponsaveis,
          obraId,
        });
      }

      // Save itens
      const validItens = itens.filter((item) => item.descricao.trim() !== "");
      if (validItens.length > 0 && newEtapa?.id) {
        await saveItens.mutateAsync({
          etapaId: newEtapa.id,
          itens: validItens,
        });
      }

      form.reset();
      setSelectedResponsaveis([]);
      setItens([]);
      setOpen(false);
    } catch (error) {
      console.error("Erro ao criar etapa:", error);
    }
  };

  const colaboradoresList = colaboradores?.filter((c) => c.role === "colaborador") || [];
  const isPending = createEtapa.isPending || manageResponsaveis.isPending || saveItens.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Etapa
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Nova Etapa</DialogTitle>
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

            {/* Itens / Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <FormLabel>Itens da Etapa</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar Item
                </Button>
              </div>
              {itens.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum item adicionado. Clique em "Adicionar Item" para criar um checklist.
                </p>
              ) : (
                <div className="space-y-2">
                  {itens.map((item, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 border rounded-md">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Descrição do item"
                          value={item.descricao}
                          onChange={(e) => updateItem(index, "descricao", e.target.value)}
                        />
                        <Input
                          placeholder="Linha de produto"
                          value={item.linha_produto}
                          onChange={(e) => updateItem(index, "linha_produto", e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-10 px-2 text-destructive hover:text-destructive"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
                          id={`add-resp-${colaborador.id}`}
                          checked={selectedResponsaveis.includes(colaborador.id)}
                          onCheckedChange={() => toggleResponsavel(colaborador.id)}
                        />
                        <label
                          htmlFor={`add-resp-${colaborador.id}`}
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

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
