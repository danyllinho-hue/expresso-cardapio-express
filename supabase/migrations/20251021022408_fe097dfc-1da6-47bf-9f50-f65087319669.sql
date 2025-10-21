-- Drop the existing view and recreate with security_invoker
DROP VIEW IF EXISTS public.public_restaurant_info;

CREATE VIEW public.public_restaurant_info
WITH (security_invoker=on) AS 
SELECT 
  id,
  nome_restaurante,
  endereco,
  whatsapp_oficial,
  horario_funcionamento,
  tempo_entrega,
  status_funcionamento,
  modo_atendimento,
  logo_url,
  cor_primaria,
  cor_secundaria,
  facebook,
  instagram,
  twitter,
  youtube,
  site,
  telefone,
  exibir_endereco,
  exibir_dados_publicos,
  habilitar_whatsapp,
  whatsapp_mensagem,
  cep,
  numero,
  bairro,
  cidade,
  estado,
  complemento
FROM restaurant_config;

-- Grant public access to the view
GRANT SELECT ON public.public_restaurant_info TO anon, authenticated;