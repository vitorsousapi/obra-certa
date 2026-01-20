import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useObra, useCreateObra, useUpdateObra } from "@/hooks/useObras";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

const obraSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cliente_nome: z.string().min(1, "Nome do cliente é obrigatório"),
  cliente_email: z.string().email("Email inválido"),
  data_inicio: z.string().min(1, "Data de início é obrigatória"),
  data_prevista: z.string().min(1, "Data prevista é obrigatória"),
  status: z.enum(["nao_iniciada", "em_andamento", "aguardando_aprovacao", "concluida", "cancelada"]).default("nao_iniciada"),
});

type ObraFormData = z.infer<typeof obraSchema>;

export default function ObraForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = !!id;

  const { data: obra, isLoading } = useObra(id);
  const createObra = useCreateObra();
  const updateObra = useUpdateObra();

  const form = useForm<ObraFormData>({
    resolver: zodResolver(obraSchema),
    defaultValues: {
      nome: "",
      cliente_nome: "",
      cliente_email: "",
      data_inicio: new Date().toISOString().split("T")[0],
      data_prevista: "",
      status: "nao_iniciada",
    },
  });

  // Load obra data when editing
  useEffect(() => {
    if (obra) {
      form.reset({
        nome: obra.nome,
        cliente_nome: obra.cliente_nome,
        cliente_email: obra.cliente_email,
        data_inicio: obra.data_inicio,
        data_prevista: obra.data_prevista,
        status: obra.status,
      });
    }
  }, [obra, form]);

  const onSubmit = async (data: ObraFormData) => {
    try {
      if (isEditing && id) {
        await updateObra.mutateAsync({ id, ...data });
        navigate(`/obras/${id}`);
      } else {
        const newObra = await createObra.mutateAsync({
          nome: data.nome,
          cliente_nome: data.cliente_nome,
          cliente_email: data.cliente_email,
          data_inicio: data.data_inicio,
          data_prevista: data.data_prevista,
          status: data.status || "nao_iniciada",
        });
        if (newObra?.id) {
          navigate(`/obras/${newObra.id}`);
        }
      }
    } catch (error) {
      // Error is already handled by the mutation's onError
      console.error("Erro ao salvar obra:", error);
    }
  };

  // Show validation errors as toast
  const onError = (errors: any) => {
    console.error("Erros de validação:", errors);
    const errorMessages = Object.values(errors)
      .map((error: any) => error.message)
      .filter(Boolean)
      .join(", ");
    
    if (errorMessages) {
      toast({
        title: "Preencha os campos obrigatórios",
        description: errorMessages,
        variant: "destructive",
      });
    }
  };

  if (isEditing && isLoading) {
    return (
      <AdminLayout title="Carregando...">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={isEditing ? "Editar Obra" : "Nova Obra"}>
      <div className="max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Editar Obra" : "Nova Obra"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Obra *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Residência Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cliente_nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Cliente *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: João Silva" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cliente_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email do Cliente *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="cliente@email.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="data_inicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Início *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="data_prevista"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Prevista *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {isEditing ? (
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="nao_iniciada">Não Iniciada</SelectItem>
                            <SelectItem value="em_andamento">Em Andamento</SelectItem>
                            <SelectItem value="aguardando_aprovacao">Aguardando Aprovação</SelectItem>
                            <SelectItem value="concluida">Concluída</SelectItem>
                            <SelectItem value="cancelada">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <input type="hidden" {...form.register("status")} value="nao_iniciada" />
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createObra.isPending || updateObra.isPending}
                  >
                    {createObra.isPending || updateObra.isPending
                      ? "Salvando..."
                      : isEditing
                      ? "Salvar Alterações"
                      : "Criar Obra"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
