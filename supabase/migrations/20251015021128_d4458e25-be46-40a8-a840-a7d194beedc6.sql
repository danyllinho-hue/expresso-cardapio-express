-- Corrigir políticas RLS para permitir criação do primeiro admin

-- Atualizar política de user_roles
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL 
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::app_role)
  );

-- Atualizar política de user_permissions
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.user_permissions;

CREATE POLICY "Admins can manage permissions" ON public.user_permissions
  FOR ALL 
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::app_role)
  );