import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2, CheckCircle2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ExportTable {
  key: string;
  label: string;
  description: string;
  table: string;
}

const exportTables: ExportTable[] = [
  { key: "orders", label: "Pedidos", description: "Todos os pedidos realizados", table: "orders" },
  { key: "order_items", label: "Itens dos Pedidos", description: "Detalhes dos itens de cada pedido", table: "order_items" },
  { key: "customers", label: "Clientes", description: "Cadastro de clientes", table: "customers" },
  { key: "categories", label: "Categorias", description: "Categorias do cardápio", table: "categories" },
  { key: "menu_items", label: "Cardápio", description: "Itens do cardápio", table: "menu_items" },
  { key: "complement_groups", label: "Grupos de Complementos", description: "Grupos de complementos disponíveis", table: "complement_groups" },
  { key: "complement_options", label: "Opções de Complementos", description: "Opções dentro de cada grupo", table: "complement_options" },
  { key: "profiles", label: "Perfis / Usuários", description: "Perfis de usuários do sistema", table: "profiles" },
  { key: "delivery_neighborhoods", label: "Bairros de Entrega", description: "Bairros com taxas e pedidos mínimos", table: "delivery_neighborhoods" },
  { key: "audit_log", label: "Log de Auditoria", description: "Registro de ações no sistema", table: "audit_log" },
  { key: "order_status_history", label: "Histórico de Status", description: "Histórico de mudanças de status dos pedidos", table: "order_status_history" },
];

