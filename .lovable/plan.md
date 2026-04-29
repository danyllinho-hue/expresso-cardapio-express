
# Mega Prompt — Recriar o Cardápio Expresso em outra conta Lovable

Abaixo está o prompt único e completo. Na nova conta Lovable, **crie um projeto novo, ative o Lovable Cloud** e cole o texto entre as linhas `===` como primeira mensagem. O Lovable vai pedir aprovação das migrations — aceite todas.

> Observação: o bucket de imagens (`cardapio-images`) será recriado, mas as **imagens dos produtos não vêm junto** (são arquivos do storage da conta antiga). Depois do app pronto, faça novo upload pelo painel admin. O mesmo vale para usuários — você criará o primeiro admin manualmente após o signup.

---

## Prompt para colar na nova conta

```
============================================================
Quero que você construa um sistema completo de Cardápio Digital
para delivery de espetinhos chamado "Cardápio Expresso / Expresso
Espetaria". O projeto deve usar React + Vite + TypeScript + Tailwind
+ shadcn/ui e Lovable Cloud (Supabase) como backend. Implemente
EXATAMENTE as funcionalidades, tabelas, políticas RLS e telas
descritas abaixo. Não simplifique. Faça em fases dentro desta
mesma execução, criando todas as migrations necessárias.

============================================================
1) IDENTIDADE VISUAL
============================================================
- Nome: "Cardápio Expresso" (Expresso Espetaria)
- Segmento: espetinhos / delivery
- Cores principais (HSL no index.css e tailwind.config.ts):
  - primary  = #FF6B35 (laranja vibrante)
  - secondary= #F7931E (laranja claro)
- Tema claro como padrão, suporte a dark mode opcional.
- Use design system com tokens semânticos (NUNCA cores hardcoded
  nos componentes — sempre via CSS variables do index.css).
- Fonte moderna sans-serif. Botões com sombra sutil e hover suave.

============================================================
2) BANCO DE DADOS (Lovable Cloud) — CRIE TODAS ESTAS TABELAS
============================================================
Crie um enum app_role e a função has_role conforme o padrão de
segurança (roles em tabela separada, jamais em profiles).

-- ENUM
CREATE TYPE public.app_role AS ENUM ('admin','gerente','atendente','cozinha');

-- TABELAS
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'admin',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permission TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- permissões válidas: manage_orders, manage_menu_items,
-- manage_categories, manage_customers, manage_config,
-- manage_users

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC NOT NULL,
  imagem TEXT,
  image_thumb_url TEXT,
  categoria_id UUID REFERENCES public.categories(id),
  destaque BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.menu_item_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_thumb_url TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.complement_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'radio' ou 'checkbox'
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.complement_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.complement_groups(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  valor_adicional NUMERIC DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.menu_item_complements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  complement_group_id UUID NOT NULL REFERENCES public.complement_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  endereco TEXT,
  data_nascimento DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.delivery_neighborhoods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cidade TEXT DEFAULT 'Santo Antônio de Jesus',
  estado TEXT DEFAULT 'BA',
  taxa_entrega NUMERIC DEFAULT 0,
  pedido_minimo NUMERIC DEFAULT 0,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id),
  status TEXT NOT NULL DEFAULT 'pendente',
  -- valores: pendente, confirmado, em_preparo, saiu_entrega, entregue, cancelado
  total NUMERIC NOT NULL,
  delivery_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id),
  menu_item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.restaurant_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_restaurante TEXT NOT NULL DEFAULT 'Expresso Espetaria',
  razao_social TEXT,
  whatsapp_oficial TEXT NOT NULL DEFAULT '+5575992315312',
  whatsapp_mensagem TEXT DEFAULT 'Olá! Vim pelo Cardápio Digital...',
  habilitar_whatsapp BOOLEAN DEFAULT true,
  endereco TEXT NOT NULL DEFAULT 'Av. Luís Viana, 232, Centro – Santo Antônio de Jesus, BA',
  cep TEXT, numero TEXT, bairro TEXT, cidade TEXT, estado TEXT, complemento TEXT,
  telefone TEXT, email TEXT, site TEXT,
  facebook TEXT, instagram TEXT, youtube TEXT, twitter TEXT,
  email_notificacao TEXT,
  exibir_dados_publicos BOOLEAN DEFAULT true,
  exibir_endereco BOOLEAN DEFAULT true,
  logo_url TEXT,
  cor_primaria TEXT DEFAULT '#FF6B35',
  cor_secundaria TEXT DEFAULT '#F7931E',
  status_funcionamento TEXT DEFAULT 'aberto',
  modo_atendimento TEXT DEFAULT 'entrega',
  tempo_entrega TEXT DEFAULT '30–40 min',
  aceitar_loja_fechada BOOLEAN DEFAULT false,
  valor_pedido_minimo NUMERIC DEFAULT 0,
  valor_frete_gratis NUMERIC DEFAULT 0,
  horario_funcionamento JSONB DEFAULT '{"segunda":{"aberto":true,"inicio":"18:00","fim":"23:00"},"terca":{"aberto":true,"inicio":"18:00","fim":"23:00"},"quarta":{"aberto":true,"inicio":"18:00","fim":"23:00"},"quinta":{"aberto":true,"inicio":"18:00","fim":"23:00"},"sexta":{"aberto":true,"inicio":"18:00","fim":"23:00"},"sabado":{"aberto":true,"inicio":"18:00","fim":"23:00"},"domingo":{"aberto":true,"inicio":"18:00","fim":"23:00"}}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

============================================================
3) FUNÇÕES E TRIGGERS
============================================================
-- has_role (security definer, evita recursão em RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

-- has_permission (admin sempre passa)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id=_user_id AND permission=_permission
  ) OR public.has_role(_user_id,'admin')
$$;

-- handle_new_user: cria profile no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.profiles (id,email,tipo) VALUES (new.id,new.email,'user');
  RETURN new;
END; $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- log_order_status_change: registra histórico de status
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF (TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.order_status_history(order_id,status,changed_by,notes)
    VALUES (NEW.id,NEW.status,auth.uid(),'Status alterado');
  ELSIF (TG_OP='INSERT') THEN
    INSERT INTO public.order_status_history(order_id,status,changed_by,notes)
    VALUES (NEW.id,NEW.status,NULL,'Pedido criado');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER orders_status_history
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

============================================================
4) RLS — ATIVE EM TODAS AS TABELAS E APLIQUE:
============================================================
- categories, menu_items, menu_item_images, complement_groups,
  complement_options, menu_item_complements, delivery_neighborhoods:
  SELECT público (true / ativo=true), ALL para has_permission
  ('manage_categories' ou 'manage_menu_items' ou 'manage_config').
- customers: INSERT público (true); SELECT/ALL para
  has_permission('manage_customers').
- orders: INSERT público (true); SELECT/ALL para
  has_permission('manage_orders').
- order_items: INSERT público; SELECT/ALL has_permission('manage_orders').
- order_status_history: SELECT/INSERT has_permission('manage_orders').
- profiles: SELECT próprio (auth.uid()=id) + admins veem tudo;
  UPDATE/DELETE só admin.
- user_roles e user_permissions: SELECT próprio; ALL para admin
  (com check que permite criar primeiro admin se não houver nenhum).
- audit_log: SELECT só admin.
- restaurant_config: SELECT/ALL has_permission('manage_config').
  (Crie ainda uma policy pública para SELECT dos campos visuais
  necessários ao cardápio público — nome, logo, cores, status,
  endereço quando exibir_dados_publicos=true.)

============================================================
5) STORAGE
============================================================
Crie bucket público "cardapio-images" e policies que permitam
INSERT/UPDATE/DELETE para usuários autenticados com permissão
'manage_menu_items', e SELECT público.

============================================================
6) DADOS DE EXEMPLO (SEED)
============================================================
Insira 1 linha em restaurant_config (com os defaults acima).
Insira categorias: "Espetinhos", "Bebidas", "Acompanhamentos",
"Sobremesas". Insira 6 itens de exemplo (espetinho de carne R$8,
de frango R$8, de coração R$9, refrigerante lata R$6, farofa R$5,
pudim R$8) ligados às categorias. Insira 3 bairros de entrega
(Centro taxa 5, São Cristóvão taxa 7, Andaiá taxa 8 — pedido
mínimo 0). Insira um grupo de complementos "Ponto da carne"
(radio, obrigatório) com opções: mal passado, ao ponto, bem
passado.

============================================================
7) AUTENTICAÇÃO
============================================================
- Email/senha (sem confirmação automática de email — usuário
  precisa confirmar). NÃO usar login anônimo.
- Adicionar Google OAuth.
- Página /login com formulário de login e cadastro (Zod validation).
- Página /setup que aparece se NÃO houver nenhum admin no banco:
  permite o primeiro usuário se promover a admin (verifica
  ausência de roles 'admin' antes).
- Componente ProtectedRoute que checa sessão + permissões.
- Contexto PermissionsContext que carrega user_roles e
  user_permissions ao logar.

============================================================
8) ESTRUTURA DE ROTAS
============================================================
Públicas:
  /                 → cardápio público (home)
  /pedido/:id       → tracking do pedido por id
  /login            → login/cadastro
  /setup            → bootstrap do primeiro admin

Admin (protegidas, layout com sidebar + header):
  /admin                    → Dashboard
  /admin/pedidos            → Kanban de pedidos
  /admin/cardapio           → CRUD de itens
  /admin/categorias         → CRUD categorias
  /admin/complementos       → CRUD grupos/opções
  /admin/clientes           → lista clientes + WhatsApp
  /admin/usuarios           → gestão usuários e roles (admin)
  /admin/configuracoes      → restaurant_config + bairros + horários
  /admin/exportar           → exportação CSV + SQL das tabelas

============================================================
9) CARDÁPIO PÚBLICO (Cliente)
============================================================
- MenuHeader: logo, nome, status (aberto/fechado), tempo de
  entrega, badge "Loja fechada" se status_funcionamento='fechado'.
- CategoryFilter: chips horizontais de categorias (sticky).
- Seção "Destaques" mostrando itens com destaque=true.
- Grid e modo lista de itens (toggle), busca por nome.
- MenuItemCard: imagem, nome, descrição, preço, badge destaque,
  botão "Adicionar".
- ProductDetailModal: galeria (menu_item_images), descrição,
  grupos de complementos (radio/checkbox conforme tipo +
  obrigatório), quantidade, observação, botão adicionar.
- CartSheet (drawer lateral): lista de itens, +/- quantidade,
  remover, subtotal, taxa, total. Bloqueia checkout se loja
  fechada (a menos que aceitar_loja_fechada=true).
- CheckoutForm (Zod): nome, whatsapp, bairro (select com taxa),
  endereço, observações. Valida pedido mínimo do bairro. Cria
  customer (ou reusa por whatsapp), cria order + order_items,
  redireciona para /pedido/:id e dispara mensagem do WhatsApp
  do estabelecimento (link wa.me com o resumo do pedido).
- /pedido/:id: tracking visual com etapas (pendente → confirmado
  → em preparo → saiu para entrega → entregue), atualizado em
  tempo real via Supabase Realtime na tabela orders.

============================================================
10) PAINEL ADMIN
============================================================
Sidebar (shadcn) com itens conforme permissões:
  Dashboard, Pedidos, Cardápio, Categorias, Complementos,
  Clientes, Usuários, Configurações, Exportar Dados.

- Dashboard: cards (pedidos hoje, faturamento hoje, ticket
  médio, pedidos pendentes), gráfico simples últimos 7 dias.
  Toast + som ao chegar novo pedido (Realtime). Badge de
  conexão (online/offline). Use src/utils/notificationSound.ts
  com Web Audio API (não dependa de arquivo externo).
- Pedidos: visão Kanban com colunas pendente / confirmado /
  em_preparo / saiu_entrega / entregue. Drag-and-drop ou botões
  para mover. Modal de detalhes com itens, cliente, endereço,
  histórico de status, botão "Avisar no WhatsApp" (cor de fundo
  AMARELA #FFD600 e texto preto; no hover, fundo preto e texto
  amarelo).
- Cardápio: CRUD com upload de imagem principal + galeria
  (até 3 imagens, gera thumb 400px), vínculo de grupos de
  complementos, switches ativo/destaque, agrupamento por
  categoria.
- Categorias e Complementos: CRUD com ordenação.
- Clientes: tabela com filtros (ativos últimos 30 dias, com
  pedido, etc.), modal de detalhes mostrando histórico de
  pedidos e botão "Abrir WhatsApp" (mesmo estilo amarelo/preto).
- Usuários: lista, criação via Edge Function "manage-user"
  (usa SERVICE_ROLE_KEY) que cria auth user + profile + role +
  permissions. Edição de roles e permissões. Apenas admin.
- Configurações: abas — Geral (nome, logo, cores, contato),
  Endereço, Redes Sociais, Funcionamento (status, modo,
  horários por dia), Bairros de entrega (CRUD com taxa e
  pedido mínimo), Notificações.
- Exportar Dados: aba "Exportar CSV" (botão por tabela:
  orders, order_items, customers, categories, menu_items,
  complement_groups, complement_options, profiles,
  delivery_neighborhoods, audit_log, order_status_history;
  busca paginada com .range(from,to) em batches de 1000 e gera
  CSV no cliente). Aba "SQL das Tabelas" com botão copiar para
  cada CREATE TABLE e um botão "Copiar tudo".

============================================================
11) EDGE FUNCTION manage-user
============================================================
Crie supabase/functions/manage-user/index.ts (verify_jwt = true)
que aceita ações create / update / delete / set_role /
set_permissions, validando que quem chama é admin via
has_role. Use SUPABASE_SERVICE_ROLE_KEY.

============================================================
12) REALTIME
============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
Use canal no Dashboard e em /pedido/:id para reagir a inserts/
updates.

============================================================
13) BIBLIOTECAS / CONVENÇÕES
============================================================
- shadcn/ui completo, lucide-react para ícones.
- sonner para toasts.
- react-hook-form + zod para formulários.
- @tanstack/react-query para fetch e cache.
- Tailwind: tokens semânticos no index.css (--primary, etc.).
- Nunca editar src/integrations/supabase/client.ts nem types.ts.
- Importar supabase com: import { supabase } from "@/integrations/supabase/client";

============================================================
14) ENTREGÁVEL
============================================================
Implemente tudo. Ao final, me diga:
1. URL pública do cardápio.
2. Como criar o primeiro admin (via /setup).
3. Onde fazer upload do logo e ajustar cores.
============================================================
```

---

## Como usar

1. Crie um projeto novo na outra conta Lovable.
2. Ative o Lovable Cloud nesse projeto.
3. Cole o bloco entre `===` como **primeira mensagem**.
4. Aprove todas as migrations que o Lovable solicitar.
5. Após o build, acesse `/setup` para criar o primeiro admin.
6. Em **Configurações** faça upload do logo, ajuste WhatsApp oficial e bairros.
7. Em **Cardápio** faça upload das imagens dos produtos (não migram automaticamente).

## Limitações conhecidas

- **Imagens dos produtos** ficam no storage da conta antiga e não são copiadas — re-upload manual.
- **Usuários e senhas** não migram — cada usuário precisa fazer cadastro novamente.
- **Pedidos históricos** não migram (use a página Exportar Dados deste projeto para baixar CSVs e, se quiser, importar manualmente depois).
- A nova conta terá um Supabase project ref diferente, então links antigos não funcionam.

Se aprovar, eu já gero esse prompt em formato de arquivo `.md` para download em `/mnt/documents/` ao sair do modo de planejamento. Quer que eu faça isso também?
