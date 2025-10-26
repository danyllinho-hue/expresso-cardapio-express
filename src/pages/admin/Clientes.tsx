import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, RefreshCw, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Customer {
  id: string;
  nome: string;
  whatsapp: string;
  endereco: string | null;
  data_nascimento: string | null;
  created_at: string;
}

interface Order {
  id: string;
  created_at: string;
  total: number;
  status: string;
}

interface CustomerWithStats extends Customer {
  total_gasto: number;
  total_pedidos: number;
  ultima_compra: string | null;
  dias_sem_comprar: number | null;
}

const Clientes = () => {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (customersError) throw customersError;

      // Buscar estatísticas de cada cliente
      const customersWithStats = await Promise.all(
        (customersData || []).map(async (customer) => {
          const { data: orders } = await supabase
            .from("orders")
            .select("id, created_at, total, status")
            .eq("customer_id", customer.id)
            .order("created_at", { ascending: false });

          const totalGasto = orders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
          const totalPedidos = orders?.length || 0;
          const ultimaCompra = orders?.[0]?.created_at || null;
          
          let diasSemComprar = null;
          if (ultimaCompra) {
            const diffTime = Math.abs(new Date().getTime() - new Date(ultimaCompra).getTime());
            diasSemComprar = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }

          return {
            ...customer,
            total_gasto: totalGasto,
            total_pedidos: totalPedidos,
            ultima_compra: ultimaCompra,
            dias_sem_comprar: diasSemComprar,
          };
        })
      );

      setCustomers(customersWithStats);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerOrders = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomerOrders(data || []);
    } catch (error) {
      console.error("Erro ao buscar pedidos do cliente:", error);
      toast.error("Erro ao carregar histórico de pedidos");
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openCustomerDetails = (customer: CustomerWithStats) => {
    setSelectedCustomer(customer);
    fetchCustomerOrders(customer.id);
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("pt-BR");
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
          <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
          <p className="text-muted-foreground">Gerencie todos os clientes do Expresso</p>
        </div>
        <Button onClick={fetchCustomers} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              Nenhum cliente encontrado
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead className="text-center">Total Pedidos</TableHead>
                  <TableHead className="text-right">Total Gasto</TableHead>
                  <TableHead className="text-center">Última Compra</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {customer.nome}
                      </div>
                    </TableCell>
                    <TableCell>{customer.whatsapp}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {customer.endereco || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{customer.total_pedidos}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      R$ {customer.total_gasto.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {customer.ultima_compra
                        ? formatDate(customer.ultima_compra)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openCustomerDetails(customer)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Detalhes do Cliente */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              {/* Informações do Cliente */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Nome</p>
                    <p className="text-base font-semibold">{selectedCustomer.nome}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                    <p className="text-base">{selectedCustomer.whatsapp}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Endereço</p>
                    <p className="text-base">{selectedCustomer.endereco || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Data de Nascimento</p>
                    <p className="text-base">
                      {selectedCustomer.data_nascimento
                        ? formatDate(selectedCustomer.data_nascimento)
                        : "—"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Estatísticas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Gasto
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      R$ {selectedCustomer.total_gasto.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total de Pedidos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{selectedCustomer.total_pedidos}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Última Compra
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base font-semibold">
                      {selectedCustomer.ultima_compra
                        ? formatDate(selectedCustomer.ultima_compra)
                        : "—"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Tempo sem Comprar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {selectedCustomer.dias_sem_comprar !== null
                        ? `${selectedCustomer.dias_sem_comprar} ${
                            selectedCustomer.dias_sem_comprar === 1 ? "dia" : "dias"
                          }`
                        : "—"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Histórico de Pedidos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Histórico de Pedidos</CardTitle>
                </CardHeader>
                <CardContent>
                  {customerOrders.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum pedido encontrado
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-xs">
                              #{order.id.slice(0, 8)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDateTime(order.created_at)}
                            </TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell className="text-right font-semibold">
                              R$ {Number(order.total).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clientes;
