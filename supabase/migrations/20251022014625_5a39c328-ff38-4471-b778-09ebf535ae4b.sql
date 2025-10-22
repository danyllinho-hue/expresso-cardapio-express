-- Create table for multiple menu item images
CREATE TABLE IF NOT EXISTS public.menu_item_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_thumb_url TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menu_item_images ENABLE ROW LEVEL SECURITY;

-- Public can view images
CREATE POLICY "Public can view menu item images"
ON public.menu_item_images
FOR SELECT
USING (true);

-- Users with permission can manage images
CREATE POLICY "Users with permission can manage menu item images"
ON public.menu_item_images
FOR ALL
USING (has_permission(auth.uid(), 'manage_menu_items'::text));

-- Create index for better performance
CREATE INDEX idx_menu_item_images_menu_item_id ON public.menu_item_images(menu_item_id);
CREATE INDEX idx_menu_item_images_ordem ON public.menu_item_images(menu_item_id, ordem);