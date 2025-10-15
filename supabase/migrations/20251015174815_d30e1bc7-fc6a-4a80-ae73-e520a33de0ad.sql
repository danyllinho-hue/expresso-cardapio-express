-- Add ativo column to profiles table if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_ativo ON public.profiles(ativo);

-- Update RLS policies to allow admins to update and delete profiles
CREATE POLICY "Admins can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));