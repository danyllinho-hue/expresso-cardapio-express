-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  total NUMERIC NOT NULL,
  delivery_address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  menu_item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders
CREATE POLICY "Public can insert orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users with permission can manage orders"
  ON public.orders
  FOR ALL
  USING (has_permission(auth.uid(), 'manage_orders'));

-- RLS Policies for order_items
CREATE POLICY "Public can insert order items"
  ON public.order_items
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users with permission can manage order items"
  ON public.order_items
  FOR ALL
  USING (has_permission(auth.uid(), 'manage_orders'));