import React, { ReactNode } from "react";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
  role?: string;
  fallback?: ReactNode;
}

export const ProtectedRoute = ({ 
  children, 
  permission, 
  role, 
  fallback 
}: ProtectedRouteProps) => {
  const { hasPermission, hasRole, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const hasAccess = permission ? hasPermission(permission) : role ? hasRole(role) : true;

  if (!hasAccess) {
    if (fallback) return <>{fallback}</>;
    
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar esta funcionalidade. Entre em contato com o administrador.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};
