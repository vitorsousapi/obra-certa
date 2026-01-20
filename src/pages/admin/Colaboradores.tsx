import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, ArrowUp, ArrowDown } from "lucide-react";
import { useColaboradores, usePromoteToAdmin, useDemoteToColaborador } from "@/hooks/useColaboradores";
import { RoleBadge } from "@/components/colaboradores/RoleBadge";
import { PromoteDialog } from "@/components/colaboradores/PromoteDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

interface SelectedUser {
  id: string;
  name: string;
  action: "promote" | "demote";
}

export default function Colaboradores() {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);

  const { data: colaboradores, isLoading } = useColaboradores();
  const promoteToAdmin = usePromoteToAdmin();
  const demoteToColaborador = useDemoteToColaborador();
  const { profile } = useAuth();

  const filteredColaboradores = colaboradores?.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleConfirm = async () => {
    if (!selectedUser) return;

    if (selectedUser.action === "promote") {
      await promoteToAdmin.mutateAsync(selectedUser.id);
    } else {
      await demoteToColaborador.mutateAsync(selectedUser.id);
    }
    setSelectedUser(null);
  };

  return (
    <AdminLayout title="Colaboradores">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Colaboradores</h1>
          <p className="text-muted-foreground">
            Gerencie os usuários do sistema e suas permissões.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead className="w-[150px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-28" /></TableCell>
                  </TableRow>
                ))
              ) : filteredColaboradores?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredColaboradores?.map((colaborador) => {
                  const isCurrentUser = colaborador.id === profile?.id;
                  
                  return (
                    <TableRow key={colaborador.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={colaborador.avatar_url || undefined} />
                            <AvatarFallback>
                              {getInitials(colaborador.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{colaborador.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{colaborador.email}</TableCell>
                      <TableCell>
                        <RoleBadge role={colaborador.role} />
                      </TableCell>
                      <TableCell>
                        {isCurrentUser ? (
                          <span className="text-sm text-muted-foreground">Você</span>
                        ) : colaborador.role === "colaborador" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setSelectedUser({
                                id: colaborador.id,
                                name: colaborador.full_name,
                                action: "promote",
                              })
                            }
                          >
                            <ArrowUp className="h-4 w-4 mr-1" />
                            Promover
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setSelectedUser({
                                id: colaborador.id,
                                name: colaborador.full_name,
                                action: "demote",
                              })
                            }
                          >
                            <ArrowDown className="h-4 w-4 mr-1" />
                            Rebaixar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <PromoteDialog
        open={!!selectedUser}
        onOpenChange={() => setSelectedUser(null)}
        userName={selectedUser?.name || ""}
        action={selectedUser?.action || "promote"}
        onConfirm={handleConfirm}
        isPending={promoteToAdmin.isPending || demoteToColaborador.isPending}
      />
    </AdminLayout>
  );
}
