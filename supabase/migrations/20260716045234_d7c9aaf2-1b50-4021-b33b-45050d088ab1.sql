ALTER TABLE public.restaurant_config 
ADD COLUMN IF NOT EXISTS whatsapp_api_type TEXT DEFAULT 'wa_me',
ADD COLUMN IF NOT EXISTS uazapi_instance_id TEXT,
ADD COLUMN IF NOT EXISTS uazapi_token TEXT;

COMMENT ON COLUMN public.restaurant_config.whatsapp_api_type IS 'wa_me, uazapi';