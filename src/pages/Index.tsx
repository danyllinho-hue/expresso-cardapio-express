import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, ShoppingCart, Clock, MapPin, Truck, Store } from "lucide-react";
import { Link } from "react-router-dom";

interface MenuItem {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string;
  categoria_id: string;
  destaque: boolean;
}

interface Category {
  id: string;
  nome: string;
  ordem: number;
}

interface RestaurantConfig {
  nome_restaurante: string;
  endereco: string;
  tempo_entrega: string;
  status_funcionamento: string;
  modo_atendimento: string;
}

const Index = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [config, setConfig] = useState<RestaurantConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load config
    const { data: configData } = await supabase
      .from("restaurant_config")
      .select("*")
      .single();
    
    if (configData) setConfig(configData);

    // Load categories
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("*")
      .order("ordem");
    
    if (categoriesData) setCategories(categoriesData);

    // Load menu items (only active ones for public)
    const { data: itemsData } = await supabase
      .from("menu_items")
      .select("*")
      .eq("status", "ativo")
      .order("nome");
    
    if (itemsData) setMenuItems(itemsData);
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.descricao?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.categoria_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (item: MenuItem) => {
    const existingItem = cart.find(c => c.item.id === item.id);
    if (existingItem) {
      setCart(cart.map(c => 
        c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart([...cart, { item, quantity: 1 }]);
    }
  };

  const cartTotal = cart.reduce((sum, c) => sum + (c.item.preco * c.quantity), 0);
  const isOpen = config?.status_funcionamento === "aberto";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <span className="text-2xl">🍢</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">{config?.nome_restaurante || "Expresso Espetaria"}</h1>
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant={isOpen ? "default" : "destructive"} className="gap-1">
                    <span className={`w-2 h-2 rounded-full ${isOpen ? "bg-green-500" : "bg-red-500"}`} />
                    {isOpen ? "Aberto" : "Fechado"}
                  </Badge>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    {config?.modo_atendimento === "entrega" && <><Truck className="w-4 h-4" /> Entrega</>}
                    {config?.modo_atendimento === "retirada" && <><Store className="w-4 h-4" /> Retirada</>}
                    {config?.modo_atendimento === "ambos" && <><Truck className="w-4 h-4" /> Ambos</>}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {config?.tempo_entrega || "30-40 min"}
                  </span>
                </div>
              </div>
            </div>
            <Link to="/login">
              <Button variant="outline" size="sm">Admin</Button>
            </Link>
          </div>

          {/* Address */}
          <div className="flex items-start gap-2 text-sm text-muted-foreground mb-4">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{config?.endereco || "Carregando endereço..."}</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar no cardápio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="sticky top-[180px] z-40 bg-card border-b">
          <div className="container mx-auto px-4 py-3 overflow-x-auto">
            <div className="flex gap-2">
              <Button
                variant={!selectedCategory ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                Todos
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.nome}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <main className="container mx-auto px-4 py-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground">
              {menuItems.length === 0 ? "Cardápio em breve! 🍢" : "Nenhum item encontrado"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {item.imagem && (
                  <div className="aspect-video bg-muted relative">
                    <img
                      src={item.imagem}
                      alt={item.nome}
                      className="w-full h-full object-cover"
                    />
                    {item.destaque && (
                      <Badge className="absolute top-2 right-2">Destaque</Badge>
                    )}
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{item.nome}</h3>
                  {item.descricao && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {item.descricao}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">
                      R$ {item.preco.toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => addToCart(item)}
                      disabled={!isOpen}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button size="lg" className="shadow-xl gap-2">
            <ShoppingCart className="w-5 h-5" />
            Ver Carrinho ({cart.length})
            <span className="ml-2 font-bold">R$ {cartTotal.toFixed(2)}</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default Index;