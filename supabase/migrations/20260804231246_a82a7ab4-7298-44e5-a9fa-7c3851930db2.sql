-- ENUMS
CREATE TYPE public.app_role AS ENUM ('super_admin');
CREATE TYPE public.room_role AS ENUM ('owner','admin','member');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES (global)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ROOMS
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'AED',
  timezone text NOT NULL DEFAULT 'Asia/Dubai',
  invite_code text NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- ROOM MEMBERS
CREATE TABLE public.room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.room_role NOT NULL DEFAULT 'member',
  display_name text,
  monthly_contribution numeric(12,2) NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_members TO authenticated;
GRANT ALL ON public.room_members TO service_role;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- HELPERS
CREATE OR REPLACE FUNCTION public.is_room_member(_room_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.room_members WHERE room_id = _room_id AND user_id = _user_id)
      OR public.has_role(_user_id, 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.room_role_of(_room_id uuid, _user_id uuid)
RETURNS public.room_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.has_role(_user_id,'super_admin') THEN 'owner'::public.room_role
    ELSE (SELECT role FROM public.room_members WHERE room_id = _room_id AND user_id = _user_id) END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_room(_room_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.room_role_of(_room_id, _user_id) IN ('owner','admin');
$$;

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'tag',
  color text NOT NULL DEFAULT '#4f8a8b',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- EXPENSES
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  spent_at date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  paid_by uuid NOT NULL,
  notes text,
  receipt_url text,
  created_by uuid NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX expenses_room_date_idx ON public.expenses (room_id, spent_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- POLICIES: profiles
CREATE POLICY "profiles_select_self_or_roommate" ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM public.room_members m1
    JOIN public.room_members m2 ON m1.room_id = m2.room_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = public.profiles.id
  )
);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- POLICIES: user_roles
CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- POLICIES: rooms
CREATE POLICY "rooms_select_members" ON public.rooms FOR SELECT TO authenticated
USING (public.is_room_member(id, auth.uid()));
CREATE POLICY "rooms_insert_owner" ON public.rooms FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "rooms_update_owner" ON public.rooms FOR UPDATE TO authenticated
USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'))
WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "rooms_delete_owner" ON public.rooms FOR DELETE TO authenticated
USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));

-- POLICIES: room_members
CREATE POLICY "room_members_select" ON public.room_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_room_member(room_id, auth.uid()));
CREATE POLICY "room_members_insert" ON public.room_members FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.can_manage_room(room_id, auth.uid()));
CREATE POLICY "room_members_update" ON public.room_members FOR UPDATE TO authenticated
USING (public.can_manage_room(room_id, auth.uid())) WITH CHECK (public.can_manage_room(room_id, auth.uid()));
CREATE POLICY "room_members_delete" ON public.room_members FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.can_manage_room(room_id, auth.uid()));

-- POLICIES: categories
CREATE POLICY "categories_select" ON public.categories FOR SELECT TO authenticated
USING (public.is_room_member(room_id, auth.uid()));
CREATE POLICY "categories_write" ON public.categories FOR INSERT TO authenticated
WITH CHECK (public.can_manage_room(room_id, auth.uid()));
CREATE POLICY "categories_update" ON public.categories FOR UPDATE TO authenticated
USING (public.can_manage_room(room_id, auth.uid())) WITH CHECK (public.can_manage_room(room_id, auth.uid()));
CREATE POLICY "categories_delete" ON public.categories FOR DELETE TO authenticated
USING (public.can_manage_room(room_id, auth.uid()));

-- POLICIES: expenses
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated
USING (public.is_room_member(room_id, auth.uid()));
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO authenticated
WITH CHECK (public.is_room_member(room_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.can_manage_room(room_id, auth.uid()))
WITH CHECK (created_by = auth.uid() OR public.can_manage_room(room_id, auth.uid()));
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.can_manage_room(room_id, auth.uid()));

-- TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_rooms_touch BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_expenses_touch BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- NEW USER HANDLER
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email,''), '@', 1)),
          NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  IF lower(COALESCE(NEW.email,'')) = 'mohammedharis0412@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ROOM BOOTSTRAP: owner membership + default categories
CREATE OR REPLACE FUNCTION public.handle_new_room() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  RETURN NEW;
END; $$;

CREATE TRIGGER on_room_created AFTER INSERT ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.handle_new_room();

-- JOIN BY INVITE CODE (bypasses room SELECT restriction safely)
CREATE OR REPLACE FUNCTION public.join_room_by_code(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _room_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO _room_id FROM public.rooms
   WHERE upper(invite_code) = upper(trim(_code)) AND is_active AND deleted_at IS NULL;
  IF _room_id IS NULL THEN RAISE EXCEPTION 'Invalid invite code'; END IF;
  INSERT INTO public.room_members (room_id, user_id, role)
  VALUES (_room_id, auth.uid(), 'member') ON CONFLICT (room_id, user_id) DO NOTHING;
  RETURN _room_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.join_room_by_code(text) TO authenticated;