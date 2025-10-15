import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UtensilsCrossed, FolderTree, TrendingUp, ShoppingBag, Volume2 } from "lucide-react";
import { usePermissions } from "@/contexts/PermissionsContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { playNotificationSound } from "@/utils/notificationSound";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";

interface Order {
  id: string;
  created_at: string;
  total: number;
  status: string;
  customers: {
    nome: string;
  } | null;
}

const Dashboard = () => {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    customers: 0,
    menuItems: 0,
    categories: 0,
    ordersToday: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [soundEnabled, setSoundEnabled] = useState(false);

  const fetchStats = async () => {
    try {
      const [customers, menuItems, categories, ordersToday] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("menu_items").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .gte("created_at", new Date().toISOString().split("T")[0]),
      ]);

      setStats({
        customers: customers.count || 0,
        menuItems: menuItems.count || 0,
        categories: categories.count || 0,
        ordersToday: ordersToday.count || 0,
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          total,
          status,
          customers (
            nome
          )
        `)
        .eq("status", "pendente")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentOrders(data || []);
    } catch (error) {
      console.error("Erro ao buscar pedidos recentes:", error);
    } finally {
      setLoading(false);
    }
  };

  const enableSound = async () => {
    try {
      // Tentar tocar som de teste
      playNotificationSound();
      
      // Salvar preferência
      localStorage.setItem('sound_enabled', 'true');
      setSoundEnabled(true);
      
      toast.success("✅ Notificações sonoras ativadas!");
    } catch (error) {
      toast.error("Erro ao ativar som. Verifique permissões do navegador.");
    }
  };

  useEffect(() => {
    // Verificar se som já foi habilitado antes
    const soundWasEnabled = localStorage.getItem('sound_enabled') === 'true';
    setSoundEnabled(soundWasEnabled);

    fetchStats();
    fetchRecentOrders();

    // Realtime para novos pedidos
    const channel = supabase
      .channel("dashboard-orders")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("🔔 Novo pedido recebido via Realtime:", payload);
          
          // Tocar som apenas se habilitado
          if (soundWasEnabled) {
            playNotificationSound();
          }
          
          toast.success("🔔 Novo pedido recebido!", {
            action: {
              label: "Ver Pedidos",
              onClick: () => navigate("/admin/pedidos"),
            },
          });
          
          fetchStats();
          fetchRecentOrders();
        }
      )
      .subscribe((status) => {
        console.log("Realtime status:", status);
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("error");
          toast.error("Erro ao conectar notificações em tempo real");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);
  
  return (
    <div className="space-y-6">
      {/* Banner de ativação de som */}
      {!soundEnabled && (
        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <Volume2 className="h-4 w-4" />
          <AlertTitle>Ative as Notificações Sonoras</AlertTitle>
          <AlertDescription className="flex items-center gap-4 flex-wrap">
            <span>Clique no botão para receber alertas sonoros quando novos pedidos entrarem.</span>
            <Button onClick={enableSound} size="sm" variant="default">
              🔔 Ativar Som
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Bem-vindo ao painel administrativo</p>
        </div>
        
        <div className="flex gap-2">
          {/* Badge de status */}
          <Badge variant={realtimeStatus === 'connected' ? 'default' : 'destructive'}>
            {realtimeStatus === 'connected' ? '🟢 Conectado' : '🔴 Desconectado'}
          </Badge>
          
          {/* Botão de teste */}
          {soundEnabled && (
            <Button onClick={playNotificationSound} size="sm" variant="outline">
              🔔 Testar Som
            </Button>
          )}
        </div>
      </div>

      {hasPermission('view_dashboard') && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.customers}</div>
                <p className="text-xs text-muted-foreground">Clientes cadastrados</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Itens no Cardápio</CardTitle>
                <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.menuItems}</div>
                <p className="text-xs text-muted-foreground">Produtos ativos</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categorias</CardTitle>
                <FolderTree className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.categories}</div>
                <p className="text-xs text-muted-foreground">Categorias criadas</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pedidos Hoje</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.ordersToday}</div>
                <p className="text-xs text-muted-foreground">Pedidos via WhatsApp</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Pedidos Pendentes
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin/pedidos")}
              >
                Ver Todos
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Carregando...</p>
              ) : recentOrders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum pedido pendente
                </p>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate("/admin/pedidos")}
                    >
                      <div>
                        <p className="font-medium">{order.customers?.nome || "Cliente"}</p>
                        <p className="text-sm text-muted-foreground">
                          #{order.id.slice(0, 8)} •{" "}
                          {new Date(order.created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">R$ {order.total.toFixed(2)}</p>
                        <Badge variant="default">Pendente</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo ao Sistema! 🎉</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Configure seu cardápio, adicione categorias e produtos para começar a receber pedidos pelo WhatsApp.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;