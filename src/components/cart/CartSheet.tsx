import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, Sparkles } from "lucide-react";
import { CartItem } from "./CartItem";
import { CheckoutForm } from "./CheckoutForm";
import { UpsellStep } from "./UpsellStep";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MenuItem {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string;
  destaque: boolean;
  categoria_id: string;
}

interface SelectedComplement {
  groupId: string;
  groupName: string;
  options: Array<{
    id: string;
    name: string;
    additionalPrice: number;
  }>;
}

interface CartItemType {
  item: MenuItem;
  quantity: number;
  notes?: string;
  complements?: SelectedComplement[];
}

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItemType[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
  onClearCart: () => void;
  onAddItem: (item: MenuItem) => void;
  isOpen: boolean;
}

type Step = "cart" | "upsell" | "checkout";

export const CartSheet = ({
  open,
  onOpenChange,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateNotes,
  onClearCart,
  onAddItem,
  isOpen,
}: CartSheetProps) => {
  const [step, setStep] = useState<Step>("cart");
  const [upsellEnabled, setUpsellEnabled] = useState(false);
  const [minSubtotal, setMinSubtotal] = useState(15);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("restaurant_config")
          .select("upsell_ai_enabled, upsell_min_subtotal, openai_api_key")
          .maybeSingle();
        
        if (error) {
          console.error("Error fetching restaurant config for upsell:", error);
          return;
        }

        if (data) {
          setUpsellEnabled(data.upsell_ai_enabled ?? false);
          setMinSubtotal(data.upsell_min_subtotal ?? 15);
          setHasApiKey(!!data.openai_api_key);
        }
      } catch (err) {
        console.error("Exception in upsell config check:", err);
      }
    };
    
    fetchConfig();
  }, []);

  const subtotal = cart.reduce((sum, c) => {
    let itemTotal = c.item.preco;
    if (c.complements) {
      c.complements.forEach(comp => {
        comp.options.forEach(opt => {
          itemTotal += opt.additionalPrice;
        });
      });
    }
    return sum + (itemTotal * c.quantity);
  }, 0);
  const deliveryFee = subtotal > 0 ? 5.0 : 0;
  const total = subtotal + deliveryFee;

  const goToCheckout = () => {
    if (upsellEnabled && hasApiKey && subtotal >= minSubtotal) {
      setStep("upsell");
    } else {
      setStep("checkout");
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) setStep("cart");
    onOpenChange(v);
  };

  if (step === "checkout") {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Finalizar Pedido
            </SheetTitle>
          </SheetHeader>
          <CheckoutForm
            cart={cart}
            total={total}
            onBack={() => setStep(upsellEnabled && hasApiKey && subtotal >= minSubtotal ? "upsell" : "cart")}
            onSuccess={() => {
              onClearCart();
              onOpenChange(false);
              setStep("cart");
            }}
          />
        </SheetContent>
      </Sheet>
    );
  }

  if (step === "upsell") {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Sugestões pra você
            </SheetTitle>
          </SheetHeader>
          <UpsellStep
            cart={cart}
            onBack={() => setStep("cart")}
            onContinue={() => setStep("checkout")}
            onAddItem={onAddItem}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Seu Carrinho ({cart.length})
            </SheetTitle>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearCart}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="text-xl font-semibold mb-2">Carrinho vazio</h3>
            <p className="text-muted-foreground">
              Adicione itens deliciosos do cardápio!
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 py-6">
              {cart.map((cartItem, index) => (
                <CartItem
                  key={`${cartItem.item.id}-${index}`}
                  cartItem={cartItem}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemoveItem={onRemoveItem}
                  onUpdateNotes={onUpdateNotes}
                />
              ))}
            </div>

            <Separator />

            <div className="space-y-3 py-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa de entrega</span>
                <span className="font-medium">R$ {deliveryFee.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={goToCheckout}
              disabled={!isOpen}
            >
              {isOpen ? "Continuar para Pagamento" : "Restaurante Fechado"}
            </Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
