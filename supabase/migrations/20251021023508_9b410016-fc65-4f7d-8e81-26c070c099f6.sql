-- Fix orders table RLS policies to prevent public read access

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can view and insert orders" ON public.orders;

-- Create separate policies with proper restrictions
CREATE POLICY "Public can insert orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Staff can view orders" 
ON public.orders 
FOR SELECT 
USING (has_permission(auth.uid(), 'manage_orders'));