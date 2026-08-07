-- 1. Expense groups
CREATE TABLE public.expense_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'users',
  color text NOT NULL DEFAULT '#2f9e8f',
  description text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, name)
);
CREATE INDEX idx_expense_groups_room ON public.expense_groups(room_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_groups TO authenticated;
GRANT ALL ON public.expense_groups TO service_role;
ALTER TABLE public.expense_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY expense_groups_select ON public.expense_groups FOR SELECT TO authenticated
  USING (public.is_room_member(room_id, auth.uid()));
CREATE POLICY expense_groups_insert ON public.expense_groups FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_room(room_id, auth.uid()));
CREATE POLICY expense_groups_update ON public.expense_groups FOR UPDATE TO authenticated
  USING (public.can_manage_room(room_id, auth.uid()))
  WITH CHECK (public.can_manage_room(room_id, auth.uid()));
CREATE POLICY expense_groups_delete ON public.expense_groups FOR DELETE TO authenticated
  USING (public.can_manage_room(room_id, auth.uid()));
CREATE TRIGGER trg_expense_groups_touch BEFORE UPDATE ON public.expense_groups
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- helper: room of a group
CREATE OR REPLACE FUNCTION public.group_room_id(_group_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT room_id FROM public.expense_groups WHERE id = _group_id;
$$;

-- 2. Group members
CREATE TABLE public.expense_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.expense_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);
CREATE INDEX idx_expense_group_members_group ON public.expense_group_members(group_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_group_members TO authenticated;
GRANT ALL ON public.expense_group_members TO service_role;
ALTER TABLE public.expense_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY egm_select ON public.expense_group_members FOR SELECT TO authenticated
  USING (public.is_room_member(public.group_room_id(group_id), auth.uid()));
CREATE POLICY egm_insert ON public.expense_group_members FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_room(public.group_room_id(group_id), auth.uid()));
CREATE POLICY egm_update ON public.expense_group_members FOR UPDATE TO authenticated
  USING (public.can_manage_room(public.group_room_id(group_id), auth.uid()))
  WITH CHECK (public.can_manage_room(public.group_room_id(group_id), auth.uid()));
CREATE POLICY egm_delete ON public.expense_group_members FOR DELETE TO authenticated
  USING (public.can_manage_room(public.group_room_id(group_id), auth.uid()));

-- 3. Expenses belong to a group
ALTER TABLE public.expenses ADD COLUMN group_id uuid REFERENCES public.expense_groups(id) ON DELETE SET NULL;
CREATE INDEX idx_expenses_group ON public.expenses(group_id);

-- 4. Expense participants
CREATE TABLE public.expense_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (expense_id, user_id)
);
CREATE INDEX idx_expense_participants_expense ON public.expense_participants(expense_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_participants TO authenticated;
GRANT ALL ON public.expense_participants TO service_role;
ALTER TABLE public.expense_participants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.expense_room_id(_expense_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT room_id FROM public.expenses WHERE id = _expense_id;
$$;
CREATE OR REPLACE FUNCTION public.can_edit_expense(_expense_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = _expense_id
      AND (e.created_by = _user_id OR public.can_manage_room(e.room_id, _user_id))
  );
$$;

CREATE POLICY ep_select ON public.expense_participants FOR SELECT TO authenticated
  USING (public.is_room_member(public.expense_room_id(expense_id), auth.uid()));
CREATE POLICY ep_insert ON public.expense_participants FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_expense(expense_id, auth.uid()));
CREATE POLICY ep_update ON public.expense_participants FOR UPDATE TO authenticated
  USING (public.can_edit_expense(expense_id, auth.uid()))
  WITH CHECK (public.can_edit_expense(expense_id, auth.uid()));
CREATE POLICY ep_delete ON public.expense_participants FOR DELETE TO authenticated
  USING (public.can_edit_expense(expense_id, auth.uid()));

-- 5. Seed default groups for new rooms
CREATE OR REPLACE FUNCTION public.seed_default_groups(_room_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g record;
BEGIN
  FOR g IN SELECT * FROM (VALUES
    ('Mess','utensils-crossed','#2f9e8f','Daily food and groceries'),
    ('Common House','home','#6366f1','Shared household costs'),
    ('Utilities','zap','#eab308','Electricity, water, internet'),
    ('Maintenance','wrench','#f97316','Repairs and upkeep'),
    ('Personal','user','#a855f7','Personal shared costs')
  ) AS t(name, icon, color, description) LOOP
    INSERT INTO public.expense_groups (room_id, name, icon, color, description, is_default)
    VALUES (_room_id, g.name, g.icon, g.color, g.description, true)
    ON CONFLICT (room_id, name) DO NOTHING;
  END LOOP;

  INSERT INTO public.expense_group_members (group_id, user_id, joined_at)
  SELECT eg.id, rm.user_id, rm.joined_at
  FROM public.expense_groups eg
  JOIN public.room_members rm ON rm.room_id = eg.room_id
  WHERE eg.room_id = _room_id
  ON CONFLICT (group_id, user_id) DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_room()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record;
BEGIN
  INSERT INTO public.room_members (room_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner') ON CONFLICT DO NOTHING;

  FOR c IN SELECT * FROM (VALUES
    ('Groceries','shopping-basket','#2f9e8f'),
    ('Vegetables','carrot','#5cb85c'),
    ('Chicken','drumstick','#d97706'),
    ('Fish','fish','#0ea5e9'),
    ('Milk','milk','#64748b'),
    ('Gas','flame','#ef4444'),
    ('Water','droplet','#38bdf8'),
    ('Cleaning','spray-can','#a855f7'),
    ('Electricity','zap','#eab308'),
    ('Internet','wifi','#3b82f6'),
    ('Transportation','car','#f97316'),
    ('Snacks','cookie','#f59e0b'),
    ('Miscellaneous','tag','#94a3b8')
  ) AS t(name, icon, color) LOOP
    INSERT INTO public.categories (room_id, name, icon, color, is_default)
    VALUES (NEW.id, c.name, c.icon, c.color, true) ON CONFLICT DO NOTHING;
  END LOOP;

  PERFORM public.seed_default_groups(NEW.id);
  RETURN NEW;
END; $$;

-- new room members join the room's active groups
CREATE OR REPLACE FUNCTION public.handle_new_room_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.expense_group_members (group_id, user_id, joined_at)
  SELECT eg.id, NEW.user_id, NEW.joined_at
  FROM public.expense_groups eg
  WHERE eg.room_id = NEW.room_id AND eg.is_active
  ON CONFLICT (group_id, user_id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_room_member_groups AFTER INSERT ON public.room_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_room_member();

-- 6. Backfill existing rooms
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.rooms LOOP
    PERFORM public.seed_default_groups(r.id);
  END LOOP;
END $$;

UPDATE public.expenses e
SET group_id = eg.id
FROM public.expense_groups eg
WHERE eg.room_id = e.room_id AND eg.name = 'Mess' AND e.group_id IS NULL;

INSERT INTO public.expense_participants (expense_id, user_id)
SELECT e.id, rm.user_id
FROM public.expenses e
JOIN public.room_members rm ON rm.room_id = e.room_id
ON CONFLICT (expense_id, user_id) DO NOTHING;