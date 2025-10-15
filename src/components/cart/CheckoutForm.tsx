import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface MenuItem {
  id: string;
  nome: string;
  preco: number;
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

interface CheckoutFormProps {
  cart: CartItemType[];
  total: number;
  onBack: () => void;
  onSuccess: () => void;
}

export const CheckoutForm = ({ cart, total, onBack, onSuccess }: CheckoutFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    whatsapp: "",
    endereco: "",
    data_nascimento: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form
      if (!formData.nome || !formData.whatsapp || !formData.endereco) {
        toast.error("Preencha todos os campos obrigatórios");
        setLoading(false);
        return;
      }

      // Create or get customer
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("whatsapp", formData.whatsapp)
        .maybeSingle();

      let customerId = existingCustomer?.id;

      if (!customerId) {
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            nome: formData.nome,
            whatsapp: formData.whatsapp,
            endereco: formData.endereco,
            data_nascimento: formData.data_nascimento || null,
          })
          .select("id")
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: customerId,
          total,
          delivery_address: formData.endereco,
          notes: formData.notes || null,
          status: "pendente",
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map((cartItem) => ({
        order_id: order.id,
        menu_item_id: cartItem.item.id,
        menu_item_name: cartItem.item.nome,
        quantity: cartItem.quantity,
        price: cartItem.item.preco,
        notes: cartItem.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success("Pedido realizado com sucesso! 🎉");
      onSuccess();
    } catch (error) {
      console.error("Erro ao criar pedido:", error);
      toast.error("Erro ao criar pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-6">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar ao Carrinho
      </Button>

      {/* Order Summary */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h3 className="font-semibold mb-3">Resumo do Pedido</h3>
        {cart.map((cartItem, index) => {
          const itemTotal = cartItem.item.preco + 
            (cartItem.complements?.reduce((sum, comp) => 
              sum + comp.options.reduce((optSum, opt) => optSum + opt.additionalPrice, 0), 0
            ) || 0);
          
          return (
            <div key={`${cartItem.item.id}-${index}`} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>
                  {cartItem.quantity}x {cartItem.item.nome}
                </span>
                <span className="font-medium">
                  R$ {(itemTotal * cartItem.quantity).toFixed(2)}
                </span>
              </div>
              {cartItem.complements && cartItem.complements.length > 0 && (
                <div className="pl-4 text-xs text-muted-foreground space-y-0.5">
                  {cartItem.complements.map((comp) => (
                    <div key={comp.groupId}>
                      {comp.groupName}: {comp.options.map(opt => opt.name).join(', ')}
                    </div>
                  ))}
                </div>
              )}
              {cartItem.notes && (
                <div className="pl-4 text-xs text-muted-foreground">
                  Obs: {cartItem.notes}
                </div>
              )}
            </div>
          );
        })}
        <Separator className="my-2" />
        <div className="flex justify-between font-bold text-primary">
          <span>Total</span>
          <span>R$ {total.toFixed(2)}</span>
        </div>
      </div>

      {/* Customer Data */}
      <div className="space-y-4">
        <h3 className="font-semibold">Seus Dados</h3>
        
        <div className="space-y-2">
          <Label htmlFor="nome">Nome Completo *</Label>
          <Input
            id="nome"
            required
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            placeholder="Seu nome completo"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp *</Label>
          <Input
            id="whatsapp"
            required
            type="tel"
            value={formData.whatsapp}
            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
            placeholder="(75) 99999-9999"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endereco">Endereço de Entrega *</Label>
          <Textarea
            id="endereco"
            required
            value={formData.endereco}
            onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
            placeholder="Rua, número, complemento, bairro..."
            className="min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="data_nascimento">Data de Nascimento (opcional)</Label>
          <Input
            id="data_nascimento"
            type="date"
            value={formData.data_nascimento}
            onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Observações do Pedido (opcional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Alguma informação adicional sobre o pedido..."
            className="min-h-[80px]"
          />
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Finalizando...
          </>
        ) : (
          `Finalizar Pedido (R$ ${total.toFixed(2)})`
        )}
      </Button>
    </form>
  );
};
