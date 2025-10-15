import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PermissionsContextType {
  roles: string[];
  permissions: string[];
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: boolean;
  isLoading: boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider = ({ children }: { children: ReactNode }) => {
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setRoles([]);
        setPermissions([]);
        setIsLoading(false);
        return;
      }

      // Buscar roles
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      // Buscar permissões
      const { data: userPermissions } = await supabase
        .from("user_permissions")
        .select("permission")
        .eq("user_id", user.id);

      setRoles(userRoles?.map(r => r.role) || []);
      setPermissions(userPermissions?.map(p => p.permission) || []);
      setIsLoading(false);
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadPermissions();
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (role: string) => roles.includes(role);
  
  const hasPermission = (permission: string) => 
    roles.includes('admin') || permissions.includes(permission);

  const isAdmin = roles.includes('admin');

  return (
    <PermissionsContext.Provider
      value={{
        roles,
        permissions,
        hasRole,
        hasPermission,
        isAdmin,
        isLoading,
        refreshPermissions: loadPermissions,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions must be used within PermissionsProvider");
  }
  return context;
};
