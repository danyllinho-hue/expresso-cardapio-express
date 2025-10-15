import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, ListPlus } from "lucide-react";

interface ComplementGroup {
  id: string;
  nome: string;
  tipo: 'radio' | 'checkbox';
  obrigatorio: boolean;
  ordem: number;
}

interface ComplementOption {
  id: string;
  group_id: string;
  nome: string;
  valor_adicional: number;
  ordem: number;
}

const Complementos = () => {
  const [groups, setGroups] = useState<ComplementGroup[]>([]);
  const [options, setOptions] = useState<ComplementOption[]>([]);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isOptionDialogOpen, setIsOptionDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ComplementGroup | null>(null);
  const [editingOption, setEditingOption] = useState<ComplementOption | null>(null);
  const [selectedGroupForOptions, setSelectedGroupForOptions] = useState<string>("");

  const [groupFormData, setGroupFormData] = useState({
    nome: "",
    tipo: "radio" as 'radio' | 'checkbox',
    obrigatorio: false,
    ordem: 0,
  });

  const [optionFormData, setOptionFormData] = useState({
    nome: "",
    valor_adicional: "",
    ordem: 0,
  });

  useEffect(() => {
    loadGroups();
    loadOptions();
  }, []);

  const loadGroups = async () => {
    const { data, error } = await supabase
      .from("complement_groups")
      .select("*")
      .order("ordem");

    if (error) {
      toast.error("Erro ao carregar grupos de complementos");
      return;
    }

    const mappedData: ComplementGroup[] = (data || []).map(g => ({
      id: g.id,
      nome: g.nome,
      tipo: g.tipo as 'radio' | 'checkbox',
      obrigatorio: g.obrigatorio,
      ordem: g.ordem
    }));

    setGroups(mappedData);
  };

  const loadOptions = async () => {
    const { data, error } = await supabase
      .from("complement_options")
      .select("*")
      .order("ordem");

    if (error) {
      toast.error("Erro ao carregar opções");
      return;
    }

    setOptions(data || []);
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupFormData.nome) {
      toast.error("Preencha o nome do grupo");
      return;
    }

    const groupData = {
      nome: groupFormData.nome,
      tipo: groupFormData.tipo,
      obrigatorio: groupFormData.obrigatorio,
      ordem: groupFormData.ordem,
    };

    if (editingGroup) {
      const { error } = await supabase
        .from("complement_groups")
        .update(groupData)
        .eq("id", editingGroup.id);

      if (error) {
        toast.error("Erro ao atualizar grupo");
        return;
      }

      toast.success("Grupo atualizado com sucesso! ✅");
    } else {
      const { error } = await supabase
        .from("complement_groups")
        .insert([groupData]);

      if (error) {
        toast.error("Erro ao criar grupo");
        return;
      }

      toast.success("Grupo criado com sucesso! ✅");
    }

    handleGroupDialogClose();
    loadGroups();
  };

  const handleOptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!optionFormData.nome || !selectedGroupForOptions) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const optionData = {
      group_id: selectedGroupForOptions,
      nome: optionFormData.nome,
      valor_adicional: parseFloat(optionFormData.valor_adicional) || 0,
      ordem: optionFormData.ordem,
    };

    if (editingOption) {
      const { error } = await supabase
        .from("complement_options")
        .update(optionData)
        .eq("id", editingOption.id);

      if (error) {
        toast.error("Erro ao atualizar opção");
        return;
      }

      toast.success("Opção atualizada com sucesso! ✅");
    } else {
      const { error } = await supabase
        .from("complement_options")
        .insert([optionData]);

      if (error) {
        toast.error("Erro ao criar opção");
        return;
      }

      toast.success("Opção criada com sucesso! ✅");
    }

    handleOptionDialogClose();
    loadOptions();
  };

  const handleEditGroup = (group: ComplementGroup) => {
    setEditingGroup(group);
    setGroupFormData({
      nome: group.nome,
      tipo: group.tipo,
      obrigatorio: group.obrigatorio,
      ordem: group.ordem,
    });
    setIsGroupDialogOpen(true);
  };

  const handleEditOption = (option: ComplementOption) => {
    setEditingOption(option);
    setSelectedGroupForOptions(option.group_id);
    setOptionFormData({
      nome: option.nome,
      valor_adicional: option.valor_adicional.toString(),
      ordem: option.ordem,
    });
    setIsOptionDialogOpen(true);
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este grupo? Todas as opções serão removidas.")) return;

    const { error } = await supabase
      .from("complement_groups")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir grupo");
      return;
    }

    toast.success("Grupo excluído!");
    loadGroups();
    loadOptions();
  };

  const handleDeleteOption = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta opção?")) return;

    const { error } = await supabase
      .from("complement_options")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir opção");
      return;
    }

    toast.success("Opção excluída!");
    loadOptions();
  };

  const handleGroupDialogClose = () => {
    setIsGroupDialogOpen(false);
    setEditingGroup(null);
    setGroupFormData({
      nome: "",
      tipo: "radio",
      obrigatorio: false,
      ordem: 0,
    });
  };

  const handleOptionDialogClose = () => {
    setIsOptionDialogOpen(false);
    setEditingOption(null);
    setSelectedGroupForOptions("");
    setOptionFormData({
      nome: "",
      valor_adicional: "",
      ordem: 0,
    });
  };

  const getGroupName = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group?.nome || "-";
  };

  const getOptionsForGroup = (groupId: string) => {
    return options.filter(opt => opt.group_id === groupId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Complementos</h2>
          <p className="text-muted-foreground">Gerencie grupos de complementos e suas opções</p>
        </div>
      </div>

      {/* Grupos de Complementos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Grupos de Complementos</CardTitle>
            <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleGroupDialogClose}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Grupo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingGroup ? "Editar Grupo" : "Novo Grupo de Complementos"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleGroupSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="group-nome">Nome do Grupo *</Label>
                    <Input
                      id="group-nome"
                      value={groupFormData.nome}
                      onChange={(e) => setGroupFormData({ ...groupFormData, nome: e.target.value })}
                      placeholder="Ex: Ponto da carne"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo de Seleção *</Label>
                    <Select
                      value={groupFormData.tipo}
                      onValueChange={(value: 'radio' | 'checkbox') => setGroupFormData({ ...groupFormData, tipo: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="radio">Única escolha (Radio)</SelectItem>
                        <SelectItem value="checkbox">Múltipla escolha (Checkbox)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-md">
                    <div className="space-y-0.5">
                      <Label htmlFor="obrigatorio">Campo Obrigatório</Label>
                      <p className="text-sm text-muted-foreground">
                        Cliente precisa selecionar uma opção
                      </p>
                    </div>
                    <Switch
                      id="obrigatorio"
                      checked={groupFormData.obrigatorio}
                      onCheckedChange={(checked) => 
                        setGroupFormData({ ...groupFormData, obrigatorio: checked })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="group-ordem">Ordem de Exibição</Label>
                    <Input
                      id="group-ordem"
                      type="number"
                      value={groupFormData.ordem}
                      onChange={(e) => setGroupFormData({ ...groupFormData, ordem: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <Button type="button" variant="outline" onClick={handleGroupDialogClose}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingGroup ? "Atualizar" : "Criar Grupo"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum grupo criado ainda. Crie o primeiro!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Obrigatório</TableHead>
                  <TableHead>Opções</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {group.tipo === 'radio' ? 'Única' : 'Múltipla'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={group.obrigatorio ? "default" : "secondary"}>
                        {group.obrigatorio ? "Sim" : "Não"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getOptionsForGroup(group.id).length} opções
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditGroup(group)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteGroup(group.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Opções de Complementos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Opções de Complementos</CardTitle>
            <Dialog open={isOptionDialogOpen} onOpenChange={setIsOptionDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOptionDialogClose}>
                  <ListPlus className="w-4 h-4 mr-2" />
                  Nova Opção
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingOption ? "Editar Opção" : "Nova Opção de Complemento"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleOptionSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="option-group">Grupo *</Label>
                    <Select
                      value={selectedGroupForOptions}
                      onValueChange={setSelectedGroupForOptions}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="option-nome">Nome da Opção *</Label>
                    <Input
                      id="option-nome"
                      value={optionFormData.nome}
                      onChange={(e) => setOptionFormData({ ...optionFormData, nome: e.target.value })}
                      placeholder="Ex: Mal passada"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valor-adicional">Valor Adicional (R$)</Label>
                    <Input
                      id="valor-adicional"
                      type="number"
                      step="0.01"
                      min="0"
                      value={optionFormData.valor_adicional}
                      onChange={(e) => setOptionFormData({ ...optionFormData, valor_adicional: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="option-ordem">Ordem de Exibição</Label>
                    <Input
                      id="option-ordem"
                      type="number"
                      value={optionFormData.ordem}
                      onChange={(e) => setOptionFormData({ ...optionFormData, ordem: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <Button type="button" variant="outline" onClick={handleOptionDialogClose}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingOption ? "Atualizar" : "Criar Opção"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {options.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma opção criada ainda. Crie a primeira!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Valor Adicional</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {options.map((option) => (
                  <TableRow key={option.id}>
                    <TableCell className="font-medium">{option.nome}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {getGroupName(option.group_id)}
                    </TableCell>
                    <TableCell>
                      {option.valor_adicional > 0 ? (
                        <span className="font-medium text-green-600">
                          +R$ {option.valor_adicional.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditOption(option)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteOption(option.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Complementos;
