import React, { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { toast } from "sonner";

const Admin = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      // Verificar se usuário tem role ou permissão de acesso
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const { data: userPermissions } = await supabase
        .from("user_permissions")
        .select("permission")
        .eq("user_id", session.user.id);

      if ((!userRoles || userRoles.length === 0) && (!userPermissions || userPermissions.length === 0)) {
        await supabase.auth.signOut();
        toast.error("Acesso negado. Você não tem permissões de acesso.");
        navigate("/login");
        return;
      }

      setIsLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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

  return (
    <PermissionsProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AdminSidebar />
          <div className="flex-1 flex flex-col">
            <AdminHeader />
            <main className="flex-1 p-6 bg-muted/20">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </PermissionsProvider>
  );
};

export default Admin;