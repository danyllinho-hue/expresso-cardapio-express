import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Cliente com SERVICE_ROLE para operações de admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Cliente regular para verificar permissões do usuário logado
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado: token ausente');
    }

    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
      }
    );

    // Verificar se o usuário é admin
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = userRoles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      throw new Error('Acesso negado: apenas administradores podem gerenciar usuários');
    }

    const { operation, userData } = await req.json();

    console.log(`[manage-user] Operação: ${operation}`, userData);

    // Input validation
    const validRoles = ['admin', 'moderator', 'user'];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (userData.role && !validRoles.includes(userData.role)) {
      throw new Error('Função inválida. Deve ser: admin, moderator ou user');
    }

    if (userData.nome && (userData.nome.length < 2 || userData.nome.length > 100)) {
      throw new Error('Nome deve ter entre 2 e 100 caracteres');
    }

    if (userData.userId && !uuidRegex.test(userData.userId)) {
      throw new Error('ID de usuário inválido');
    }

    if (userData.permissions && !Array.isArray(userData.permissions)) {
      throw new Error('Permissões devem ser um array');
    }

    // CREATE USER
    if (operation === 'create') {
      const { email, password, nome, role, permissions } = userData;

      // 1. Verificar se usuário já existe e deletar
      const { data: { users: existingUsers } } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      
      if (existingUser) {
        console.log(`[manage-user] Usuário ${email} já existe (ID: ${existingUser.id}). Deletando...`);
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
        
        if (deleteError) {
          console.error('[manage-user] Erro ao deletar usuário existente:', deleteError);
          throw new Error(`Não foi possível remover o usuário existente: ${deleteError.message}`);
        }
        
        // Aguardar para garantir que a deleção foi processada
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // 2. Criar novo usuário
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome }
      });

      if (authError) {
        console.error('[manage-user] Erro ao criar usuário:', authError);
        throw authError;
      }
      if (!authData.user) throw new Error('Erro ao criar usuário');

      console.log(`[manage-user] Usuário criado: ${authData.user.id}`);

      // 3. Criar role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert([{ user_id: authData.user.id, role }]);

      if (roleError) {
        console.error('[manage-user] Erro ao criar role:', roleError);
        throw roleError;
      }

      // 4. Criar permissões
      if (permissions && permissions.length > 0) {
        const { error: permError } = await supabaseAdmin
          .from('user_permissions')
          .insert(
            permissions.map((permission: string) => ({
              user_id: authData.user.id,
              permission,
            }))
          );

        if (permError) {
          console.error('[manage-user] Erro ao criar permissões:', permError);
          throw permError;
        }
      }

      return new Response(
        JSON.stringify({ success: true, user: authData.user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UPDATE USER
    if (operation === 'update') {
      const { userId, email, password, nome, role, permissions } = userData;

      // 1. Atualizar email/senha se fornecidos
      if (email || password) {
        const updateData: any = {};
        if (email) updateData.email = email;
        if (password) updateData.password = password;
        if (nome) updateData.user_metadata = { nome };

        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          updateData
        );

        if (authError) {
          console.error('[manage-user] Erro ao atualizar auth:', authError);
          throw authError;
        }
      }

      // 2. Atualizar perfil
      if (email) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ email })
          .eq('id', userId);

        if (profileError) {
          console.error('[manage-user] Erro ao atualizar perfil:', profileError);
          throw profileError;
        }
      }

      // 3. Atualizar role
      const { error: deleteRoleError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteRoleError) {
        console.error('[manage-user] Erro ao deletar roles antigas:', deleteRoleError);
        throw deleteRoleError;
      }

      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert([{ user_id: userId, role }]);

      if (roleError) {
        console.error('[manage-user] Erro ao criar nova role:', roleError);
        throw roleError;
      }

      // 4. Atualizar permissões
      const { error: deletePermError } = await supabaseAdmin
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      if (deletePermError) {
        console.error('[manage-user] Erro ao deletar permissões antigas:', deletePermError);
        throw deletePermError;
      }

      if (permissions && permissions.length > 0) {
        const { error: permError } = await supabaseAdmin
          .from('user_permissions')
          .insert(
            permissions.map((permission: string) => ({
              user_id: userId,
              permission,
            }))
          );

        if (permError) {
          console.error('[manage-user] Erro ao criar novas permissões:', permError);
          throw permError;
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE USER
    if (operation === 'delete') {
      const { userId } = userData;

      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (error) {
        console.error('[manage-user] Erro ao deletar usuário:', error);
        throw error;
      }

      console.log(`[manage-user] Usuário deletado: ${userId}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Operação inválida');

  } catch (error) {
    console.error('[manage-user] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
