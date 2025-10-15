import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart } from "lucide-react";
import { MenuHeader } from "@/components/menu/MenuHeader";
import { CategoryFilter } from "@/components/menu/CategoryFilter";
import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { CartSheet } from "@/components/cart/CartSheet";
import { ProductDetailModal } from "@/components/menu/ProductDetailModal";
import { toast } from "sonner";

interface MenuItem {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string;
  categoria_id: string;
  destaque: boolean;
}

interface CartItemType {
  item: MenuItem;
  quantity: number;
  notes?: string;
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
  const [cart, setCart] = useState<CartItemType[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load config
      const { data: configData, error: configError } = await supabase
        .from("restaurant_config")
        .select("*")
        .single();
      
      if (configError) throw configError;
      if (configData) setConfig(configData);

      // Load categories
      const { data: categoriesData, error: catError } = await supabase
        .from("categories")
        .select("*")
        .order("ordem");
      
      if (catError) throw catError;
      if (categoriesData) setCategories(categoriesData);

      // Load menu items (only active ones for public)
      const { data: itemsData, error: itemsError } = await supabase
        .from("menu_items")
        .select("*")
        .eq("status", "ativo")
        .order("nome");
      
      if (itemsError) throw itemsError;
      if (itemsData) setMenuItems(itemsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar o cardápio");
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.descricao?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.categoria_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (item: MenuItem, quantity: number = 1, notes: string = "") => {
    const existingItemIndex = cart.findIndex(c => 
      c.item.id === item.id && c.notes === notes
    );
    
    if (existingItemIndex !== -1) {
      const newCart = [...cart];
      newCart[existingItemIndex].quantity += quantity;
      setCart(newCart);
      toast.success(`Quantidade atualizada! ${item.nome}`);
    } else {
      setCart([...cart, { item, quantity, notes }]);
      toast.success(`${item.nome} adicionado ao carrinho! 🛒`);
    }
  };

  const handleItemClick = (item: MenuItem) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    setCart(cart.map(c => 
      c.item.id === itemId ? { ...c, quantity } : c
    ));
  };

  const removeItem = (itemId: string) => {
    setCart(cart.filter(c => c.item.id !== itemId));
    toast.success("Item removido do carrinho");
  };

  const updateNotes = (itemId: string, notes: string) => {
    setCart(cart.map(c => 
      c.item.id === itemId ? { ...c, notes } : c
    ));
  };

  const clearCart = () => {
    setCart([]);
    toast.success("Carrinho limpo!");
  };

  const cartTotal = cart.reduce((sum, c) => sum + (c.item.preco * c.quantity), 0);
  const isOpen = config?.status_funcionamento === "aberto";
  const highlightedItems = menuItems.filter(item => item.destaque);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <MenuHeader 
        config={config} 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery} 
      />

      {/* Category Filter */}
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* Destaques Section */}
        {!selectedCategory && !searchQuery && highlightedItems.length > 0 && (
          <section className="animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-3xl font-bold">⭐ Destaques</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {highlightedItems.slice(0, 3).map(item => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onAddToCart={(item) => addToCart(item, 1, "")}
                  onItemClick={handleItemClick}
                  disabled={!isOpen}
                />
              ))}
            </div>
          </section>
        )}

        {/* All Items Section */}
        <section>
          {!selectedCategory && !searchQuery && (
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-3xl font-bold">🍽️ Cardápio Completo</h2>
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="text-center py-20 animate-fade-in">
              <div className="text-7xl mb-4">🔍</div>
              <p className="text-2xl font-semibold mb-2">
                {menuItems.length === 0 ? "Cardápio em breve!" : "Nenhum item encontrado"}
              </p>
              <p className="text-muted-foreground">
                {menuItems.length === 0 
                  ? "Estamos preparando delícias para você 🍢" 
                  : "Tente buscar por outro nome ou categoria"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(item => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onAddToCart={(item) => addToCart(item, 1, "")}
                  onItemClick={handleItemClick}
                  disabled={!isOpen}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Product Detail Modal */}
      <ProductDetailModal
        item={selectedItem}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onAddToCart={addToCart}
      />

      {/* Cart Sheet */}
      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onUpdateNotes={updateNotes}
        onClearCart={clearCart}
        isOpen={isOpen}
      />

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 animate-scale-in">
          <Button 
            size="lg" 
            className="shadow-2xl gap-3 h-14 px-6 hover:scale-105 transition-transform"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="font-semibold">Ver Carrinho ({cart.length})</span>
            <div className="h-6 w-px bg-primary-foreground/20" />
            <span className="font-bold text-lg">R$ {cartTotal.toFixed(2)}</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default Index;