import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, MessageCircle, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { playNotificationSound } from "@/utils/notificationSound";

interface Order {
  id: string;
  created_at: string;
  total: number;
  status: string;
  delivery_address: string;
  notes: string | null;
  customer_id: string;
  customers: {
    nome: string;
    whatsapp: string;
  } | null;
}

interface OrderItem {
  id: string;
  menu_item_name: string;
  quantity: number;
  price: number;
  notes: string | null;
}

const Pedidos = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          customers (
            nome,
            whatsapp
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItems = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      if (error) throw error;
      setOrderItems(data || []);
    } catch (error) {
      console.error("Erro ao buscar itens do pedido:", error);
      toast.error("Erro ao carregar itens");
    }
  };

  useEffect(() => {
    fetchOrders();

    // Realtime para novos pedidos
    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          playNotificationSound();
          toast.success("🔔 Novo pedido recebido!");
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    fetchOrderItems(order.id);
    setDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pendente: "default",
      "em_preparo": "secondary",
      concluido: "secondary",
      cancelado: "destructive",
    };

    const labels: Record<string, string> = {
      pendente: "Pendente",
      "em_preparo": "Em Preparo",
      concluido: "Concluído",
      cancelado: "Cancelado",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const formatWhatsApp = (whatsapp: string) => {
    return whatsapp.replace(/\D/g, "");
  };

  const sendWhatsAppToCustomer = (order: Order) => {
    if (!order.customers) return;

    const phone = formatWhatsApp(order.customers.whatsapp);
    const message = `🎉 *PEDIDO CONFIRMADO!*

Olá *${order.customers.nome}*! Seu pedido foi recebido com sucesso.

📦 *Pedido #${order.id.slice(0, 8)}*
🕒 Previsão: 30–40 min

💰 *Total: R$ ${order.total.toFixed(2)}*
📍 *Entrega:* ${order.delivery_address}

Acompanhe seu pedido em: ${window.location.origin}

_Expresso Espetaria_ 🍢`;

    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const notifyStoreWhatsApp = (order: Order) => {
    if (!order.customers) return;

    const storePhone = "75992315312"; // WhatsApp oficial da loja
    const message = `🔔 *NOVO PEDIDO!*

*Cliente:* ${order.customers.nome}
📞 ${order.customers.whatsapp}

*Pedido #${order.id.slice(0, 8)}*
💰 Total: R$ ${order.total.toFixed(2)}

📍 *Entrega:*
${order.delivery_address}

${order.notes ? `📝 *Observações:* ${order.notes}` : ""}

Ver detalhes: ${window.location.origin}/admin/pedidos

_Sistema Expresso Espetaria_ 🍢`;

    const whatsappUrl = `https://wa.me/55${storePhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pedidos</h2>
          <p className="text-muted-foreground">Gerencie todos os pedidos do Expresso</p>
        </div>
        <Button onClick={fetchOrders} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Pedidos ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum pedido encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">
                      #{order.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{order.customers?.nome || "N/A"}</TableCell>
                    <TableCell>
                      <a
                        href={`https://wa.me/55${formatWhatsApp(order.customers?.whatsapp || "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {order.customers?.whatsapp || "N/A"}
                      </a>
                    </TableCell>
                    <TableCell>R$ {order.total.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openOrderDetails(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendWhatsAppToCustomer(order)}
                        >
                          <MessageCircle className="h-4 w-4" />
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

      {/* Modal de Detalhes */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Detalhes do Pedido #{selectedOrder?.id.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedOrder.customers?.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">WhatsApp</p>
                  <p className="font-medium">{selectedOrder.customers?.whatsapp}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-medium">R$ {selectedOrder.total.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Endereço de Entrega</p>
                <p className="font-medium">{selectedOrder.delivery_address}</p>
              </div>

              {selectedOrder.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="font-medium">{selectedOrder.notes}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Itens do Pedido</p>
                <div className="border rounded-lg divide-y">
                  {orderItems.map((item) => (
                    <div key={item.id} className="p-3 flex justify-between">
                      <div>
                        <p className="font-medium">{item.menu_item_name}</p>
                        {item.notes && (
                          <p className="text-sm text-muted-foreground">{item.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {item.quantity}x R$ {item.price.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          R$ {(item.quantity * item.price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => sendWhatsAppToCustomer(selectedOrder)}
                  className="flex-1"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Enviar WhatsApp para Cliente
                </Button>
                <Button
                  onClick={() => notifyStoreWhatsApp(selectedOrder)}
                  variant="outline"
                  className="flex-1"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Notificar Loja
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pedidos;
