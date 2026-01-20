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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MoreHorizontal, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { useColaboradores, usePromoteToAdmin, useDemoteToColaborador, useDeleteUser } from "@/hooks/useColaboradores";
import { RoleBadge } from "@/components/colaboradores/RoleBadge";
import { PromoteDialog } from "@/components/colaboradores/PromoteDialog";
import { AddUserDialog } from "@/components/colaboradores/AddUserDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SelectedUser {
  id: string;
  name: string;
  action: "promote" | "demote";
}

interface DeleteUser {
  id: string;
  userId: string;
  name: string;
}

export default function Colaboradores() {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<DeleteUser | null>(null);

  const { data: colaboradores, isLoading } = useColaboradores();
  const promoteToAdmin = usePromoteToAdmin();
  const demoteToColaborador = useDemoteToColaborador();
  const deleteUserMutation = useDeleteUser();
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

  const handleDeleteConfirm = async () => {
    if (!deleteUser) return;
    await deleteUserMutation.mutateAsync(deleteUser.userId);
    setDeleteUser(null);
  };

  return (
    <AdminLayout title="Colaboradores">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Colaboradores</h1>
            <p className="text-muted-foreground">
              Gerencie os usuários do sistema e suas permissões.
            </p>
          </div>
          <AddUserDialog />
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
                <TableHead className="w-[80px]">Ações</TableHead>
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
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
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
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              {colaborador.role === "colaborador" ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setSelectedUser({
                                      id: colaborador.id,
                                      name: colaborador.full_name,
                                      action: "promote",
                                    })
                                  }
                                >
                                  <ArrowUp className="h-4 w-4 mr-2" />
                                  Promover a Admin
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setSelectedUser({
                                      id: colaborador.id,
                                      name: colaborador.full_name,
                                      action: "demote",
                                    })
                                  }
                                >
                                  <ArrowDown className="h-4 w-4 mr-2" />
                                  Rebaixar a Colaborador
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() =>
                                  setDeleteUser({
                                    id: colaborador.id,
                                    userId: colaborador.user_id,
                                    name: colaborador.full_name,
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover Usuário
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {deleteUser?.name}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
