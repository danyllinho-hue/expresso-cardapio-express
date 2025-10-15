-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco DECIMAL(10, 2) NOT NULL,
  imagem TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  categoria_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  destaque BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  endereco TEXT,
  data_nascimento DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create restaurant_config table
CREATE TABLE public.restaurant_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_restaurante TEXT NOT NULL DEFAULT 'Expresso Espetaria',
  endereco TEXT NOT NULL DEFAULT 'Av. Luís Viana, 232, Centro – Santo Antônio de Jesus, BA',
  whatsapp_oficial TEXT NOT NULL DEFAULT '+5575992315312',
  tempo_entrega TEXT DEFAULT '30–40 min',
  horario_funcionamento JSONB DEFAULT '{"segunda":{"aberto":true,"inicio":"18:00","fim":"23:00"},"terca":{"aberto":true,"inicio":"18:00","fim":"23:00"},"quarta":{"aberto":true,"inicio":"18:00","fim":"23:00"},"quinta":{"aberto":true,"inicio":"18:00","fim":"23:00"},"sexta":{"aberto":true,"inicio":"18:00","fim":"23:00"},"sabado":{"aberto":true,"inicio":"18:00","fim":"23:00"},"domingo":{"aberto":true,"inicio":"18:00","fim":"23:00"}}'::JSONB,
  status_funcionamento TEXT DEFAULT 'aberto' CHECK (status_funcionamento IN ('aberto', 'fechado')),
  modo_atendimento TEXT DEFAULT 'entrega' CHECK (modo_atendimento IN ('entrega', 'retirada', 'ambos')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default restaurant config
INSERT INTO public.restaurant_config (id) VALUES (uuid_generate_v4());

-- Create profiles table for admin users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories (admin only can modify, public can read active items)
CREATE POLICY "Admin can manage categories" ON public.categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND tipo = 'admin')
  );

CREATE POLICY "Public can view categories" ON public.categories
  FOR SELECT USING (true);

-- RLS Policies for menu_items
CREATE POLICY "Admin can manage menu items" ON public.menu_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND tipo = 'admin')
  );

CREATE POLICY "Public can view active menu items" ON public.menu_items
  FOR SELECT USING (status = 'ativo');

-- RLS Policies for customers
CREATE POLICY "Admin can manage customers" ON public.customers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND tipo = 'admin')
  );

CREATE POLICY "Public can insert customers" ON public.customers
  FOR INSERT WITH CHECK (true);

-- RLS Policies for restaurant_config
CREATE POLICY "Admin can manage config" ON public.restaurant_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND tipo = 'admin')
  );

CREATE POLICY "Public can view config" ON public.restaurant_config
  FOR SELECT USING (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND tipo = 'admin')
  );

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, tipo)
  VALUES (new.id, new.email, 'admin');
  RETURN new;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();