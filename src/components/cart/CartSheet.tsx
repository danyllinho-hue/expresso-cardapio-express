import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2 } from "lucide-react";
import { CartItem } from "./CartItem";
import { CheckoutForm } from "./CheckoutForm";
import { useState } from "react";

interface MenuItem {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string;
  destaque: boolean;
}

interface CartItemType {
  item: MenuItem;
  quantity: number;
  notes?: string;
}

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItemType[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
  onClearCart: () => void;
  isOpen: boolean;
}

export const CartSheet = ({
  open,
  onOpenChange,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateNotes,
  onClearCart,
  isOpen,
}: CartSheetProps) => {
  const [showCheckout, setShowCheckout] = useState(false);

  const subtotal = cart.reduce((sum, c) => sum + (c.item.preco * c.quantity), 0);
  const deliveryFee = subtotal > 0 ? 5.00 : 0; // Taxa fixa de entrega
  const total = subtotal + deliveryFee;

  if (showCheckout) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
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
            onBack={() => setShowCheckout(false)}
            onSuccess={() => {
              onClearCart();
              onOpenChange(false);
              setShowCheckout(false);
            }}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
            {/* Cart Items */}
            <div className="flex-1 space-y-4 py-6">
              {cart.map((cartItem) => (
                <CartItem
                  key={cartItem.item.id}
                  cartItem={cartItem}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemoveItem={onRemoveItem}
                  onUpdateNotes={onUpdateNotes}
                />
              ))}
            </div>

            <Separator />

            {/* Order Summary */}
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

            {/* Checkout Button */}
            <Button
              size="lg"
              className="w-full"
              onClick={() => setShowCheckout(true)}
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
