
# Cadastro opcional de cliente + Fidelidade + Cupons

## Princípio central

Pedido **sem cadastro continua funcionando exatamente como hoje** (zero fricção no checkout). O cadastro é uma escolha do cliente — quem quiser cashback/pontos/cupons cria conta; quem quiser só pedir, pede.

O programa de fidelidade tem 4 modos e **a empresa (admin) escolhe qual está ativo**:
- **Nenhum** — só cupons, sem cashback/pontos.
- **Cashback %** — cliente ganha X% do pedido em saldo, usa em pedidos futuros.
- **Pontos por real** — 1 ponto por R$ Y gasto, X pontos = desconto/brinde.
- **Cartão fidelidade** — a cada N pedidos, 1 item grátis (do cardápio, escolhido pelo admin).

Cupons são independentes do modo — sempre funcionam.

---

## Fluxo do cliente

### Quem NÃO quer cadastro
- Adiciona itens → checkout → digita nome/whatsapp/endereço → pedido criado. Igual hoje.
- No fim do checkout aparece uma faixa discreta: *"Quer ganhar 5% de cashback no próximo pedido? Criar conta em 30 segundos"* — botão opcional.

### Quem QUER cadastro
- Entrar/Cadastrar no header do cardápio → tela `/cliente/login`.
- Cadastro pede: nome, email, senha, whatsapp, data de nascimento (opcional mas necessária para cupom de aniversário). Endereço fica pro checkout.
- Ou entra com Google (nome + email vindos do Google; whatsapp e nascimento pedidos depois).
- Após login, header mostra "Olá, [Nome]" + link "Minha conta".

### Página "Minha conta" (`/cliente/conta`)
Abas:
- **Perfil**: nome, whatsapp, endereços salvos, data de nascimento.
- **Recompensas**: mostra o modo ativo (saldo cashback / pontos acumulados / N de M pedidos no cartão).
- **Meus cupons**: cupons disponíveis (código, desconto, validade).
- **Meus pedidos**: histórico com status e link de tracking.

### Checkout do cliente logado
- Endereço pré-preenchido (usa endereços salvos, permite adicionar novo).
- Campo "Aplicar cupom" — digita código, valida, mostra desconto.
- Se modo = cashback e cliente tem saldo: toggle "Usar R$ X,XX de cashback".
- Se modo = pontos e cliente tem pontos suficientes: toggle "Trocar X pontos por R$ Y".
- Se modo = cartão e cliente completou o cartão: automaticamente adiciona o item grátis.
- Ao concluir, sistema credita cashback/pontos/carimbo do pedido novo.

---

## Fluxo do admin

### Nova página `/admin/fidelidade`
- Radio de seleção do modo (nenhum / cashback / pontos / cartão).
- Campos condicionais:
  - Cashback: % (ex: 5), saldo mínimo para uso, validade em dias.
  - Pontos: real por ponto, pontos para R$ 1 de desconto.
  - Cartão: quantidade de pedidos, item grátis (select do cardápio), valor máximo do item grátis.
- Botão "Salvar" — grava em `restaurant_config`.

### Nova página `/admin/cupons`
- Lista de cupons com filtros (ativos, expirados, por tipo).
- Modal de criação/edição com:
  - Código (ex: `PROMO20`), descrição.
  - Tipo de desconto: % ou R$ fixo.
  - Valor mínimo de pedido.
  - Validade (data início/fim).
  - Uso único global / uso único por cliente / uso ilimitado.
  - **Gatilho**: manual, boas-vindas, aniversário, reengajamento.
  - Ativo (switch).
- Cupons de gatilho automático são gerados por Edge Functions programadas (cron):
  - **Boas-vindas**: criado quando cliente completa cadastro.
  - **Aniversário**: cron diário, envia via WhatsApp na semana do aniversário.
  - **Reengajamento**: cron semanal, cliente sem pedido há N dias (config) recebe cupom.

### Página `/admin/clientes` (evolução da atual)
- Nova coluna "Cadastrado" (badge verde/cinza).
- Nova aba "Contas cadastradas" com saldo/pontos/carimbos por cliente.
- Botão manual "Enviar cupom" abre modal para gerar cupom pontual para um cliente.

---

## Modelo de dados

### Alterações em tabelas existentes
- `customers`: adiciona `user_id UUID` (nullable, FK `auth.users`), `data_nascimento DATE`. Cliente anônimo continua tendo `user_id = null`; ao cadastrar, o registro existente com mesmo whatsapp é ligado.
- `restaurant_config`: adiciona `loyalty_mecanica`, `loyalty_cashback_percentual`, `loyalty_cashback_validade_dias`, `loyalty_pontos_por_real`, `loyalty_pontos_para_real`, `loyalty_cartao_pedidos`, `loyalty_cartao_item_id`, `loyalty_cartao_valor_max`, `reengajamento_dias_inativo`.
- `orders`: adiciona `user_id UUID` (nullable), `coupon_id UUID` (nullable), `desconto_cupom NUMERIC`, `desconto_cashback NUMERIC`, `desconto_pontos NUMERIC`, `cashback_ganho NUMERIC`, `pontos_ganhos INT`, `stamp_ganho BOOLEAN`.

