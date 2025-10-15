-- Criar bucket para imagens do cardápio
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cardapio-images',
  'cardapio-images',
  true,
  2097152, -- 2MB em bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Políticas de acesso
-- Público pode visualizar as imagens
CREATE POLICY "Public can view cardapio images"
ON storage.objects FOR SELECT
USING (bucket_id = 'cardapio-images');

-- Apenas admins autenticados podem fazer upload
CREATE POLICY "Admins can upload cardapio images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'cardapio-images' AND
  auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  )
);

-- Apenas admins podem atualizar/deletar
CREATE POLICY "Admins can update cardapio images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'cardapio-images' AND
  auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  )
);

CREATE POLICY "Admins can delete cardapio images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'cardapio-images' AND
  auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  )
);