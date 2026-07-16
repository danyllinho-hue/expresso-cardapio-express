import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface CartItem { id: string; quantity: number; }

const CACHE_TTL_MIN = 10;

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { cart } = await req.json() as { cart: CartItem[] };
    if (!Array.isArray(cart) || cart.length === 0) {
      return Response.json({ suggestions: [] }, { headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Cart signature (deterministic)
    const signature = await sha256(
      cart.map(c => `${c.id}x${c.quantity}`).sort().join('|')
    );

    // Check cache
    const { data: cached } = await supabase
      .from('upsell_suggestions_cache')
      .select('suggestions, created_at')
      .eq('cart_signature', signature)
      .maybeSingle();

    if (cached) {
      const ageMin = (Date.now() - new Date(cached.created_at).getTime()) / 60000;
      if (ageMin < CACHE_TTL_MIN) {
        return Response.json({ suggestions: cached.suggestions, cached: true }, { headers: corsHeaders });
      }
    }

    // Load catalog
    const { data: allItems } = await supabase
      .from('menu_items')
      .select('id, nome, descricao, preco, custo_cmv, tipo_item, combina_com')
      .eq('status', 'ativo');

    if (!allItems) return Response.json({ suggestions: [] }, { headers: corsHeaders });

    const cartIds = new Set(cart.map(c => c.id));
    const cartItems = allItems.filter(i => cartIds.has(i.id));
    const candidates = allItems.filter(i => !cartIds.has(i.id));

    if (candidates.length === 0) return Response.json({ suggestions: [] }, { headers: corsHeaders });

    const prompt = `Você é um especialista em upsell de restaurantes. Analise o carrinho do cliente e sugira de 2 a 4 itens do catálogo que combinem melhor.

CARRINHO ATUAL:
${cartItems.map(i => `- ${i.nome} (tipo: ${i.tipo_item ?? 'não classificado'}, tags: [${(i.combina_com ?? []).join(', ')}])`).join('\n')}

CATÁLOGO DISPONÍVEL (não repetir itens do carrinho):
${candidates.map(i => `[${i.id}] ${i.nome} - R$${i.preco} - tipo: ${i.tipo_item ?? '?'} - tags: [${(i.combina_com ?? []).join(', ')}]${i.custo_cmv ? ` - margem: ${(((i.preco - i.custo_cmv) / i.preco) * 100).toFixed(0)}%` : ''}`).join('\n')}

REGRAS:
1. Priorize itens cujas tags casem com o que já está no carrinho (ex: acompanhamentos combinam com principais).
2. Se o carrinho não tem bebida, quase sempre sugira uma.
3. Em caso de empate na complementaridade, prefira itens de MAIOR margem.
4. Motivo curto (máx 40 caracteres), amigável, em português. Ex: "Combina com espetinho", "Refresca o paladar".
5. Retorne SOMENTE JSON válido no formato: {"suggestions":[{"item_id":"uuid","motivo_curto":"texto"}]}
6. Entre 2 e 4 sugestões. Use exatamente os IDs entre colchetes do catálogo.`;

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return Response.json({ suggestions: [] }, { headers: corsHeaders });

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3.5-flash',
        messages: [
          { role: 'system', content: 'Você retorna somente JSON válido, sem markdown.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!aiResp.ok) {
      console.error('AI gateway error', aiResp.status, await aiResp.text());
      return Response.json({ suggestions: [] }, { headers: corsHeaders });
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content ?? '{}';
    let parsed: { suggestions?: Array<{ item_id: string; motivo_curto: string }> } = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    const validIds = new Set(candidates.map(i => i.id));
    const suggestions = (parsed.suggestions ?? [])
      .filter(s => s?.item_id && validIds.has(s.item_id))
      .slice(0, 4);

    // Save cache (upsert)
    await supabase.from('upsell_suggestions_cache').upsert({
      cart_signature: signature,
      suggestions,
      created_at: new Date().toISOString(),
    });

    return Response.json({ suggestions }, { headers: corsHeaders });
  } catch (err) {
    console.error('suggest-upsell error', err);
    return Response.json({ suggestions: [] }, { headers: corsHeaders });
  }
});