const schemaSQLs: { table: string; label: string; sql: string }[] = [
  {
    table: "categories", label: "Categorias",
    sql: `CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);`,
  },
  {
    table: "menu_items", label: "Cardápio",
    sql: `CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC NOT NULL,
  imagem TEXT,
  image_thumb_url TEXT,
  categoria_id UUID REFERENCES public.categories(id),
  destaque BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT now()
);`,
  },
  {
    table: "menu_item_images", label: "Imagens do Cardápio",
    sql: `CREATE TABLE public.menu_item_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id),
  image_url TEXT NOT NULL,
  image_thumb_url TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,
  },
  {
    table: "complement_groups", label: "Grupos de Complementos",
    sql: `CREATE TABLE public.complement_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);`,
  },
  {
    table: "complement_options", label: "Opções de Complementos",
    sql: `CREATE TABLE public.complement_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.complement_groups(id),
  nome TEXT NOT NULL,
  valor_adicional NUMERIC DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);`,
  },
  {
    table: "menu_item_complements", label: "Vínculos Item-Complemento",
    sql: `CREATE TABLE public.menu_item_complements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id),
  complement_group_id UUID NOT NULL REFERENCES public.complement_groups(id),
  created_at TIMESTAMPTZ DEFAULT now()
);`,
  },
  {
    table: "customers", label: "Clientes",
    sql: `CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  endereco TEXT,
  data_nascimento DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);`,
  },
  {
    table: "orders", label: "Pedidos",
    sql: `CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id),
  total NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  delivery_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);`,
  },
  {
    table: "order_items", label: "Itens dos Pedidos",
    sql: `CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  menu_item_id UUID REFERENCES public.menu_items(id),
  menu_item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);`,
  },
  {
    table: "order_status_history", label: "Histórico de Status",
    sql: `CREATE TABLE public.order_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  status TEXT NOT NULL,
  changed_by UUID,
  notes TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);`,
  },
  {
    table: "profiles", label: "Perfis / Usuários",
    sql: `CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'admin',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);`,
  },
  {
    table: "user_roles", label: "Roles de Usuários",
    sql: `CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'atendente', 'cozinha');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);`,
  },
  {
    table: "user_permissions", label: "Permissões de Usuários",
    sql: `CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  permission TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);`,
  },
  {
    table: "restaurant_config", label: "Configurações do Restaurante",
    sql: `CREATE TABLE public.restaurant_config (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  nome_restaurante TEXT NOT NULL DEFAULT 'Expresso Espetaria',
  endereco TEXT NOT NULL,
  whatsapp_oficial TEXT NOT NULL,
  tempo_entrega TEXT DEFAULT '30-40 min',
  status_funcionamento TEXT DEFAULT 'aberto',
  modo_atendimento TEXT DEFAULT 'entrega',
  horario_funcionamento JSONB,
  razao_social TEXT, cep TEXT, numero TEXT, bairro TEXT,
  cidade TEXT, estado TEXT, complemento TEXT, telefone TEXT,
  email TEXT, email_notificacao TEXT,
  facebook TEXT, instagram TEXT, youtube TEXT, twitter TEXT, site TEXT,
  logo_url TEXT,
  cor_primaria TEXT DEFAULT '#FF6B35',
  cor_secundaria TEXT DEFAULT '#F7931E',
  whatsapp_mensagem TEXT,
  habilitar_whatsapp BOOLEAN DEFAULT true,
  exibir_endereco BOOLEAN DEFAULT true,
  exibir_dados_publicos BOOLEAN DEFAULT true,
  aceitar_loja_fechada BOOLEAN DEFAULT false,
  valor_pedido_minimo NUMERIC DEFAULT 0,
  valor_frete_gratis NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);`,
  },
  {
    table: "delivery_neighborhoods", label: "Bairros de Entrega",
    sql: `CREATE TABLE public.delivery_neighborhoods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cidade TEXT DEFAULT 'Santo Antônio de Jesus',
  estado TEXT DEFAULT 'BA',
  taxa_entrega NUMERIC DEFAULT 0,
  pedido_minimo NUMERIC DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);`,
  },
  {
    table: "audit_log", label: "Log de Auditoria",
    sql: `CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);`,
  },
];

const fullSchemaSQL = schemaSQLs.map((s) => `-- ${s.label}\n${s.sql}`).join("\n\n");

function convertToCSV(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      const str = val === null || val === undefined ? "" : typeof val === "object" ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const ExportarDados = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [copiedTable, setCopiedTable] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleExport = async (item: ExportTable) => {
    setLoading((p) => ({ ...p, [item.key]: true }));
    setDone((p) => ({ ...p, [item.key]: false }));

    try {
      let allData: Record<string, unknown>[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await (supabase
          .from(item.table as any)
          .select("*")
          .range(from, from + pageSize - 1) as any);

        if (error) throw error;
        const rows: Record<string, unknown>[] = data || [];
        if (rows.length > 0) {
          allData = [...allData, ...rows];
          from += pageSize;
          if (rows.length < pageSize) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      if (allData.length === 0) {
        toast.info(`Nenhum registro encontrado em "${item.label}".`);
        return;
      }

      const csv = convertToCSV(allData);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `${item.key}_${date}.csv`);
      setDone((p) => ({ ...p, [item.key]: true }));
      toast.success(`${allData.length} registros exportados de "${item.label}".`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao exportar "${item.label}": ${err.message}`);
    } finally {
      setLoading((p) => ({ ...p, [item.key]: false }));
    }
  };

  const handleExportAll = async () => {
    for (const item of exportTables) {
      await handleExport(item);
    }
  };

  const handleCopySQL = (sql: string, key: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedTable(key);
    toast.success("SQL copiado!");
    setTimeout(() => setCopiedTable(null), 2000);
  };

  const handleCopyAllSQL = () => {
    navigator.clipboard.writeText(fullSchemaSQL);
    setCopiedAll(true);
    toast.success("SQL completo copiado!");
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exportar Dados</h1>
        <p className="text-muted-foreground">Exporte dados em CSV ou copie o SQL das tabelas para migração.</p>
      </div>

      <Tabs defaultValue="csv" className="w-full">
        <TabsList>
          <TabsTrigger value="csv">Exportar CSV</TabsTrigger>
          <TabsTrigger value="sql">SQL das Tabelas</TabsTrigger>
        </TabsList>

        <TabsContent value="csv" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={handleExportAll} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar Tudo
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {exportTables.map((item) => (
              <Card key={item.key}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{item.label}</CardTitle>
                  <CardDescription className="text-xs">{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    disabled={loading[item.key]}
                    onClick={() => handleExport(item)}
                  >
                    {loading[item.key] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : done[item.key] ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {loading[item.key] ? "Exportando..." : "Baixar CSV"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sql" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={handleCopyAllSQL} className="gap-2">
              {copiedAll ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedAll ? "Copiado!" : "Copiar Tudo"}
            </Button>
          </div>

          <div className="space-y-4">
            {schemaSQLs.map((item) => (
              <Card key={item.table}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{item.label}</CardTitle>
                    <CardDescription className="text-xs font-mono">{item.table}</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleCopySQL(item.sql, item.table)}
                  >
                    {copiedTable === item.table ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copiedTable === item.table ? "Copiado!" : "Copiar"}
                  </Button>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted rounded-md p-4 overflow-x-auto text-xs font-mono whitespace-pre-wrap">
                    {item.sql}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExportarDados;
