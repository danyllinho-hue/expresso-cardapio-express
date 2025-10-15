import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, CheckCircle2, Clock, Package, Truck, XCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface OrderData {
  id: string;
  status: string;
  total: number;
  created_at: string;
  delivery_address: string;
  notes: string | null;
  customers: {
    nome: string;
    whatsapp: string;
  } | null;
  order_items: Array<{
    id: string;
    menu_item_name: string;
    quantity: number;
    price: number;
    notes: string | null;
  }>;
}

interface StatusHistory {
  id: string;
  status: string;
  changed_at: string;
  notes: string | null;
}

const statusConfig = {
  pendente: {
    icon: Clock,
    label: "Pedido Recebido",
    color: "text-yellow-500",
    bgColor: "bg-yellow-100",
    description: "Aguardando confirmação",
  },
  em_preparo: {
    icon: Package,
    label: "Em Produção",
    color: "text-blue-500",
    bgColor: "bg-blue-100",
    description: "Seu pedido está sendo preparado",
  },
  enviado: {
    icon: Truck,
    label: "Saiu para Entrega",
    color: "text-purple-500",
    bgColor: "bg-purple-100",
    description: "Pedido a caminho",
  },
  concluido: {
    icon: CheckCircle2,
    label: "Pedido Concluído",
    color: "text-green-500",
    bgColor: "bg-green-100",
    description: "Pedido entregue com sucesso",
  },
  cancelado: {
    icon: XCircle,
    label: "Pedido Cancelado",
    color: "text-red-500",
    bgColor: "bg-red-100",
    description: "Pedido cancelado",
  },
};

const OrderTracking = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchOrder = async () => {
    if (!orderId) return;

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          customers (
            nome,
            whatsapp
          ),
          order_items (
            id,
            menu_item_name,
            quantity,
            price,
            notes
          )
        `)
        .eq("id", orderId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        setError(true);
        toast.error("Pedido não encontrado");
        return;
      }

      setOrderData(data as OrderData);
      fetchStatusHistory();
    } catch (error) {
      console.error("Erro ao buscar pedido:", error);
      setError(true);
      toast.error("Erro ao carregar pedido");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatusHistory = async () => {
    if (!orderId) return;

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

  useEffect(() => {
    fetchOrder();

    // Escutar mudanças no pedido em tempo real
    const orderChannel = supabase
      .channel(`order-tracking-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          console.log("✅ Status atualizado:", payload.new.status);
          setOrderData((prev) => 
            prev ? { ...prev, status: payload.new.status as string } : null
          );
          
          const config = statusConfig[payload.new.status as keyof typeof statusConfig];
          if (config) {
            toast.success(`Pedido atualizado: ${config.label}`);
          }
        }
      )
      .subscribe();

    // Escutar mudanças no histórico
    const historyChannel = supabase
      .channel(`order-history-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_status_history",
          filter: `order_id=eq.${orderId}`,
        },
        () => {
          fetchStatusHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(historyChannel);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-2xl font-bold">Pedido não encontrado</h2>
            <p className="text-muted-foreground">
              Não foi possível encontrar este pedido. Verifique o link e tente novamente.
            </p>
            <Button onClick={() => window.location.href = "/"}>
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStatus = statusConfig[orderData.status as keyof typeof statusConfig];
  const CurrentIcon = currentStatus?.icon || Clock;

  const statusOrder = ["pendente", "em_preparo", "enviado", "concluido"];
  const currentIndex = statusOrder.indexOf(orderData.status);
  const isCancelled = orderData.status === "cancelado";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">🍢 Expresso Espetaria</h1>
              <p className="text-sm text-muted-foreground">Acompanhe seu pedido</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOrder}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Order ID */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Pedido</p>
              <p className="text-2xl font-mono font-bold">#{orderData.id.slice(0, 8)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Status Atual */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`${currentStatus?.bgColor} p-4 rounded-full`}>
                <CurrentIcon className={`h-12 w-12 ${currentStatus?.color}`} />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">{currentStatus?.label}</h2>
                <p className="text-muted-foreground">{currentStatus?.description}</p>
              </div>
              {!isCancelled && orderData.status !== "concluido" && (
                <p className="text-sm text-muted-foreground">
                  🕒 Previsão de entrega: 30-40 minutos
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timeline de Status */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Progresso do Pedido</h3>
            <div className="space-y-4">
              {isCancelled ? (
                <div className="flex items-center gap-4 p-4 bg-destructive/10 rounded-lg">
                  <XCircle className="h-8 w-8 text-destructive flex-shrink-0" />
                  <div>
                    <p className="font-medium text-destructive">Pedido Cancelado</p>
                    <p className="text-sm text-muted-foreground">
                      Entre em contato para mais informações: (75) 99231-5312
                    </p>
                  </div>
                </div>
              ) : (
                statusOrder.map((status, index) => {
                  const config = statusConfig[status as keyof typeof statusConfig];
                  const StatusIcon = config.icon;
                  const isCompleted = index <= currentIndex;
                  const isCurrent = index === currentIndex;
                  const historyItem = statusHistory.find((h) => h.status === status);

                  return (
                    <div key={status} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`${
                            isCompleted ? config.bgColor : "bg-muted"
                          } p-2 rounded-full transition-colors`}
                        >
                          <StatusIcon
                            className={`h-5 w-5 ${
                              isCompleted ? config.color : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        {index < statusOrder.length - 1 && (
                          <div
                            className={`w-0.5 h-12 ${
                              isCompleted ? "bg-primary" : "bg-muted"
                            } transition-colors`}
                          />
                        )}
                      </div>
                      <div className="flex-1 pb-8">
                        <p
                          className={`font-medium ${
                            isCurrent ? "text-primary" : ""
                          }`}
                        >
                          {config.label}
                        </p>
                        {historyItem ? (
                          <p className="text-sm text-muted-foreground">
                            {new Date(historyItem.changed_at).toLocaleString("pt-BR")}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {isCompleted ? "Concluído" : "Aguardando..."}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detalhes do Pedido */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold">Detalhes do Pedido</h3>
            
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-primary">
                R$ {orderData.total.toFixed(2)}
              </p>
            </div>

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground mb-2">Endereço de Entrega</p>
              <p className="font-medium">📍 {orderData.delivery_address}</p>
            </div>

            {orderData.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Observações</p>
                  <p className="font-medium">{orderData.notes}</p>
                </div>
              </>
            )}

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground mb-3">Itens do Pedido</p>
              <div className="space-y-3">
                {orderData.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">
                        {item.quantity}x {item.menu_item_name}
                      </p>
                      {item.notes && (
                        <p className="text-sm text-muted-foreground">Obs: {item.notes}</p>
                      )}
                    </div>
                    <p className="font-medium">
                      R$ {(item.quantity * item.price).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardContent className="pt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Dúvidas sobre seu pedido?</p>
            <Button
              variant="outline"
              onClick={() => window.open("https://wa.me/5575992315312", "_blank")}
            >
              Entre em contato via WhatsApp
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default OrderTracking;
