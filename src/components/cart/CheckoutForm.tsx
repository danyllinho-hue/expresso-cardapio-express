import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Gift } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { z } from "zod";
import { useClienteAuth } from "@/contexts/ClienteAuthContext";
import { Link } from "react-router-dom";


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

// Zod validation schema for checkout form
const checkoutSchema = z.object({
  nome: z.string().trim().min(3, "Nome muito curto (mínimo 3 caracteres)").max(100, "Nome muito longo (máximo 100 caracteres)"),
  whatsapp: z.string().regex(/^(\+?55)?[\s-]?\(?\d{2}\)?[\s-]?9?\d{4}[\s-]?\d{4}$/, "WhatsApp inválido"),
  endereco: z.string().trim().min(10, "Endereço muito curto (mínimo 10 caracteres)").max(500, "Endereço muito longo (máximo 500 caracteres)"),
  data_nascimento: z.string().optional(),
  notes: z.string().max(1000, "Observações muito longas (máximo 1000 caracteres)").optional()
});

export const CheckoutForm = ({ cart, total, onBack, onSuccess }: CheckoutFormProps) => {
  const { user } = useClienteAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    whatsapp: "",
    endereco: "",
    data_nascimento: "",
    notes: "",
  });

  // Prefill from logged-in customer record
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("nome, whatsapp, endereco, data_nascimento")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setFormData((f) => ({
          ...f,
          nome: data.nome ?? f.nome,
          whatsapp: data.whatsapp ?? f.whatsapp,
          endereco: data.endereco ?? f.endereco,
          data_nascimento: data.data_nascimento ?? f.data_nascimento,
        }));
      } else {
        const meta = user.user_metadata ?? {};
        setFormData((f) => ({
          ...f,
          nome: f.nome || (meta.nome as string) || (meta.full_name as string) || "",
          whatsapp: f.whatsapp || (meta.whatsapp as string) || "",
        }));
      }
    })();
  }, [user]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate cart is not empty
      if (!cart || cart.length === 0) {
        toast.error("Seu carrinho está vazio! Adicione itens antes de finalizar o pedido.");
        setLoading(false);
        return;
      }

      // Validate form data with Zod schema
      try {
        checkoutSchema.parse(formData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const firstError = error.errors[0];
          toast.error(firstError.message);
          setLoading(false);
          return;
        }
      }

      // Create or get customer
      let customerId: string | undefined;
      if (user) {
        const { data: mine } = await supabase
          .from("customers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        customerId = mine?.id;
      }
      if (!customerId) {
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id")
          .eq("whatsapp", formData.whatsapp)
          .maybeSingle();
        customerId = existingCustomer?.id;
      }

      if (!customerId) {
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            nome: formData.nome,
            whatsapp: formData.whatsapp,
            endereco: formData.endereco,
            data_nascimento: formData.data_nascimento || null,
            user_id: user?.id ?? null,
          })
          .select("id")
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      } else if (user) {
        // Keep customer row linked and refreshed with latest info
        await supabase
          .from("customers")
          .update({
            user_id: user.id,
            nome: formData.nome,
            endereco: formData.endereco,
            data_nascimento: formData.data_nascimento || null,
          })
          .eq("id", customerId);
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: customerId,
          user_id: user?.id ?? null,
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

      toast.success(`Pedido #${order.id.slice(0, 8)} realizado com sucesso! Redirecionando... 🎉`, {
        duration: 2000,
      });

      // Aguardar 1 segundo para mostrar toast, depois redirecionar
      setTimeout(() => {
        window.location.href = `/pedido/${order.id}`;
      }, 1000);
    } catch (error: any) {
      console.error("Erro ao criar pedido:", error);
      
      if (error.message?.includes("duplicate key")) {
        toast.error("Erro: Este WhatsApp já possui um pedido em andamento");
      } else if (error.message?.includes("network") || error.message?.includes("fetch")) {
        toast.error("Erro de conexão. Verifique sua internet e tente novamente");
      } else {
        toast.error("Erro ao criar pedido. Tente novamente");
      }
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
