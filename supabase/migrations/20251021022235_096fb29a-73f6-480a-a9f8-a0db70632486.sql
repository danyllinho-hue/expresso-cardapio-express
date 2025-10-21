-- Create a public view with only customer-facing restaurant data
CREATE VIEW public.public_restaurant_info AS 
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

-- Restrict direct access to restaurant_config table
DROP POLICY IF EXISTS "Public can view config" ON public.restaurant_config;

CREATE POLICY "Staff can view full config" 
ON public.restaurant_config 
FOR SELECT 
USING (has_permission(auth.uid(), 'manage_config'));

-- Staff can still manage config
-- (existing "Users with permission can manage config" policy handles UPDATE/DELETE/INSERT)