### Tabelas novas
- `customer_loyalty` — 1 linha por user_id: `saldo_cashback`, `pontos`, `pedidos_cartao` (contador atual), `updated_at`.
- `coupons` — cadastro dos cupons.
- `coupon_redemptions` — histórico de uso (coupon_id, user_id, order_id, valor_desconto, redeemed_at).
- `customer_addresses` — endereços salvos por cliente logado.

### Segurança (RLS)
- Cliente logado só vê/edita: seu customer, seus loyalty, seus coupons (via `coupon_redemptions`), seus endereços, seus pedidos.
- Staff continua com acesso via `has_permission`.
- INSERT público em orders/customers continua (checkout anônimo). Se cliente estiver logado, pedido carrega `user_id` e políticas por `auth.uid()` funcionam junto.

---

## Auth do cliente (separada da auth de staff)

- Mesmo Supabase Auth (email/senha + Google via Lovable Cloud managed OAuth).
- Distinção: staff tem entrada em `user_roles`; cliente comum não tem. `ProtectedRoute` do admin continua exigindo role.
- Novo contexto `ClienteAuthContext` (leve, só sessão) usado no cardápio público.
- Trigger `handle_new_user` já cria `profiles` — vai criar também `customer_loyalty` se não existir e ligar `customers` por whatsapp quando fornecido.
- Email de confirmação: usar templates de auth do Lovable (opcional — depende do usuário querer ativar email de domínio próprio; sem isso, funciona com email padrão do Lovable).

---

## Edge Functions

- **`apply-coupon`**: valida código (validade, mínimo, uso), retorna desconto calculado. Chamada no checkout.
- **`redeem-loyalty`**: aplica cashback/pontos no pedido de forma atômica (evita dupla aplicação).
- **`birthday-coupons`** (cron diário): gera cupom + envia WhatsApp para aniversariantes da semana.
- **`reengagement-coupons`** (cron semanal): identifica clientes inativos, gera cupom + envia WhatsApp.
- **`award-loyalty`** (trigger via DB ou chamada pós-checkout): credita cashback/pontos/carimbo quando pedido muda pra "entregue".

---

## Entrega em fases

Faço tudo em sequência dentro da mesma execução, mas em fases para você validar:

1. **Fase 1 — Auth do cliente + cadastro opcional**
   - Migração: `user_id` em customers, `customer_addresses`, ajuste do trigger.
   - Google OAuth ativado (Lovable Cloud managed).
   - Páginas `/cliente/login`, `/cliente/cadastro`, `/cliente/conta` (abas Perfil e Pedidos).
   - Header do cardápio com "Entrar/Minha conta".
   - Checkout detecta se está logado e pré-preenche.

2. **Fase 2 — Cupons**
   - Migração: `coupons`, `coupon_redemptions`, campos em `orders`.
   - Página `/admin/cupons` (CRUD).
   - Edge Function `apply-coupon`.
   - Campo cupom no checkout + aba "Meus cupons".

3. **Fase 3 — Fidelidade configurável**
   - Migração: campos em `restaurant_config`, `customer_loyalty`, campos em `orders`.
   - Página `/admin/fidelidade`.
   - Edge Function `award-loyalty` + `redeem-loyalty`.
   - Aba "Recompensas" na conta do cliente + toggles no checkout.

4. **Fase 4 — Cupons automáticos**
   - Cron `birthday-coupons` (diário).
   - Cron `reengagement-coupons` (semanal).
   - Cupom de boas-vindas disparado no signup.
   - Nova sidebar admin: "Fidelidade" e "Cupons".

---

## Pontos que ficam de fora deste plano (podem virar V2)

- Notificação por email de cupom novo (só WhatsApp por enquanto, alinhado com o resto do app).
- Ranking/gamificação de clientes.
- Cupons condicionais complexos (só em bebidas, só sábado, etc.) — começamos com regras simples.
- Referral / indique um amigo.

---

## Observações

- Quando estiver em build, se você quiser email transacional próprio (ex: enviar cupom por email) precisamos configurar um domínio de email — posso guiar depois.
- Os cupons automáticos por WhatsApp usam link `wa.me` com mensagem pré-preenchida (sem custo). Envio massivo automático real (via WhatsApp Business API) seria integração paga separada.
- O admin poderá **desativar completamente** o programa (`loyalty_mecanica = 'none'` e desativar cupons) — nada quebra, sistema volta ao comportamento atual.
