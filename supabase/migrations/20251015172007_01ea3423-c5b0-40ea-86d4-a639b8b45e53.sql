-- Tabela de histórico de status dos pedidos
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT
);

-- Índice para buscar histórico por pedido
CREATE INDEX idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX idx_order_status_history_changed_at ON public.order_status_history(changed_at DESC);

-- RLS: Admin pode ver todo histórico
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view status history"
  ON public.order_status_history FOR SELECT
  USING (has_permission(auth.uid(), 'manage_orders'));

CREATE POLICY "Admins can insert status history"
  ON public.order_status_history FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'manage_orders'));

-- Permitir visualização pública de pedidos para página de rastreamento
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
CREATE POLICY "Public can view and insert orders"
  ON public.orders FOR ALL
  USING (true)
  WITH CHECK (true);

-- Habilitar Realtime para histórico
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;

-- Trigger para registrar automaticamente mudanças de status na tabela orders
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Só registra se o status mudou
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.order_status_history (order_id, status, changed_by, notes)
    VALUES (NEW.id, NEW.status, auth.uid(), 'Status alterado');
  ELSIF (TG_OP = 'INSERT') THEN
    -- Registrar status inicial (pendente)
    INSERT INTO public.order_status_history (order_id, status, changed_by, notes)
    VALUES (NEW.id, NEW.status, NULL, 'Pedido criado');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_order_status_change
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_status_change();