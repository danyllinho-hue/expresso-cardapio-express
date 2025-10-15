import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Loader2, Shield, Users, ChefHat, Headset } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ROLE_CONFIG = {
  admin: { label: "Admin", icon: Shield, color: "destructive" },
  gerente: { label: "Gerente", icon: Users, color: "default" },
  atendente: { label: "Atendente", icon: Headset, color: "secondary" },
  cozinha: { label: "Cozinha", icon: ChefHat, color: "outline" },
};

const PERMISSIONS = {
  dashboard: {
    label: "Dashboard e Relatórios",
    items: [
      { id: "view_dashboard", label: "Ver dashboard completo" },
      { id: "view_financeiro", label: "Ver dados financeiros" },
      { id: "view_relatorios", label: "Ver relatórios" },
    ],
  },
  cardapio: {
    label: "Cardápio",
    items: [
      { id: "manage_categories", label: "Gerenciar categorias" },
      { id: "manage_menu_items", label: "Gerenciar itens do cardápio" },
    ],
  },
  operacional: {
    label: "Clientes e Pedidos",
    items: [
      { id: "manage_customers", label: "Gerenciar clientes" },
      { id: "manage_orders", label: "Gerenciar pedidos" },
    ],
  },
  admin: {
    label: "Administração",
    items: [
      { id: "manage_users", label: "Gerenciar usuários" },
      { id: "manage_config", label: "Gerenciar configurações" },
    ],
  },
};

const ROLE_TEMPLATES = {
  admin: Object.values(PERMISSIONS).flatMap(g => g.items.map(i => i.id)),
  gerente: ["view_dashboard", "view_financeiro", "view_relatorios", "manage_categories", "manage_menu_items", "manage_customers", "manage_orders", "manage_config"],
  atendente: ["view_dashboard", "manage_customers", "manage_orders"],
  cozinha: ["manage_orders"],
};

const Usuarios = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState<string>("atendente");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*");

      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id);

          return {
            ...profile,
            role: roles?.[0]?.role || "user",
          };
        })
      );

      return usersWithRoles;
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      // Criar usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: { nome },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      // Atribuir role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert([{ user_id: authData.user.id, role: role as "admin" | "gerente" | "atendente" | "cozinha" }]);

      if (roleError) throw roleError;

      // Atribuir permissões
      if (selectedPermissions.length > 0) {
        const { error: permError } = await supabase
          .from("user_permissions")
          .insert(
            selectedPermissions.map(permission => ({
              user_id: authData.user.id,
              permission,
            }))
          );

        if (permError) throw permError;
      }

      return authData.user;
    },
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar usuário");
    },
  });

  const resetForm = () => {
    setNome("");
    setEmail("");
    setSenha("");
    setRole("atendente");
    setSelectedPermissions([]);
  };

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    setSelectedPermissions(ROLE_TEMPLATES[newRole as keyof typeof ROLE_TEMPLATES] || []);
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
          <p className="text-muted-foreground">Controle o acesso e permissões dos usuários</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados e defina as permissões do usuário
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="João Silva"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="joao@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Cargo</Label>
                  <Select value={role} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="atendente">Atendente</SelectItem>
                      <SelectItem value="cozinha">Cozinha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Permissões Personalizadas</Label>
                {Object.entries(PERMISSIONS).map(([key, group]) => (
                  <Card key={key}>
                    <CardHeader>
                      <CardTitle className="text-sm">{group.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {group.items.map((perm) => (
                        <div key={perm.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={perm.id}
                            checked={selectedPermissions.includes(perm.id)}
                            onCheckedChange={() => togglePermission(perm.id)}
                          />
                          <label
                            htmlFor={perm.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {perm.label}
                          </label>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => createUserMutation.mutate()}
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Usuário
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios?.map((user) => {
                  const roleConfig = ROLE_CONFIG[user.role as keyof typeof ROLE_CONFIG];
                  const Icon = roleConfig?.icon || Users;
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleConfig?.color as any}>
                          <Icon className="mr-1 h-3 w-3" />
                          {roleConfig?.label || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Usuarios;
