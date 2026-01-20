import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/admin/Dashboard";
import Obras from "./pages/admin/Obras";
import ObraForm from "./pages/admin/ObraForm";
import ObraDetalhes from "./pages/admin/ObraDetalhes";
import Colaboradores from "./pages/admin/Colaboradores";
import Aprovacoes from "./pages/admin/Aprovacoes";
import ColaboradorAtividades from "./pages/colaborador/Atividades";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to handle role-based routing
function RoleBasedHome() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminDashboard /> : <ColaboradorAtividades />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RoleBasedHome />
          </ProtectedRoute>
        }
      />
      <Route path="/obras" element={<ProtectedRoute requiredRole="admin"><Obras /></ProtectedRoute>} />
      <Route path="/obras/nova" element={<ProtectedRoute requiredRole="admin"><ObraForm /></ProtectedRoute>} />
      <Route path="/obras/:id" element={<ProtectedRoute requiredRole="admin"><ObraDetalhes /></ProtectedRoute>} />
      <Route path="/obras/:id/editar" element={<ProtectedRoute requiredRole="admin"><ObraForm /></ProtectedRoute>} />
      <Route path="/colaboradores" element={<ProtectedRoute requiredRole="admin"><Colaboradores /></ProtectedRoute>} />
      <Route path="/aprovacoes" element={<ProtectedRoute requiredRole="admin"><Aprovacoes /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
