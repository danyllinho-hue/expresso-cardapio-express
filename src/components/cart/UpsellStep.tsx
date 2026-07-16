import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronLeft, Loader2, Plus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MenuItem {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string;
  destaque: boolean;
  categoria_id?: string;
}

interface Suggestion {
  item_id: string;
  motivo_curto: string;
  item?: MenuItem;
}

interface UpsellStepProps {
  cart: Array<{ item: MenuItem; quantity: number }>;
  onBack: () => void;
  onContinue: () => void;
  onAddItem: (item: MenuItem) => void;
}

export const UpsellStep = ({ cart, onBack, onContinue, onAddItem }: UpsellStepProps) => {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const payload = {
          cart: cart.map(c => ({ id: c.item.id, quantity: c.quantity })),
        };
        const { data, error } = await supabase.functions.invoke("suggest-upsell", { body: payload });
        if (cancelled) return;
        if (error || !data?.suggestions?.length) {
          onContinue();
          return;
        }
        // Fetch items
        const ids = data.suggestions.map((s: Suggestion) => s.item_id);
        const { data: items } = await supabase
          .from("menu_items")
          .select("id, nome, descricao, preco, imagem, destaque, categoria_id")
          .in("id", ids);
        const byId = new Map((items || []).map(i => [i.id, i as MenuItem]));
        const enriched = data.suggestions
          .map((s: Suggestion) => ({ ...s, item: byId.get(s.item_id) }))
          .filter((s: Suggestion) => s.item);
        if (enriched.length === 0) {
          onContinue();
          return;
        }
        setSuggestions(enriched);
      } catch {
        onContinue();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = (s: Suggestion) => {
    if (!s.item) return;
    onAddItem(s.item);
    setAdded(prev => new Set(prev).add(s.item_id));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Buscando sugestões pra você...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 text-primary">
          <Sparkles className="w-5 h-5" />
          <h3 className="text-xl font-bold">Que tal adicionar?</h3>
        </div>
        <p className="text-sm text-muted-foreground">Sugestões personalizadas pro seu pedido</p>
      </div>

      <div className="space-y-3">
        {suggestions.map((s) => {
          const isAdded = added.has(s.item_id);
          return (
            <div key={s.item_id} className="flex gap-3 p-3 rounded-lg border bg-card">
              {s.item?.imagem && (
                <img src={s.item.imagem} alt={s.item.nome} className="w-20 h-20 rounded-md object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{s.item?.nome}</div>
                <div className="inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  <Sparkles className="w-3 h-3" /> {s.motivo_curto}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-primary">R$ {s.item?.preco.toFixed(2)}</span>
                  <Button
                    size="sm"
                    variant={isAdded ? "secondary" : "default"}
                    onClick={() => handleAdd(s)}
                    disabled={isAdded}
                  >
                    {isAdded ? <><Check className="w-4 h-4 mr-1" /> Adicionado</> : <><Plus className="w-4 h-4 mr-1" /> Adicionar</>}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <Button onClick={onContinue} className="flex-1">
          Continuar
        </Button>
      </div>
    </div>
  );
};
