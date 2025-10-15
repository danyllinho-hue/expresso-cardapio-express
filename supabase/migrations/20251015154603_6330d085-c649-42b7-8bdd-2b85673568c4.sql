-- Create complement_groups table
CREATE TABLE IF NOT EXISTS public.complement_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('radio', 'checkbox')),
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create complement_options table
CREATE TABLE IF NOT EXISTS public.complement_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.complement_groups(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  valor_adicional NUMERIC DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create menu_item_complements junction table
CREATE TABLE IF NOT EXISTS public.menu_item_complements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  complement_group_id UUID NOT NULL REFERENCES public.complement_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(menu_item_id, complement_group_id)
);

-- Enable RLS
ALTER TABLE public.complement_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complement_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_complements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for complement_groups
CREATE POLICY "Public can view complement groups"
  ON public.complement_groups
  FOR SELECT
  USING (true);

CREATE POLICY "Users with permission can manage complement groups"
  ON public.complement_groups
  FOR ALL
  USING (has_permission(auth.uid(), 'manage_menu_items'));

-- RLS Policies for complement_options
CREATE POLICY "Public can view complement options"
  ON public.complement_options
  FOR SELECT
  USING (true);

CREATE POLICY "Users with permission can manage complement options"
  ON public.complement_options
  FOR ALL
  USING (has_permission(auth.uid(), 'manage_menu_items'));

-- RLS Policies for menu_item_complements
CREATE POLICY "Public can view menu item complements"
  ON public.menu_item_complements
  FOR SELECT
  USING (true);

CREATE POLICY "Users with permission can manage menu item complements"
  ON public.menu_item_complements
  FOR ALL
  USING (has_permission(auth.uid(), 'manage_menu_items'));

-- Create indexes for better performance
CREATE INDEX idx_complement_options_group_id ON public.complement_options(group_id);
CREATE INDEX idx_menu_item_complements_menu_item_id ON public.menu_item_complements(menu_item_id);
CREATE INDEX idx_menu_item_complements_complement_group_id ON public.menu_item_complements(complement_group_id);