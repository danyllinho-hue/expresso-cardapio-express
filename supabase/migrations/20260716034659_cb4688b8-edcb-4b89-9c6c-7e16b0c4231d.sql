
-- 1) public_restaurant_info: use security_invoker so RLS do caller aplica; expor colunas seguras via GRANT + policy anon
ALTER VIEW public.public_restaurant_info SET (security_invoker = true);

REVOKE SELECT ON public.restaurant_config FROM anon;
GRANT SELECT (
  id, nome_restaurante, endereco, whatsapp_oficial, horario_funcionamento,
  tempo_entrega, status_funcionamento, modo_atendimento, logo_url,
  cor_primaria, cor_secundaria, facebook, instagram, twitter, youtube,
  site, telefone, exibir_endereco, exibir_dados_publicos, habilitar_whatsapp,
  whatsapp_mensagem, cep, numero, bairro, cidade, estado, complemento
) ON public.restaurant_config TO anon;

CREATE POLICY "Anon can read public restaurant fields"
ON public.restaurant_config
FOR SELECT
TO anon
USING (true);

-- 2) user_roles: remover bypass do bootstrap; criar função SECURITY DEFINER para criar o primeiro admin de forma atômica
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Função para bootstrap do primeiro admin: só executa se NENHUM admin existir e o caller for o próprio user
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'Admin already exists';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin');

  INSERT INTO public.user_permissions (user_id, permission)
  SELECT _uid, p FROM unnest(ARRAY[
    'view_dashboard','view_financeiro','view_relatorios',
    'manage_categories','manage_menu_items','manage_customers',
    'manage_orders','manage_users','manage_config'
  ]) AS p;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO authenticated;
