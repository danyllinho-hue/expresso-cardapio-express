
-- 1) customers: add user_id + data_nascimento
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS data_nascimento DATE;

CREATE UNIQUE INDEX IF NOT EXISTS customers_user_id_unique ON public.customers(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS customers_whatsapp_idx ON public.customers(whatsapp);

-- Policies for authenticated customers to see/update their own row
DROP POLICY IF EXISTS "Clientes veem seus próprios dados" ON public.customers;
CREATE POLICY "Clientes veem seus próprios dados"
ON public.customers FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Clientes atualizam seus próprios dados" ON public.customers;
CREATE POLICY "Clientes atualizam seus próprios dados"
ON public.customers FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2) orders: add user_id so a logged customer's orders can be listed
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);

DROP POLICY IF EXISTS "Clientes veem seus próprios pedidos" ON public.orders;
CREATE POLICY "Clientes veem seus próprios pedidos"
ON public.orders FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Clientes veem itens de seus pedidos" ON public.order_items;
CREATE POLICY "Clientes veem itens de seus pedidos"
ON public.order_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));

-- 3) customer_addresses
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Casa',
  endereco TEXT NOT NULL,
  bairro TEXT,
  numero TEXT,
  complemento TEXT,
  referencia TEXT,
  padrao BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_addresses TO authenticated;
GRANT ALL ON public.customer_addresses TO service_role;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cliente gerencia seus endereços"
ON public.customer_addresses FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4) handle_new_user: tenta vincular customer por whatsapp fornecido no metadata do signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wa TEXT := NULLIF(new.raw_user_meta_data->>'whatsapp', '');
  _nome TEXT := COALESCE(NULLIF(new.raw_user_meta_data->>'nome', ''), NULLIF(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1));
  _nasc DATE := NULLIF(new.raw_user_meta_data->>'data_nascimento','')::date;
BEGIN
  INSERT INTO public.profiles (id, email, tipo)
  VALUES (new.id, new.email, 'customer')
  ON CONFLICT (id) DO NOTHING;

  IF _wa IS NOT NULL THEN
    -- Se existir cliente com esse whatsapp sem user_id, vincula
    UPDATE public.customers
       SET user_id = new.id,
           nome = COALESCE(nome, _nome),
           data_nascimento = COALESCE(data_nascimento, _nasc)
     WHERE whatsapp = _wa AND user_id IS NULL;

    -- Se não vinculou nenhum, cria novo customer
    IF NOT FOUND THEN
      INSERT INTO public.customers (user_id, nome, whatsapp, data_nascimento)
      VALUES (new.id, _nome, _wa, _nasc);
    END IF;
  END IF;

  RETURN new;
END;
$$;

-- 5) updated_at trigger utilitário
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS customer_addresses_touch ON public.customer_addresses;
CREATE TRIGGER customer_addresses_touch BEFORE UPDATE ON public.customer_addresses
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
