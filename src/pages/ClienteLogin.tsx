import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { z } from "zod";

const cadastroSchema = z.object({
  nome: z.string().trim().min(3, "Nome muito curto").max(100, "Nome muito longo"),
  email: z.string().trim().email("Email inválido").max(255),
  senha: z.string().min(8, "Mínimo 8 caracteres").max(72),
  whatsapp: z
    .string()
    .regex(/^(\+?55)?[\s-]?\(?\d{2}\)?[\s-]?9?\d{4}[\s-]?\d{4}$/, "WhatsApp inválido"),
  data_nascimento: z.string().optional().or(z.literal("")),
});

const ClienteLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"entrar" | "cadastrar">("entrar");

  // login
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  // cadastro
  const [cadNome, setCadNome] = useState("");
  const [cadEmail, setCadEmail] = useState("");
  const [cadSenha, setCadSenha] = useState("");
  const [cadWhats, setCadWhats] = useState("");
  const [cadNasc, setCadNasc] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/cliente/conta");
    });
  }, [navigate]);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Não foi possível entrar com Google");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate("/cliente/conta");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao entrar com Google");
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Email ou senha incorretos" : error.message);
      return;
    }
    toast.success("Bem-vindo de volta!");
    navigate("/cliente/conta");
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = cadastroSchema.safeParse({
      nome: cadNome,
      email: cadEmail,
      senha: cadSenha,
      whatsapp: cadWhats,
      data_nascimento: cadNasc,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: cadEmail,
      password: cadSenha,
      options: {
        data: {
          nome: cadNome,
          whatsapp: cadWhats,
          data_nascimento: cadNasc || null,
        },
        emailRedirectTo: `${window.location.origin}/cliente/conta`,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message.includes("already") ? "Este email já está cadastrado" : error.message);
      return;
    }
    toast.success("Cadastro criado! Verifique seu email para confirmar.");
    setTab("entrar");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-2 self-start">
            <ArrowLeft className="w-3 h-3" /> Voltar ao cardápio
          </Link>
          <CardTitle className="text-2xl">Minha conta</CardTitle>
          <CardDescription>
            Cadastre-se para ganhar cashback, cupons e acompanhar seus pedidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "entrar" | "cadastrar")}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="entrar">Entrar</TabsTrigger>
              <TabsTrigger value="cadastrar">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="entrar">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Input id="senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} disabled={loading} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="cadastrar">
              <form onSubmit={handleCadastro} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cadNome">Nome completo</Label>
                  <Input id="cadNome" required value={cadNome} onChange={(e) => setCadNome(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cadEmail">Email</Label>
                  <Input id="cadEmail" type="email" required value={cadEmail} onChange={(e) => setCadEmail(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cadWhats">WhatsApp</Label>
                  <Input id="cadWhats" type="tel" required placeholder="(75) 99999-9999" value={cadWhats} onChange={(e) => setCadWhats(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cadNasc">Data de nascimento (opcional)</Label>
                  <Input id="cadNasc" type="date" value={cadNasc} onChange={(e) => setCadNasc(e.target.value)} disabled={loading} />
                  <p className="text-xs text-muted-foreground">Ganhe um cupom especial no seu aniversário</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cadSenha">Senha</Label>
                  <Input id="cadSenha" type="password" required minLength={8} value={cadSenha} onChange={(e) => setCadSenha(e.target.value)} disabled={loading} />
                  <p className="text-xs text-muted-foreground">Mínimo 8 caracteres</p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continuar com Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClienteLogin;
