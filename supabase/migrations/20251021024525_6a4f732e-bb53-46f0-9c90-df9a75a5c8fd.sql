-- Add explicit SELECT policy to order_items table
-- This restricts reading order items to authenticated staff only
CREATE POLICY "Staff can view order items"
ON order_items
FOR SELECT
USING (has_permission(auth.uid(), 'manage_orders'));