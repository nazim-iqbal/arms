-- =====================================================================
--  ARMS — Branch (শাখা) support + three-tier roles
-- =====================================================================
--  Run this ONCE on the Supabase SQL editor. It is written to be safe to
--  re-run: every step is guarded with IF NOT EXISTS / DROP IF EXISTS.
--
--  What it does
--  ------------
--  1. Creates public.branches and seeds the three existing branches.
--  2. Adds branch_id to every operational table and backfills the
--     existing rows to রাজশাহী (the branch the current data belongs to).
--  3. Extends users.role to 'super_admin' | 'admin' | 'user' and gives
--     each user a branch.
--  4. Replaces the flat "any logged-in user can do anything" policies
--     with branch-scoped ones:
--
--        super_admin : every branch, read + write + edit + delete
--        admin       : own branch only, read + write + edit + delete
--        user        : own branch only, read + insert  (NO edit/delete)
--
--     The rules live here, not in the UI: the anon key ships inside the
--     browser bundle, so hiding a button is never enough on its own.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. The branches table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,                 -- শাখার নাম, e.g. 'রাজশাহী'
    code TEXT NOT NULL,                 -- শাখা কোড, e.g. 'RAJ'
    address TEXT,
    phone TEXT,
    manager_name TEXT,
    remarks TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Codes are compared case-insensitively so 'raj' and 'RAJ' cannot coexist
CREATE UNIQUE INDEX IF NOT EXISTS branches_code_lower_key
    ON public.branches (lower(code));

-- Seed the three branches. ON CONFLICT keeps a re-run from duplicating them.
INSERT INTO public.branches (name, code, status)
VALUES ('রাজশাহী', 'RAJ', 'active'),
       ('ঢাকা', 'DHK', 'active'),
       ('চাঁপাই নবাবগঞ্জ', 'CNJ', 'active')
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------
-- 2. branch_id on every operational table, backfilled to রাজশাহী
-- ---------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
    raj UUID;
BEGIN
    SELECT id INTO raj FROM public.branches WHERE lower(code) = 'raj';

    FOREACH t IN ARRAY ARRAY[
        'rickshaws', 'drivers', 'daily_incomes', 'daily_expenses',
        'parts_transactions', 'daily_deposit_settings',
        'driver_vehicle_assignments', 'due_recoveries'
    ]
    LOOP
        EXECUTE format(
            'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id)', t);

        -- Existing rows predate branches — they are the রাজশাহী books
        EXECUTE format('UPDATE public.%I SET branch_id = $1 WHERE branch_id IS NULL', t) USING raj;

        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (branch_id)',
                       'idx_' || t || '_branch', t);
    END LOOP;
END
$$;


-- ---------------------------------------------------------------------
-- 3. Identity numbers are unique *inside* a branch, not globally
--     Each branch numbers its own vehicles from 101 / 201, so a global
--     unique index would make the second branch unable to start.
--     Registration numbers stay globally unique — one plate, one vehicle.
-- ---------------------------------------------------------------------
ALTER TABLE public.rickshaws DROP CONSTRAINT IF EXISTS rickshaws_identity_no_key;
DROP INDEX IF EXISTS public.rickshaws_identity_no_key;

CREATE UNIQUE INDEX IF NOT EXISTS rickshaws_branch_identity_no_key
    ON public.rickshaws (branch_id, identity_no)
    WHERE identity_no IS NOT NULL;


-- ---------------------------------------------------------------------
-- 4. Users: a branch and a third role
-- ---------------------------------------------------------------------
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
    ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'admin', 'user'));

-- On the FIRST run the existing admins become super_admin so nobody is
-- locked out. Once a super admin exists this is skipped, so re-running the
-- script never promotes the branch admins created since.
UPDATE public.users SET role = 'super_admin'
WHERE role = 'admin'
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'super_admin');

-- Everyone else gets the রাজশাহী branch so no account is left branch-less
UPDATE public.users
SET branch_id = (SELECT id FROM public.branches WHERE lower(code) = 'raj')
WHERE branch_id IS NULL AND role <> 'super_admin';


-- ---------------------------------------------------------------------
-- 5. Helper functions
--     SECURITY DEFINER so the lookup on public.users is not itself
--     filtered by RLS (which would recurse).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_branch_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT branch_id FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
    );
$$;

-- Kept for backwards compatibility with the older policies: "is this
-- caller allowed to edit/delete at all?" — super_admin or admin.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    );
$$;

