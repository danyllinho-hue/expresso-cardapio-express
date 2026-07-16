import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

Deno.serve(async (req) => {
  console.log(`[whatsapp-sender] Request received: ${req.method} ${req.url}`);
  
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const rawBody = await req.text();
    console.log(`[whatsapp-sender] Raw body:`, rawBody);
    
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error(`[whatsapp-sender] JSON parse error:`, e);
      throw new Error('Invalid JSON body');
    }
    
    const { order, newStatus, action, instanceId, token, serverUrl } = body
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // Se a ação for conectar, gera o QR Code
    if (action === 'connect') {
      if (!instanceId || !token) throw new Error('Instance ID ou Token ausentes')
      
      const baseUrl = serverUrl?.trim()?.replace(/\/$/, '') || 'https://expressoespetaria.uazapi.com'
      console.log(`[whatsapp-sender] Connecting instance: ${instanceId} using server: ${baseUrl}`)
      
      // Tentativa 1: POST /instance/connect
      const connectUrl = `${baseUrl}/instance/connect`
      console.log(`[whatsapp-sender] Fetching: ${connectUrl}`)
      
      const response = await fetch(connectUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          instanceId: instanceId,
          type: "WEB"
        })
      })
      
      let result;
      const responseText = await response.text();
      console.log(`[whatsapp-sender] UAZAPI /instance/connect status: ${response.status}, text: ${responseText}`);
      
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error(`[whatsapp-sender] JSON parse error:`, e);
        result = { error: 'Falha ao processar resposta JSON', raw: responseText }
      }

      if (response.ok && (result.base64 || result.status === "CONNECTED" || result.qrcode || result.state === "CONNECTED" || result.base64Code)) {
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Tentativa 2: POST /instance/qrcode (Algumas versões usam POST)
      console.log(`[whatsapp-sender] Trying POST /instance/qrcode...`)
      const qrPostUrl = `${baseUrl}/instance/qrcode`
      const qrPostResponse = await fetch(qrPostUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ instanceId })
      })
      const qrPostText = await qrPostResponse.text();
      console.log(`[whatsapp-sender] UAZAPI POST /instance/qrcode status: ${qrPostResponse.status}, text: ${qrPostText}`);
      if (qrPostResponse.ok) {
        return new Response(qrPostText, {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // Tentativa 3: GET /instance/qrcode
      console.log(`[whatsapp-sender] Fallback to GET /instance/qrcode...`)
      const qrUrl = `${baseUrl}/instance/qrcode?instanceId=${instanceId}`
      const qrResponse = await fetch(qrUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const qrText = await qrResponse.text();
      console.log(`[whatsapp-sender] UAZAPI GET /instance/qrcode status: ${qrResponse.status}, text: ${qrText}`);
      
      if (qrResponse.ok) {
        return new Response(qrText, {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // Tentativa 4: GET /instance/connect
      console.log(`[whatsapp-sender] Fallback to GET /instance/connect...`)
      const getConnectUrl = `${baseUrl}/instance/connect?instanceId=${instanceId}`
      const getConnectResponse = await fetch(getConnectUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const getConnectText = await getConnectResponse.text();
      console.log(`[whatsapp-sender] UAZAPI GET /instance/connect status: ${getConnectResponse.status}, text: ${getConnectText}`);
      if (getConnectResponse.ok) {
        return new Response(getConnectText, {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      return new Response(JSON.stringify({ 
        error: 'Não foi possível obter o QR Code após várias tentativas.',
        lastResponse: responseText || qrText || getConnectText,
        status: response.status
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!order || !newStatus) throw new Error('Dados do pedido ausentes')

    // Buscar configurações da loja
    const { data: config, error: configError } = await supabaseClient
      .from('restaurant_config')
      .select('*')
      .single()

    if (configError || !config) throw new Error('Configurações da loja não encontradas')

    // Se não for UAZAPI, não faz nada (o frontend abrirá o wa.me)
    if (config.whatsapp_api_type !== 'uazapi') {
      return new Response(JSON.stringify({ skipped: true, reason: 'Manual wa.me enabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!config.uazapi_instance_id || !config.uazapi_token) {
      throw new Error('Configurações da UAZAPI ausentes')
    }

    const customer = order.customers
    if (!customer?.whatsapp) throw new Error('Número do cliente ausente')

    const phone = customer.whatsapp.replace(/\D/g, "")
    const trackingUrl = `${req.headers.get('origin') || ''}/pedido/${order.id}`
    
    const messages: Record<string, string> = {
      aprovado: `🍢 *PEDIDO APROVADO!*\n\nOlá *${customer.nome}*! Seu pedido #${order.id.slice(0, 8)} foi aprovado!\n\n🕒 Previsão: 30-40 min\n\nAcompanhe em tempo real:\n${trackingUrl}\n\n_Expresso Espetaria_ 🍢`,
      preparando: `👨‍🍳 *PEDIDO EM PRODUÇÃO!*\n\nOlá *${customer.nome}*! Seu pedido #${order.id.slice(0, 8)} está sendo preparado! 📦\n\nAcompanhe em tempo real:\n${trackingUrl}\n\n_Expresso Espetaria_ 🍢`,
      entregando: `🚚 *PEDIDO A CAMINHO!*\n\nOlá *${customer.nome}*! Seu pedido #${order.id.slice(0, 8)} saiu para entrega!\n\nAguarde o entregador no endereço:\n📍 ${order.delivery_address}\n\nAcompanhe:\n${trackingUrl}\n\n_Expresso Espetaria_ 🍢`,
      entregue: `✅ *PEDIDO ENTREGUE!*\n\nObrigado por escolher o Expresso Espetaria! 🍢\n\nPedido #${order.id.slice(0, 8)} foi entregue com sucesso.\n\nEsperamos que tenha gostado! Até a próxima! 😊`,
      cancelado: `❌ *PEDIDO CANCELADO*\n\nOlá *${customer.nome}*, infelizmente seu pedido #${order.id.slice(0, 8)} foi cancelado.\n\nPara mais informações, entre em contato:\n📞 ${config.whatsapp_oficial}\n\n_Expresso Espetaria_ 🍢`
    }

    const message = messages[newStatus]
    if (!message) return new Response(JSON.stringify({ skipped: true, reason: 'Status without message' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

    // Disparar via UAZAPI
    const baseUrl = config.uazapi_server_url?.trim()?.replace(/\/$/, '') || 'https://expressoespetaria.uazapi.com'
    const url = `${baseUrl}/message/sendText`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.uazapi_token}`
      },
      body: JSON.stringify({
        instanceId: config.uazapi_instance_id,
        number: `55${phone}`,
        text: message
      })
    })

    const result = await response.json()
    console.log('[whatsapp-sender] UAZAPI Response:', result)

    return new Response(JSON.stringify({ success: response.ok, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('[whatsapp-sender] Erro detalhado:', error.message, error.stack)
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})