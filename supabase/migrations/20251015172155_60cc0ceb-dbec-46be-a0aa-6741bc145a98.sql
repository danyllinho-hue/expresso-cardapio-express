-- Corrigir search_path da função log_order_status_change
DROP TRIGGER IF EXISTS trigger_log_order_status_change ON public.orders;
DROP FUNCTION IF EXISTS log_order_status_change();

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recriar o trigger
CREATE TRIGGER trigger_log_order_status_change
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_status_change();