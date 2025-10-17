-- Excluir o usuário admin@gmail.com e suas informações relacionadas
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Buscar o ID do usuário admin@gmail.com
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@gmail.com';

  IF admin_user_id IS NOT NULL THEN
    -- Excluir roles do usuário
    DELETE FROM public.user_roles WHERE user_id = admin_user_id;
    
    -- Excluir permissões do usuário
    DELETE FROM public.user_permissions WHERE user_id = admin_user_id;
    
    -- Desativar o perfil do usuário
    UPDATE public.profiles 
    SET ativo = false 
    WHERE id = admin_user_id;
    
    -- Excluir o usuário da tabela auth.users
    DELETE FROM auth.users WHERE id = admin_user_id;
  END IF;
END $$;