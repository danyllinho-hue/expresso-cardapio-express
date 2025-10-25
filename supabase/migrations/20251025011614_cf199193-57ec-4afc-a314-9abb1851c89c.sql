-- Atualizar pedidos existentes com os novos status
UPDATE public.orders SET status = 'aprovado' WHERE status = 'em_preparo';
UPDATE public.orders SET status = 'entregando' WHERE status = 'enviado';
UPDATE public.orders SET status = 'entregue' WHERE status = 'concluido';

-- Adicionar comentário explicativo sobre os status válidos
COMMENT ON COLUMN public.orders.status IS 'Status do pedido: pendente, aprovado, preparando, entregando, entregue, cancelado';