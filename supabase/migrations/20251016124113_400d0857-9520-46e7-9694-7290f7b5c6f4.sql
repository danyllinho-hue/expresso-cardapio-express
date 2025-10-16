-- Adicionar roles aos usuários existentes que não possuem
-- expressoespetaria@hotmail.com -> atendente (caixa)
-- adrielepalma18@gmail.com -> gerente
-- admin@gmail.com -> admin

DO $$
DECLARE
  user_caixa uuid;
  user_gerente uuid;
  user_admin uuid;
BEGIN
  -- Buscar ID do usuário caixa (expressoespetaria@hotmail.com)
  SELECT id INTO user_caixa 
  FROM auth.users 
  WHERE email = 'expressoespetaria@hotmail.com' 
  LIMIT 1;
  
  -- Buscar ID do usuário gerente (adrielepalma18@gmail.com)
  SELECT id INTO user_gerente 
  FROM auth.users 
  WHERE email = 'adrielepalma18@gmail.com' 
  LIMIT 1;
  
  -- Buscar ID do usuário admin (admin@gmail.com)
  SELECT id INTO user_admin 
  FROM auth.users 
  WHERE email = 'admin@gmail.com' 
  LIMIT 1;
  
  -- Inserir role de atendente para o caixa (se não existir)
  IF user_caixa IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_caixa, 'atendente'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Inserir role de gerente (se não existir)
  IF user_gerente IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_gerente, 'gerente'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Inserir role de admin (se não existir)
  IF user_admin IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_admin, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;