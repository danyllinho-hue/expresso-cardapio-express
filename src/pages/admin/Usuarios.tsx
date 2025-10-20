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
import { UserPlus, Loader2, Shield, Users, ChefHat, Headset, Power, Trash2, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  const [editMode, setEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
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
        .select("*")
        .eq("ativo", true);

      const usersWithRolesAndPerms = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id);

          const { data: permissions } = await supabase
            .from("user_permissions")
            .select("permission")
            .eq("user_id", profile.id);

          return {
            ...profile,
            role: roles?.[0]?.role || "user",
            permissions: permissions?.map(p => p.permission) || [],
          };
        })
      );

      return usersWithRolesAndPerms;
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          operation: 'create',
          userData: {
            email,
            password: senha,
            nome,
            role,
            permissions: selectedPermissions,
          }
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data.user;
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

  const updateUserMutation = useMutation({
    mutationFn: async () => {
      if (!editingUserId) throw new Error("ID do usuário não encontrado");

      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          operation: 'update',
          userData: {
            userId: editingUserId,
            email,
            password: senha || undefined,
            nome,
            role,
            permissions: selectedPermissions,
          }
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar usuário");
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, currentStatus }: { userId: string; currentStatus: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ ativo: !currentStatus })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status do usuário atualizado!");
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          operation: 'delete',
          userData: { userId }
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Usuário excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir usuário: " + error.message);
    },
  });

  const resetForm = () => {
    setNome("");
    setEmail("");
    setSenha("");
    setRole("atendente");
    setSelectedPermissions([]);
    setEditMode(false);
    setEditingUserId(null);
  };

  const handleEdit = (user: any) => {
    setEditMode(true);
    setEditingUserId(user.id);
    setNome(user.nome || user.email.split('@')[0]);
    setEmail(user.email);
    setSenha("");
    setRole(user.role);
    setSelectedPermissions(user.permissions || []);
    setOpen(true);
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

  const handleSubmit = () => {
    if (editMode) {
      updateUserMutation.mutate();
    } else {
      createUserMutation.mutate();
    }
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
            <Button onClick={resetForm}>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editMode ? "Editar Usuário" : "Criar Novo Usuário"}</DialogTitle>
              <DialogDescription>
                {editMode ? "Atualize as informações e permissões do usuário" : "Preencha os dados e defina as permissões do usuário"}
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
                  <Label htmlFor="senha">
                    {editMode ? "Nova Senha (deixe em branco para não alterar)" : "Senha"}
                  </Label>
                  <Input
                    id="senha"
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder={editMode ? "Digite a nova senha" : "Mínimo 6 caracteres"}
                    minLength={6}
                  />
                  {editMode && (
                    <p className="text-xs text-muted-foreground">
                      Deixe em branco se não quiser alterar a senha
                    </p>
                  )}
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
                  onClick={handleSubmit}
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {(createUserMutation.isPending || updateUserMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editMode ? "Atualizar" : "Criar"} Usuário
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
                  <TableHead>Permissões</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
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
                        <div className="flex flex-wrap gap-1">
                          {user.permissions?.slice(0, 3).map((perm: string) => (
                            <Badge key={perm} variant="outline" className="text-xs">
                              {perm.replace("manage_", "").replace("view_", "").replace("_", " ")}
                            </Badge>
                          ))}
                          {user.permissions && user.permissions.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.permissions.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.ativo ? "default" : "secondary"}>
                          {user.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleUserStatusMutation.mutate({ 
                              userId: user.id, 
                              currentStatus: user.ativo 
                            })}
                            disabled={toggleUserStatusMutation.isPending}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O usuário {user.email} será permanentemente excluído do sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUserMutation.mutate(user.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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
