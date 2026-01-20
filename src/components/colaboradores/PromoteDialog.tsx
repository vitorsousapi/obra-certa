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

interface PromoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  action: "promote" | "demote";
  onConfirm: () => void;
  isPending?: boolean;
}

export function PromoteDialog({
  open,
  onOpenChange,
  userName,
  action,
  onConfirm,
  isPending,
}: PromoteDialogProps) {
  const isPromote = action === "promote";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isPromote ? "Promover a Administrador" : "Rebaixar para Colaborador"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isPromote
              ? `Tem certeza que deseja promover ${userName} para administrador? Esta pessoa terá acesso completo ao sistema, incluindo gerenciamento de obras e colaboradores.`
              : `Tem certeza que deseja rebaixar ${userName} para colaborador? Esta pessoa perderá acesso às funcionalidades administrativas.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className={!isPromote ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            {isPending ? "Processando..." : isPromote ? "Promover" : "Rebaixar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
