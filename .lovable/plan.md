
# Upsell inteligente com IA entre carrinho e checkout

## O que vai ser construído

Uma nova etapa **"✨ Que tal adicionar?"** entre o carrinho e o formulário de checkout. A cada vez que o cliente clica em "Continuar para Pagamento", uma IA analisa o carrinho atual e gera de 2 a 4 sugestões personalizadas (com foto, nome, preço e uma frase curta explicando *por que* combina). O cliente pode adicionar com 1 clique ou pular.

A IA usa **CMV** (para priorizar itens de maior margem) e **tags de combinação** (para saber que farofa/aipim/tropeiro combinam com espetinho, refri combina com porção, etc.) cadastradas pelo admin no cardápio.

## Minha sugestão para "quantidade e regras" (você não escolheu)

**Regra híbrida — o melhor dos 3 mundos:**
- IA retorna **2 a 4 sugestões** (ela decide conforme o carrinho: carrinho pequeno = menos, carrinho grande = mais).
- **Nunca sugere item já no carrinho**.
- **Prioriza margem alta** (CMV baixo) *em caso de empate* na complementaridade.
- **Tenta cobrir categorias faltantes** (se o carrinho não tem bebida, quase sempre sugere uma).
- Se o subtotal for muito baixo (< R$ 15), pula a página inteira (upsell tem retorno ruim em ticket pequeno) e vai direto pro checkout.

Se você preferir outra regra, é só ajustar antes de aprovar.

## Etapas de implementação

### 1. Alterações no banco de dados

**Adicionar em `menu_items`:**
- `custo_cmv` (NUMERIC, opcional) — custo do item para cálculo de margem.
- `tipo_item` (ENUM: `principal`, `acompanhamento`, `bebida`, `sobremesa`, `extra`) — para a IA saber a função de cada item.
- `combina_com` (TEXT[]) — tags livres tipo `["espetinho", "carne", "porcao"]` que ajudam a IA a casar itens. Ex: farofa teria `combina_com = ["espetinho", "carne"]`.

**Nova tabela `upsell_suggestions_cache`:**
- `cart_signature` (TEXT, hash SHA-256 dos IDs+quantidades do carrinho ordenados) — chave de cache.
- `suggestions` (JSONB) — resposta da IA.
- `created_at` — TTL de 10 minutos (a cada acesso, ignoramos se `created_at < now() - 10min`).
- Cache serve para **todos** os clientes: se 2 pessoas montam o mesmo carrinho em 10 min, IA roda 1 vez só. Corta ~70% do custo.
- Sem RLS restritiva (leitura pública, escrita via edge function com service_role).

**Adicionar em `restaurant_config`:**
- `upsell_ai_enabled` (BOOLEAN, default true) — admin pode desligar a página inteira.
- `upsell_min_subtotal` (NUMERIC, default 15) — abaixo disso pula.

### 2. Edge Function `suggest-upsell`

Recebe o carrinho atual, retorna sugestões:

1. Calcula `cart_signature` (hash dos itens+quantidades).
2. Consulta cache — se hit válido, retorna direto.
3. Se miss: busca todos os `menu_items` ativos (nome, descrição, preço, cmv, tipo_item, combina_com), remove os que já estão no carrinho.
4. Monta prompt para a IA (Lovable AI Gateway, modelo `google/gemini-3.5-flash` — rápido e barato) com:
   - Itens no carrinho (nome + tipo + tags).
   - Catálogo restante (nome + tipo + tags + preço + cmv se houver).
   - Instrução: retornar JSON estruturado `[{ item_id, motivo_curto }]` de 2 a 4 itens, priorizando complementaridade primeiro e margem em caso de empate.
5. Usa AI SDK com `Output.object` + Zod para forçar JSON válido.
6. Grava resposta no cache e retorna.

Trata erros do gateway (429/402) devolvendo array vazio → o front simplesmente pula a página.

### 3. Frontend

**Novo componente `UpsellStep.tsx`:**
- Aparece após clicar "Continuar para Pagamento" no `CartSheet` (substitui o pulo direto pro `CheckoutForm`).
- Ao abrir, chama `suggest-upsell` (loading com skeleton por ~1-2s).
- Renderiza cards em grid 2 colunas: foto, nome, preço, **badge com o "motivo" da IA** (ex: *"Combina perfeito com seu espetinho"*), botão **"+ Adicionar"**.
- Botões finais: **"Continuar sem adicionar"** (pula) e **"Adicionar selecionados"** (aplica os que o cliente marcou).
- Se IA retornar vazio ou subtotal < mínimo configurado → pula direto para o checkout, sem UI intermediária.

**Ajuste no `CartSheet.tsx`:**
- Nova state `step: 'cart' | 'upsell' | 'checkout'`.
- Fluxo: `cart` → `upsell` → `checkout`.
- Botão "Voltar" em cada etapa.

### 4. Admin — cadastro dos novos campos

**Página `/admin/cardapio` (edição de item):**
- Novo campo **CMV (R$)** — opcional, com tooltip explicando "Usado pela IA de sugestões para priorizar itens de maior margem".
- Novo select **Tipo do item** — principal / acompanhamento / bebida / sobremesa / extra.
- Novo campo **Tags de combinação** — input de tags livre (chips estilo `["espetinho", "carne"]`).

**Página `/admin/configuracoes`:**
- Toggle **"Ativar página de sugestões IA no checkout"**.
- Input **"Subtotal mínimo para mostrar sugestões (R$)"**.

## Detalhes técnicos

- **Modelo IA**: `google/gemini-3.5-flash` (Lovable AI Gateway) — sub-segundo de latência, custo baixíssimo, ótimo para JSON estruturado curto.
- **Output estruturado**: AI SDK `Output.object` com schema Zod pequeno (`{ suggestions: [{item_id, motivo_curto}] }`, sem `.min/.max/enum` grande — regras vão no prompt).
- **Cache signature**: `sha256(sorted(item_id + "x" + qty).join("|"))` — determinístico, ignora ordem de adição.
- **Fallback silencioso**: qualquer erro (gateway, timeout > 5s, JSON inválido) → pula para checkout. O cliente nunca vê erro.
- **RLS**: `upsell_suggestions_cache` com GRANT SELECT anon (leitura pública, IDs não sensíveis) e escrita restrita ao service_role da edge function.
- **Custo estimado**: com cache 10min + gemini-flash, ~R$ 0,001 por carrinho único. Praticamente irrelevante mesmo em alto volume.

## O que fica fora (pode virar V2)

- Aprendizado com base em pedidos passados (o que outros clientes com carrinhos parecidos pediram). Fica pra depois — começamos com IA "cold" usando só CMV+tags.
- A/B test automático (grupo controle sem sugestão para medir uplift).
- Sugestão de **combos** montados (2 itens juntos com desconto). Requer nova entidade de combos.
- Editar/gerar CMV em massa via CSV — por enquanto item-a-item.

## Ordem de execução

1. Migration (colunas em menu_items, tabela cache, colunas em restaurant_config) → aguarda aprovação.
2. Edge function `suggest-upsell`.
3. Admin: campos novos em cardápio e configurações.
4. Frontend: `UpsellStep` + integração no `CartSheet`.
5. Teste manual: montar carrinho só com espetinho, verificar se IA sugere farofa/aipim.
