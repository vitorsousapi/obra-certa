import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isWithinInterval, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Building2, ExternalLink, User, CalendarDays } from "lucide-react";
import { ObraStatusBadge } from "@/components/obras/ObraStatusBadge";
import { EtapaStatusBadge } from "@/components/obras/EtapaStatusBadge";

function useObrasCalendario() {
  return useQuery({
    queryKey: ["obras", "calendario"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras")
        .select(`
          *,
          etapas(
            id, titulo, status, ordem, prazo, data_inicio,
            responsavel:profiles!etapas_responsavel_id_fkey(id, full_name),
            etapa_responsaveis(
              responsavel:profiles!etapa_responsaveis_responsavel_id_fkey(id, full_name)
            )
          )
        `)
        .in("status", ["em_andamento", "aguardando_aprovacao", "nao_iniciada"])
        .order("data_inicio", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export default function Calendario() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const { data: obras, isLoading } = useObrasCalendario();

  // Build a set of dates that have obras
  const obrasModifiers = useMemo(() => {
    if (!obras) return { hasObra: [] as Date[] };
    const dates = new Set<string>();
    obras.forEach((obra) => {
      const start = parseISO(obra.data_inicio);
      const end = parseISO(obra.data_prevista);
      // Add all dates between start and end (max 365 days to avoid performance issues)
      const current = new Date(start);
      let count = 0;
      while (current <= end && count < 365) {
        dates.add(format(current, "yyyy-MM-dd"));
        current.setDate(current.getDate() + 1);
        count++;
      }
    });
    return { hasObra: Array.from(dates).map((d) => parseISO(d)) };
  }, [obras]);

  // Filter obras for selected date
  const obrasForDate = useMemo(() => {
    if (!selectedDate || !obras) return [];
    const day = startOfDay(selectedDate);
    return obras.filter((obra) => {
      const start = startOfDay(parseISO(obra.data_inicio));
      const end = startOfDay(parseISO(obra.data_prevista));
      return isWithinInterval(day, { start, end });
    });
  }, [selectedDate, obras]);

  return (
    <AdminLayout title="Calendário">
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* Calendar */}
        <Card className="w-fit">
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              modifiers={obrasModifiers}
              modifiersClassNames={{
                hasObra: "bg-primary/20 font-bold text-primary",
              }}
              className="rounded-md"
            />
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-primary/20" />
              Dias com obras ativas
            </p>
          </CardContent>
        </Card>

        {/* Details panel */}
        <div className="space-y-4">
          {!selectedDate && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CalendarDays className="mb-2 h-10 w-10" />
                <p>Selecione um dia no calendário para ver as obras ativas.</p>
              </CardContent>
            </Card>
          )}

          {selectedDate && (
            <>
              <h2 className="text-lg font-semibold">
                {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </h2>

              {isLoading && <p className="text-muted-foreground">Carregando...</p>}

              {!isLoading && obrasForDate.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhuma obra ativa nesta data.
                  </CardContent>
                </Card>
              )}

              {obrasForDate.map((obra) => (
                <Card key={obra.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">{obra.nome}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <ObraStatusBadge status={obra.status} />
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/obras/${obra.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Cliente: {obra.cliente_nome} · {format(parseISO(obra.data_inicio), "dd/MM/yyyy")} → {format(parseISO(obra.data_prevista), "dd/MM/yyyy")}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {obra.etapas && obra.etapas.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Etapas</p>
                        {obra.etapas
                          .sort((a, b) => a.ordem - b.ordem)
                          .map((etapa) => {
                            const responsaveis = etapa.etapa_responsaveis
                              ?.map((er: any) => er.responsavel?.full_name)
                              .filter(Boolean) || [];
                            if (responsaveis.length === 0 && etapa.responsavel?.full_name) {
                              responsaveis.push(etapa.responsavel.full_name);
                            }

                            return (
                              <div
                                key={etapa.id}
                                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{etapa.ordem}.</span>
                                  <span>{etapa.titulo}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {responsaveis.length > 0 && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <User className="h-3 w-3" />
                                      {responsaveis.join(", ")}
                                    </span>
                                  )}
                                  <EtapaStatusBadge status={etapa.status} />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhuma etapa cadastrada.</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
