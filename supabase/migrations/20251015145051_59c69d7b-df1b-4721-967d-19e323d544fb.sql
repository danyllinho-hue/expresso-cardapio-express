-- Adicionar campo image_thumb_url para armazenar versão miniatura das imagens
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS image_thumb_url text;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.menu_items.imagem IS 'URL da imagem principal do produto (1200px)';
COMMENT ON COLUMN public.menu_items.image_thumb_url IS 'URL da imagem miniatura do produto (400px)';