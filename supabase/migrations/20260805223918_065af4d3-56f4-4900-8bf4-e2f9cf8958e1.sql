ALTER TABLE public.room_members ADD COLUMN IF NOT EXISTS left_at date;

DROP POLICY IF EXISTS expenses_insert ON public.expenses;
CREATE POLICY expenses_insert ON public.expenses FOR INSERT TO authenticated
WITH CHECK (
  is_room_member(room_id, auth.uid())
  AND created_by = auth.uid()
  AND (paid_by = auth.uid() OR can_manage_room(room_id, auth.uid()))
);

DROP POLICY IF EXISTS expenses_update ON public.expenses;
CREATE POLICY expenses_update ON public.expenses FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR can_manage_room(room_id, auth.uid()))
WITH CHECK (
  (created_by = auth.uid() OR can_manage_room(room_id, auth.uid()))
  AND (paid_by = auth.uid() OR can_manage_room(room_id, auth.uid()))
);