-- May the caller SEE rows of this branch?
CREATE OR REPLACE FUNCTION public.can_read_branch(bid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT public.is_super_admin()
        OR (bid IS NOT NULL AND bid = public.current_branch_id());
$$;

-- Which branch does a given account belong to? SECURITY DEFINER so the
-- lookup is not filtered by the users policies.
CREATE OR REPLACE FUNCTION public.branch_of_user(uid UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT branch_id FROM public.users WHERE id = uid;
$$;

-- May the caller EDIT or DELETE rows of this branch? (admins only)
CREATE OR REPLACE FUNCTION public.can_manage_branch(bid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT public.is_super_admin()
        OR (public.current_role_name() = 'admin'
            AND bid IS NOT NULL AND bid = public.current_branch_id());
$$;


-- ---------------------------------------------------------------------
-- 6. Branch-scoped policies on every operational table
-- ---------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'rickshaws', 'drivers', 'daily_incomes', 'daily_expenses',
        'parts_transactions', 'daily_deposit_settings',
        'driver_vehicle_assignments', 'due_recoveries'
    ]
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

        -- Clear every policy this project has ever created on the table
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow authenticated users full access', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Read for authenticated', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Insert for authenticated', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Update for authenticated', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Delete for admins only', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Branch read', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Branch insert', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Branch update for admins', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Branch delete for admins', t);

        -- Read: own branch; super_admin sees every branch
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
             USING (public.can_read_branch(branch_id))', 'Branch read', t);

        -- Insert: only into a branch you belong to (super_admin: any branch)
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated
             WITH CHECK (public.can_read_branch(branch_id))', 'Branch insert', t);

        -- Edit and delete: admins and super_admin only
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
             USING (public.can_manage_branch(branch_id))
             WITH CHECK (public.can_manage_branch(branch_id))', 'Branch update for admins', t);

        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
             USING (public.can_manage_branch(branch_id))', 'Branch delete for admins', t);
    END LOOP;
END
$$;


-- ---------------------------------------------------------------------
-- 7. The branches table itself: everyone reads, only super_admin writes
--     (every screen needs the branch names to label its records)
-- ---------------------------------------------------------------------
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Branches readable by all users" ON public.branches;
DROP POLICY IF EXISTS "Branches managed by super admin" ON public.branches;

CREATE POLICY "Branches readable by all users"
    ON public.branches FOR SELECT TO authenticated USING (true);

CREATE POLICY "Branches managed by super admin"
    ON public.branches FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());


-- ---------------------------------------------------------------------
-- 8. users table: a branch admin manages only their own branch's people
-- ---------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read for authenticated" ON public.users;
DROP POLICY IF EXISTS "Insert for authenticated" ON public.users;
DROP POLICY IF EXISTS "Update for authenticated" ON public.users;
DROP POLICY IF EXISTS "Delete for admins only" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.users;
DROP POLICY IF EXISTS "Users read own branch" ON public.users;
DROP POLICY IF EXISTS "Users insert by admins" ON public.users;
DROP POLICY IF EXISTS "Users update by admins" ON public.users;
DROP POLICY IF EXISTS "Users delete by admins" ON public.users;

-- Everyone can read their own row (the app needs it to know its role);
-- admins additionally read their branch, super_admin reads everyone.
CREATE POLICY "Users read own branch" ON public.users FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR public.is_super_admin()
        OR (public.current_role_name() = 'admin'
            AND branch_id IS NOT NULL AND branch_id = public.current_branch_id())
    );

CREATE POLICY "Users insert by admins" ON public.users FOR INSERT TO authenticated
    WITH CHECK (public.can_manage_branch(branch_id));

CREATE POLICY "Users update by admins" ON public.users FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.can_manage_branch(branch_id))
    WITH CHECK (id = auth.uid() OR public.can_manage_branch(branch_id));

CREATE POLICY "Users delete by admins" ON public.users FOR DELETE TO authenticated
    USING (public.can_manage_branch(branch_id));


-- ---------------------------------------------------------------------
-- 9. user_credentials — the admin-visible copy of each password
--
--     The policy shipped in update_user_management.sql / update_user_id_number.sql
--     hardcodes  u.role = 'admin'  instead of calling a helper. Once step 4
--     promotes the existing admins to 'super_admin' that test stops matching
--     and saving a new user fails with:
--         new row violates row-level security policy for table "user_credentials"
--
--     Replaced here with a branch-aware rule:
--         owner       — their own password
--         super_admin — everyone
--         admin       — only the accounts of their own branch
-- ---------------------------------------------------------------------
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can access credentials" ON public.user_credentials;
DROP POLICY IF EXISTS "Admins and owners can access credentials" ON public.user_credentials;
DROP POLICY IF EXISTS "Credentials for owner and branch admins" ON public.user_credentials;

CREATE POLICY "Credentials for owner and branch admins"
    ON public.user_credentials FOR ALL TO authenticated
    USING (
        user_id = auth.uid()
        OR public.can_manage_branch(public.branch_of_user(user_id))
    )
    WITH CHECK (
        user_id = auth.uid()
        OR public.can_manage_branch(public.branch_of_user(user_id))
    );


-- ---------------------------------------------------------------------
-- 10. Sanity check — run this after the migration to see the result
-- ---------------------------------------------------------------------
-- SELECT b.name, b.code,
--        (SELECT count(*) FROM public.rickshaws     r WHERE r.branch_id = b.id) AS vehicles,
--        (SELECT count(*) FROM public.drivers       d WHERE d.branch_id = b.id) AS drivers,
--        (SELECT count(*) FROM public.daily_incomes i WHERE i.branch_id = b.id) AS deposits
-- FROM public.branches b ORDER BY b.code;
