-- Criar ENUM para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'atendente', 'cozinha');

-- Criar tabela user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- Criar tabela user_permissions
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, permission)
);

-- Criar tabela audit_log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Função de segurança para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função de segurança para verificar permissão
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_permissions
    WHERE user_id = _user_id AND permission = _permission
  )
  OR public.has_role(_user_id, 'admin')
$$;

-- Enable RLS nas novas tabelas
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies para user_roles
CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

-- RLS policies para user_permissions
CREATE POLICY "Admins can manage permissions" ON public.user_permissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own permissions" ON public.user_permissions
  FOR SELECT USING (user_id = auth.uid());

-- RLS policies para audit_log
CREATE POLICY "Admins can view audit log" ON public.audit_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Atualizar RLS policies das tabelas existentes
DROP POLICY IF EXISTS "Admin can manage categories" ON public.categories;
CREATE POLICY "Users with permission can manage categories" ON public.categories
  FOR ALL USING (public.has_permission(auth.uid(), 'manage_categories'));

DROP POLICY IF EXISTS "Admin can manage menu items" ON public.menu_items;
CREATE POLICY "Users with permission can manage menu items" ON public.menu_items
  FOR ALL USING (public.has_permission(auth.uid(), 'manage_menu_items'));

DROP POLICY IF EXISTS "Admin can manage customers" ON public.customers;
CREATE POLICY "Users with permission can manage customers" ON public.customers
  FOR ALL USING (public.has_permission(auth.uid(), 'manage_customers'));

DROP POLICY IF EXISTS "Admin can manage config" ON public.restaurant_config;
CREATE POLICY "Users with permission can manage config" ON public.restaurant_config
  FOR ALL USING (public.has_permission(auth.uid(), 'manage_config'));

DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Atualizar trigger de novo usuário
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, tipo)
  VALUES (new.id, new.email, 'user');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();