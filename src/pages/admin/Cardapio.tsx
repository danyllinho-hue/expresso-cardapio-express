import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Star, ImageIcon } from "lucide-react";
import ImageUpload from "@/components/admin/ImageUpload";

interface MenuItem {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  categoria_id: string | null;
  imagem: string | null;
  image_thumb_url: string | null;
  status: string;
  destaque: boolean;
}

interface Category {
  id: string;
  nome: string;
}

interface ComplementGroup {
  id: string;
  nome: string;
  tipo: string;
  obrigatorio: boolean;
}

const Cardapio = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [complementGroups, setComplementGroups] = useState<ComplementGroup[]>([]);
  const [selectedComplements, setSelectedComplements] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    preco: "",
    categoria_id: "",
    imagem: "",
    imagem_thumb: "",
    status: "ativo",
    destaque: false,
  });

  useEffect(() => {
    loadCategories();
    loadMenuItems();
    loadComplementGroups();
  }, []);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, nome")
      .order("ordem");

    if (error) {
      toast.error("Erro ao carregar categorias");
      return;
    }

    setCategories(data || []);
  };

  const loadComplementGroups = async () => {
    const { data, error } = await supabase
      .from("complement_groups")
      .select("id, nome, tipo, obrigatorio")
      .order("ordem");

    if (error) {
      toast.error("Erro ao carregar grupos de complementos");
      return;
    }

    setComplementGroups(data || []);
  };

  const loadMenuItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("nome");

    if (error) {
      toast.error("Erro ao carregar itens do cardápio");
      return;
    }

    setMenuItems(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome || !formData.preco || !formData.categoria_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const preco = parseFloat(formData.preco);
    if (isNaN(preco) || preco <= 0) {
      toast.error("Preço deve ser maior que zero");
      return;
    }

    const itemData = {
      nome: formData.nome,
      descricao: formData.descricao || null,
      preco: preco,
      categoria_id: formData.categoria_id,
      imagem: formData.imagem || null,
      image_thumb_url: formData.imagem_thumb || null,
      status: formData.status,
      destaque: formData.destaque,
    };

    let itemId: string;

    if (editingItem) {
      const { error } = await supabase
        .from("menu_items")
        .update(itemData)
        .eq("id", editingItem.id);

      if (error) {
        toast.error("Erro ao atualizar item");
        return;
      }

      itemId = editingItem.id;

      await supabase
        .from("menu_item_complements")
        .delete()
        .eq("menu_item_id", itemId);

      toast.success("Item atualizado com sucesso! ✅");
    } else {
      const { data, error } = await supabase
        .from("menu_items")
        .insert([itemData])
        .select()
        .single();

      if (error || !data) {
        toast.error("Erro ao criar item");
        return;
      }

      itemId = data.id;
      toast.success("Item criado com sucesso! ✅");
    }

    if (selectedComplements.length > 0) {
      const complementLinks = selectedComplements.map(groupId => ({
        menu_item_id: itemId,
        complement_group_id: groupId,
      }));

      const { error } = await supabase
        .from("menu_item_complements")
        .insert(complementLinks);

      if (error) {
        toast.error("Erro ao vincular complementos");
        return;
      }
    }

    handleDialogClose();
    loadMenuItems();
  };

  const handleEdit = async (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome,
      descricao: item.descricao || "",
      preco: item.preco.toString(),
      categoria_id: item.categoria_id || "",
      imagem: item.imagem || "",
      imagem_thumb: item.image_thumb_url || "",
      status: item.status,
      destaque: item.destaque,
    });

    const { data } = await supabase
      .from("menu_item_complements")
      .select("complement_group_id")
      .eq("menu_item_id", item.id);

    if (data) {
      setSelectedComplements(data.map(link => link.complement_group_id));
    }

    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;

    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir item");
      return;
    }

    toast.success("Item excluído!");
    loadMenuItems();
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setSelectedComplements([]);
    setFormData({
      nome: "",
      descricao: "",
      preco: "",
      categoria_id: "",
      imagem: "",
      imagem_thumb: "",
      status: "ativo",
      destaque: false,
    });
  };

  const handleImageUploaded = (imageUrl: string, thumbUrl: string) => {
    setFormData({ ...formData, imagem: imageUrl, imagem_thumb: thumbUrl });
  };

  const filteredItems = selectedCategory === "all" 
    ? menuItems 
    : menuItems.filter(item => item.categoria_id === selectedCategory);

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "-";
    const category = categories.find(c => c.id === categoryId);
    return category?.nome || "-";
  };

  // Agrupar itens por categoria
  const itemsByCategory = categories.map(category => ({
    category,
    items: filteredItems.filter(item => item.categoria_id === category.id)
  })).filter(group => group.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cardápio</h2>
          <p className="text-muted-foreground">Gerencie os itens do seu cardápio</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleDialogClose()}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Editar Item" : "Novo Item do Cardápio"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Produto *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Espetinho de Carne"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria *</Label>
                <Select
                  value={formData.categoria_id}
                  onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva o produto (ingredientes, tamanho, etc)"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preco">Preço (R$) *</Label>
                <Input
                  id="preco"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.preco}
                  onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                  placeholder="Ex: 8.00"
                  required
                />
              </div>

              <ImageUpload
                currentImageUrl={formData.imagem}
                onImageUploaded={handleImageUploaded}
                itemName={formData.nome}
              />

              <div className="flex items-center justify-between p-4 border rounded-md">
                <div className="space-y-0.5">
                  <Label htmlFor="status">Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Item visível no cardápio público
                  </p>
                </div>
                <Switch
                  id="status"
                  checked={formData.status === "ativo"}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, status: checked ? "ativo" : "inativo" })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-md">
                <div className="space-y-0.5">
                  <Label htmlFor="destaque">Item em Destaque</Label>
                  <p className="text-sm text-muted-foreground">
                    Aparece na seção de destaques do cardápio
                  </p>
                </div>
                <Switch
                  id="destaque"
                  checked={formData.destaque}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, destaque: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Grupos de Complementos</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Selecione os grupos de opções que o cliente poderá escolher
                </p>
                <div className="border rounded-md p-4 space-y-2 max-h-[200px] overflow-y-auto">
                  {complementGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum grupo de complementos cadastrado.
                    </p>
                  ) : (
                    complementGroups.map((group) => (
                      <label
                        key={group.id}
                        className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedComplements.includes(group.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedComplements([...selectedComplements, group.id]);
                            } else {
                              setSelectedComplements(selectedComplements.filter(id => id !== group.id));
                            }
                          }}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{group.nome}</div>
                          <div className="text-xs text-muted-foreground">
                            {group.tipo === 'radio' ? 'Seleção única' : 'Múltipla escolha'}
                            {group.obrigatorio && ' • Obrigatório'}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingItem ? "Atualizar" : "Criar Item"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Todos os Itens ({filteredItems.length})</CardTitle>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum item cadastrado ainda. Crie o primeiro!
            </div>
          ) : (
            itemsByCategory.map(({ category, items }) => (
              <div key={category.id} className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <h3 className="text-xl font-semibold">{category.nome}</h3>
                  <Badge variant="secondary">{items.length} {items.length === 1 ? 'item' : 'itens'}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => (
                    <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-video relative bg-muted">
                        {item.image_thumb_url || item.imagem ? (
                          <img 
                            src={item.image_thumb_url || item.imagem || ""} 
                            alt={item.nome}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        {item.destaque && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full flex items-center gap-1 text-xs">
                            <Star className="w-3 h-3 fill-current" />
                            Destaque
                          </div>
                        )}
                        <Badge 
                          variant={item.status === "ativo" ? "default" : "secondary"}
                          className="absolute bottom-2 left-2"
                        >
                          {item.status === "ativo" ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <h4 className="font-semibold text-lg">{item.nome}</h4>
                          {item.descricao && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {item.descricao}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-primary">
                            R$ {item.preco.toFixed(2)}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Cardapio;
