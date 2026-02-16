import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

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
          allData = [...allData, ...(data as Record<string, unknown>[])];
          from += pageSize;
          if (data.length < pageSize) hasMore = false;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exportar Dados</h1>
          <p className="text-muted-foreground">Exporte os dados do sistema em formato CSV.</p>
        </div>
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
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {loading[item.key] ? "Exportando..." : "Baixar CSV"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ExportarDados;
