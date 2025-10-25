import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, MessageCircle, RefreshCw } from "lucide-react";
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

interface StatusHistory {
  id: string;
  status: string;
  changed_at: string;
  notes: string | null;
}

const Pedidos = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
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

  const fetchStatusHistory = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", orderId)
        .order("changed_at", { ascending: true });

      if (error) throw error;
      setStatusHistory(data || []);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, order: Order) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;
      
      toast.success(`Pedido atualizado para: ${getStatusLabel(newStatus)}`);
      
      // Abrir WhatsApp para notificar cliente
      if (newStatus !== 'cancelado') {
        notifyStatusChange(order, newStatus);
      }
      
      fetchOrders();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status do pedido");
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pendente: "Pendente",
      aprovado: "Aprovado",
      preparando: "Preparando",
      entregando: "Entregando",
      entregue: "Entregue",
      cancelado: "Cancelado",
    };
    return labels[status] || status;
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
    fetchStatusHistory(order.id);
    setDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pendente: "default",
      aprovado: "secondary",
      preparando: "secondary",
      entregando: "secondary",
      entregue: "secondary",
      cancelado: "destructive",
    };

    const labels: Record<string, string> = {
      pendente: "Pendente",
      aprovado: "Aprovado",
      preparando: "Preparando",
      entregando: "Entregando",
      entregue: "Entregue",
      cancelado: "Cancelado",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const ordersByStatus = {
    pendente: orders.filter(o => o.status === 'pendente'),
    aprovado: orders.filter(o => o.status === 'aprovado'),
    preparando: orders.filter(o => o.status === 'preparando'),
    entregando: orders.filter(o => o.status === 'entregando'),
    entregue: orders.filter(o => o.status === 'entregue'),
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

  const notifyStatusChange = (order: Order, newStatus: string) => {
    if (!order.customers) return;
    
    const phone = formatWhatsApp(order.customers.whatsapp);
    const trackingUrl = `${window.location.origin}/pedido/${order.id}`;
    
    const messages: Record<string, string> = {
      aprovado: `🍢 *PEDIDO APROVADO!*\n\nOlá *${order.customers.nome}*! Seu pedido #${order.id.slice(0, 8)} foi aprovado!\n\n🕒 Previsão: 30-40 min\n\nAcompanhe em tempo real:\n${trackingUrl}\n\n_Expresso Espetaria_ 🍢`,
      
      preparando: `👨‍🍳 *PEDIDO EM PRODUÇÃO!*\n\nOlá *${order.customers.nome}*! Seu pedido #${order.id.slice(0, 8)} está sendo preparado! 📦\n\nAcompanhe em tempo real:\n${trackingUrl}\n\n_Expresso Espetaria_ 🍢`,
      
      entregando: `🚚 *PEDIDO A CAMINHO!*\n\nOlá *${order.customers.nome}*! Seu pedido #${order.id.slice(0, 8)} saiu para entrega!\n\nAguarde o entregador no endereço:\n📍 ${order.delivery_address}\n\nAcompanhe:\n${trackingUrl}\n\n_Expresso Espetaria_ 🍢`,
      
      entregue: `✅ *PEDIDO ENTREGUE!*\n\nObrigado por escolher o Expresso Espetaria! 🍢\n\nPedido #${order.id.slice(0, 8)} foi entregue com sucesso.\n\nEsperamos que tenha gostado! Até a próxima! 😊`,
      
      cancelado: `❌ *PEDIDO CANCELADO*\n\nOlá *${order.customers.nome}*, infelizmente seu pedido #${order.id.slice(0, 8)} foi cancelado.\n\nPara mais informações, entre em contato:\n📞 (75) 99231-5312\n\n_Expresso Espetaria_ 🍢`
    };
    
    const message = messages[newStatus];
    if (message) {
      const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  const OrderCard = ({ order }: { order: Order }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-mono text-xs text-muted-foreground">
                #{order.id.slice(0, 8)}
              </p>
              <p className="font-semibold">{order.customers?.nome || "N/A"}</p>
            </div>
            <p className="font-bold text-lg">R$ {order.total.toFixed(2)}</p>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p className="truncate">{order.delivery_address}</p>
            <p className="text-xs mt-1">
              {new Date(order.created_at).toLocaleTimeString("pt-BR", { 
                hour: "2-digit", 
                minute: "2-digit" 
              })}
            </p>
          </div>

          {order.status === 'pendente' && (
            <div className="flex flex-col gap-2">
              <Button 
                size="sm" 
                className="w-full"
                onClick={() => updateOrderStatus(order.id, 'aprovado', order)}
              >
                ✅ APROVAR
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                className="w-full"
                onClick={() => updateOrderStatus(order.id, 'cancelado', order)}
              >
                ❌ CANCELAR
              </Button>
            </div>
          )}

          {order.status === 'aprovado' && (
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => updateOrderStatus(order.id, 'preparando', order)}
            >
              👨‍🍳 PRODUZIR
            </Button>
          )}

          {order.status === 'preparando' && (
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => updateOrderStatus(order.id, 'entregando', order)}
            >
              🚚 ENTREGAR
            </Button>
          )}

          {order.status === 'entregando' && (
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => updateOrderStatus(order.id, 'entregue', order)}
            >
              ✅ ENTREGUE
            </Button>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => openOrderDetails(order)}
            >
              <Eye className="h-3 w-3 mr-1" />
              Ver
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => sendWhatsAppToCustomer(order)}
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              WhatsApp
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
          <h2 className="text-3xl font-bold tracking-tight">Gestor de Pedidos</h2>
          <p className="text-muted-foreground">Gerencie todos os pedidos do Expresso</p>
        </div>
        <Button onClick={fetchOrders} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              Nenhum pedido encontrado
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Coluna PENDENTE */}
          <div className="space-y-3">
            <Card className="bg-orange-500 border-orange-600">
              <CardHeader className="p-3">
                <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  pendente ({ordersByStatus.pendente.length})
                </CardTitle>
              </CardHeader>
            </Card>
            <div className="space-y-3">
              {ordersByStatus.pendente.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">
                  Nenhum pedido pendente
                </p>
              ) : (
                ordersByStatus.pendente.map(order => <OrderCard key={order.id} order={order} />)
              )}
            </div>
          </div>

          {/* Coluna APROVADO */}
          <div className="space-y-3">
            <Card className="bg-purple-600 border-purple-700">
              <CardHeader className="p-3">
                <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  aprovados ({ordersByStatus.aprovado.length})
                </CardTitle>
              </CardHeader>
            </Card>
            <div className="space-y-3">
              {ordersByStatus.aprovado.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">
                  Nenhum pedido aprovado
                </p>
              ) : (
                ordersByStatus.aprovado.map(order => <OrderCard key={order.id} order={order} />)
              )}
            </div>
          </div>

          {/* Coluna PREPARANDO */}
          <div className="space-y-3">
            <Card className="bg-red-600 border-red-700">
              <CardHeader className="p-3">
                <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                  <span className="text-lg">👨‍🍳</span>
                  preparando ({ordersByStatus.preparando.length})
                </CardTitle>
              </CardHeader>
            </Card>
            <div className="space-y-3">
              {ordersByStatus.preparando.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">
                  Nenhum pedido sendo preparado
                </p>
              ) : (
                ordersByStatus.preparando.map(order => <OrderCard key={order.id} order={order} />)
              )}
            </div>
          </div>

          {/* Coluna ENTREGANDO */}
          <div className="space-y-3">
            <Card className="bg-blue-600 border-blue-700">
              <CardHeader className="p-3">
                <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                  <span className="text-lg">🚚</span>
                  entregando ({ordersByStatus.entregando.length})
                </CardTitle>
              </CardHeader>
            </Card>
            <div className="space-y-3">
              {ordersByStatus.entregando.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">
                  Nenhum pedido sendo enviado
                </p>
              ) : (
                ordersByStatus.entregando.map(order => <OrderCard key={order.id} order={order} />)
              )}
            </div>
          </div>

          {/* Coluna ENTREGUE */}
          <div className="space-y-3">
            <Card className="bg-green-600 border-green-700">
              <CardHeader className="p-3">
                <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  entregue ({ordersByStatus.entregue.length})
                </CardTitle>
              </CardHeader>
            </Card>
            <div className="space-y-3">
              {ordersByStatus.entregue.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">
                  Nenhum pedido entregue
                </p>
              ) : (
                ordersByStatus.entregue.map(order => <OrderCard key={order.id} order={order} />)
              )}
            </div>
          </div>
        </div>
      )}

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

              {statusHistory.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Histórico do Pedido</p>
                  <div className="border rounded-lg divide-y">
                    {statusHistory.map((history) => (
                      <div key={history.id} className="p-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{getStatusLabel(history.status)}</p>
                          {history.notes && (
                            <p className="text-sm text-muted-foreground">{history.notes}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          {new Date(history.changed_at).toLocaleString("pt-BR")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}


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
