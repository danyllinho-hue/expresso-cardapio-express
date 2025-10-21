-- Add SELECT policy to customers table to restrict access to staff only
CREATE POLICY "Staff can view customers" 
ON public.customers 
FOR SELECT 
USING (has_permission(auth.uid(), 'manage_customers'));