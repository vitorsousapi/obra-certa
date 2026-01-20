import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requiredRole?: AppRole;
}

export function ProtectedRoute({ children, requireAdmin = false, requiredRole }: ProtectedRouteProps) {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check for specific role requirement
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  // Legacy support for requireAdmin
  if (requireAdmin && role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
