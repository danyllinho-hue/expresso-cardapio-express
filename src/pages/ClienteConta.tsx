import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClienteAuth } from "@/contexts/ClienteAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, LogOut, Loader2, Gift, Ticket, User as UserIcon, ShoppingBag } from "lucide-react";

interface CustomerRow {
  id: string;
  nome: string;
  whatsapp: string;
  endereco: string | null;
  data_nascimento: string | null;
}

interface OrderRow {
  id: string;
  status: string;
  total: number;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  em_preparo: "Em preparo",
  saiu_entrega: "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const ClienteConta = () => {
  const navigate = useNavigate();
  const { user, isLoading, displayName, signOut } = useClienteAuth();
  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ nome: "", whatsapp: "", endereco: "", data_nascimento: "" });

  useEffect(() => {
    if (!isLoading && !user) navigate("/cliente/login");
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingData(true);
      const [{ data: c }, { data: o }] = await Promise.all([
        supabase.from("customers").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("orders").select("id,status,total,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);
      if (c) {
        setCustomer(c as CustomerRow);
        setForm({
          nome: c.nome ?? "",
          whatsapp: c.whatsapp ?? "",
          endereco: c.endereco ?? "",
          data_nascimento: c.data_nascimento ?? "",
        });
      } else {
        // No customer row yet — pre-fill from metadata
        const meta = user.user_metadata ?? {};
        setForm({
          nome: (meta.nome as string) || (meta.full_name as string) || "",
          whatsapp: (meta.whatsapp as string) || "",
          endereco: "",
          data_nascimento: (meta.data_nascimento as string) || "",
        });
      }
      setOrders((o ?? []) as OrderRow[]);
      setLoadingData(false);
    })();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      if (customer) {
        const { error } = await supabase
          .from("customers")
          .update({
            nome: form.nome,
            whatsapp: form.whatsapp,
            endereco: form.endereco || null,
            data_nascimento: form.data_nascimento || null,
          })
          .eq("id", customer.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("customers")
          .insert({
            user_id: user.id,
            nome: form.nome,
            whatsapp: form.whatsapp,
            endereco: form.endereco || null,
            data_nascimento: form.data_nascimento || null,
          })
          .select("*")
          .single();
        if (error) throw error;
        setCustomer(data as CustomerRow);
      }
      toast.success("Dados atualizados");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (isLoading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto max-w-3xl p-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="w-4 h-4" /> Voltar ao cardápio
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">Olá, {displayName || "cliente"}!</h1>
          <p className="text-muted-foreground">Gerencie sua conta e acompanhe seus pedidos.</p>
        </div>

        <Tabs defaultValue="perfil">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="perfil"><UserIcon className="w-4 h-4 mr-1" /> Perfil</TabsTrigger>
            <TabsTrigger value="pedidos"><ShoppingBag className="w-4 h-4 mr-1" /> Pedidos</TabsTrigger>
            <TabsTrigger value="recompensas"><Gift className="w-4 h-4 mr-1" /> Recompensas</TabsTrigger>
            <TabsTrigger value="cupons"><Ticket className="w-4 h-4 mr-1" /> Cupons</TabsTrigger>
          </TabsList>

          <TabsContent value="perfil">
            <Card>
              <CardHeader>
                <CardTitle>Seus dados</CardTitle>
                <CardDescription>Usamos para agilizar seus próximos pedidos.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} required placeholder="(75) 99999-9999" />
                  </div>
                  <div className="space-y-2">
                    <Label>Endereço padrão</Label>
                    <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Rua, número, bairro..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de nascimento</Label>
                    <Input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
                  </div>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pedidos">
            <Card>
              <CardHeader>
                <CardTitle>Meus pedidos</CardTitle>
                <CardDescription>Histórico dos seus pedidos realizados enquanto logado.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {orders.length === 0 && (
                  <p className="text-sm text-muted-foreground py-8 text-center">Você ainda não fez nenhum pedido logado.</p>
                )}
                {orders.map((o) => (
                  <Link key={o.id} to={`/pedido/${o.id}`} className="block border rounded-lg p-4 hover:bg-muted/40 transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Pedido #{o.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">{statusLabels[o.status] ?? o.status}</Badge>
                        <p className="text-sm font-semibold mt-1">R$ {Number(o.total).toFixed(2)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recompensas">
            <Card>
              <CardHeader>
                <CardTitle>Recompensas</CardTitle>
                <CardDescription>Programa de fidelidade em breve.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-10 text-muted-foreground">
                  <Gift className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>Ainda não temos programa de fidelidade ativo.</p>
                  <p className="text-xs mt-1">Assim que a loja habilitar, seu saldo aparecerá aqui.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cupons">
            <Card>
              <CardHeader>
                <CardTitle>Meus cupons</CardTitle>
                <CardDescription>Cupons disponíveis para usar no checkout.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-10 text-muted-foreground">
                  <Ticket className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>Nenhum cupom disponível no momento.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClienteConta;
