
-- Add columns to menu_items for AI upsell
ALTER TABLE public.menu_items 
  ADD COLUMN IF NOT EXISTS custo_cmv NUMERIC,
  ADD COLUMN IF NOT EXISTS tipo_item TEXT CHECK (tipo_item IN ('principal','acompanhamento','bebida','sobremesa','extra')),
  ADD COLUMN IF NOT EXISTS combina_com TEXT[] DEFAULT '{}';

-- Add columns to restaurant_config
ALTER TABLE public.restaurant_config
  ADD COLUMN IF NOT EXISTS upsell_ai_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS upsell_min_subtotal NUMERIC NOT NULL DEFAULT 15;

-- Cache table
CREATE TABLE IF NOT EXISTS public.upsell_suggestions_cache (
  cart_signature TEXT PRIMARY KEY,
  suggestions JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.upsell_suggestions_cache TO anon, authenticated;
GRANT ALL ON public.upsell_suggestions_cache TO service_role;

ALTER TABLE public.upsell_suggestions_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read cache" ON public.upsell_suggestions_cache
  FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_upsell_cache_created ON public.upsell_suggestions_cache(created_at);

-- Expose new upsell config fields in public view
DROP VIEW IF EXISTS public.public_restaurant_info;
CREATE VIEW public.public_restaurant_info WITH (security_invoker = true) AS
SELECT 
  id, nome_restaurante, endereco, tempo_entrega, status_funcionamento,
  modo_atendimento, logo_url, cor_primaria, cor_secundaria,
  whatsapp_oficial, valor_pedido_minimo, valor_frete_gratis,
  horario_funcionamento, aceitar_loja_fechada,
  upsell_ai_enabled, upsell_min_subtotal
FROM public.restaurant_config
WHERE exibir_dados_publicos IS NOT FALSE;

GRANT SELECT ON public.public_restaurant_info TO anon, authenticated;
