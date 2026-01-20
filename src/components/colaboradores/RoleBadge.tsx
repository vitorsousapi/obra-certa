import { Badge } from "@/components/ui/badge";
import { Shield, User } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface RoleBadgeProps {
  role: AppRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  if (role === "admin") {
    return (
      <Badge variant="default" className="gap-1">
        <Shield className="h-3 w-3" />
        Administrador
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <User className="h-3 w-3" />
      Colaborador
    </Badge>
  );
}
