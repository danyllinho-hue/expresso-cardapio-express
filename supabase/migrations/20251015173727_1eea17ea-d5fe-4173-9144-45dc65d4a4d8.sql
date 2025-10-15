-- Expandir tabela restaurant_config com todos os campos necessários
ALTER TABLE public.restaurant_config
ADD COLUMN IF NOT EXISTS razao_social text,
ADD COLUMN IF NOT EXISTS site text,
ADD COLUMN IF NOT EXISTS cep text,
ADD COLUMN IF NOT EXISTS numero text,
ADD COLUMN IF NOT EXISTS bairro text,
ADD COLUMN IF NOT EXISTS cidade text,
ADD COLUMN IF NOT EXISTS estado text,
ADD COLUMN IF NOT EXISTS complemento text,
ADD COLUMN IF NOT EXISTS telefone text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS facebook text,
ADD COLUMN IF NOT EXISTS instagram text,
ADD COLUMN IF NOT EXISTS youtube text,
ADD COLUMN IF NOT EXISTS twitter text,
ADD COLUMN IF NOT EXISTS email_notificacao text,
ADD COLUMN IF NOT EXISTS exibir_dados_publicos boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS exibir_endereco boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS habilitar_whatsapp boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_mensagem text DEFAULT 'Olá! Vim pelo Cardápio Digital...',
ADD COLUMN IF NOT EXISTS valor_pedido_minimo numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_frete_gratis numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS aceitar_loja_fechada boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS cor_primaria text DEFAULT '#FF6B35',
ADD COLUMN IF NOT EXISTS cor_secundaria text DEFAULT '#F7931E';

-- Criar tabela de bairros para entrega
CREATE TABLE IF NOT EXISTS public.delivery_neighborhoods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean DEFAULT true,
  taxa_entrega numeric DEFAULT 0,
  pedido_minimo numeric DEFAULT 0,
  cidade text DEFAULT 'Santo Antônio de Jesus',
  estado text DEFAULT 'BA',
  ordem integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.delivery_neighborhoods ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para delivery_neighborhoods
CREATE POLICY "Public can view active neighborhoods"
ON public.delivery_neighborhoods
FOR SELECT
USING (ativo = true);

CREATE POLICY "Users with permission can manage neighborhoods"
ON public.delivery_neighborhoods
FOR ALL
USING (has_permission(auth.uid(), 'manage_config'));

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_delivery_neighborhoods_ativo ON public.delivery_neighborhoods(ativo);
CREATE INDEX IF NOT EXISTS idx_delivery_neighborhoods_ordem ON public.delivery_neighborhoods(ordem);