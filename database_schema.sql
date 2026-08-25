-- Users table (Extending Supabase Auth)
-- user_id = unique 4-digit login number typed on the login screen,
-- email = the Supabase Auth email
CREATE TABLE public.users (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    user_id TEXT CHECK (user_id ~ '^[0-9]{4}$'),
    name TEXT,
    photo_url TEXT,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX users_user_id_lower_key ON public.users (lower(user_id)) WHERE user_id IS NOT NULL;

-- Admin-visible copy of each password (Supabase Auth itself only keeps a hash).
-- See update_user_management.sql for the security note on this table.
CREATE TABLE public.user_credentials (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    password TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Rickshaws table
CREATE TABLE public.rickshaws (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    identity_no TEXT UNIQUE,
    registration_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Drivers table
CREATE TABLE public.drivers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rickshaw_id UUID REFERENCES public.rickshaws(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    father_name TEXT,
    mother_name TEXT,
    dob DATE,
    nid_no TEXT,
    phone TEXT,
    photo_url TEXT,
    permanent_address TEXT,
    present_address TEXT,
    special_remarks TEXT,
    referred_by TEXT,
    joined_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Daily Incomes table (Deposit Entry)
-- amount = ক্যাশ জমা (cash received), due_amount = বাকী,
-- daily_joma_amount = snapshot of the vehicle's daily deposit rate at entry time,
-- driver_id = the driver who owes any due_amount on this row
CREATE TABLE public.daily_incomes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rickshaw_id UUID REFERENCES public.rickshaws(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(10, 2) NOT NULL,
    daily_joma_amount NUMERIC(10, 2),
    due_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    income_particulars TEXT,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_daily_incomes_rickshaw_date ON public.daily_incomes (rickshaw_id, date DESC);
CREATE INDEX idx_daily_incomes_driver ON public.daily_incomes (driver_id);

-- Due Recovery table (বাকী আদায়)
-- amount = জমার পরিমাণ recovered, due_total = outstanding বাকী at entry time.
-- A driver's outstanding due =
--   SUM(daily_incomes.due_amount) - SUM(due_recoveries.amount) for that driver.
CREATE TABLE public.due_recoveries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
    rickshaw_id UUID REFERENCES public.rickshaws(id) ON DELETE SET NULL,
    due_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    recovery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_due_recoveries_driver_date ON public.due_recoveries (driver_id, recovery_date DESC);

-- Daily Expenses table
CREATE TABLE public.daily_expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rickshaw_id UUID REFERENCES public.rickshaws(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(10, 2) NOT NULL,
    expense_particulars TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_daily_expenses_rickshaw_date ON public.daily_expenses (rickshaw_id, date DESC);

-- Parts Transactions table
CREATE TABLE public.parts_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rickshaw_id UUID REFERENCES public.rickshaws(id) ON DELETE CASCADE,
    transaction_type TEXT CHECK (transaction_type IN ('purchase', 'sale')) NOT NULL,
    part_name TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    transaction_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Daily Deposit Settings table
CREATE TABLE public.daily_deposit_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rickshaw_id UUID REFERENCES public.rickshaws(id) ON DELETE CASCADE NOT NULL,
    daily_joma_amount NUMERIC(10, 2) NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    release_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Driver Vehicle Assignments table
CREATE TABLE public.driver_vehicle_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rickshaw_id UUID REFERENCES public.rickshaws(id) ON DELETE CASCADE NOT NULL,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
    assign_date DATE NOT NULL DEFAULT CURRENT_DATE,
    release_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'released')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Setup Row Level Security (RLS) - Optional but recommended
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rickshaws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_deposit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_vehicle_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.due_recoveries ENABLE ROW LEVEL SECURITY;

-- Policies: everyone logged in can read / insert / update.
-- DELETE is restricted to admins (see update_delete_permissions.sql).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'rickshaws', 'drivers', 'daily_incomes', 'daily_expenses',
        'parts_transactions', 'daily_deposit_settings',
        'driver_vehicle_assignments', 'due_recoveries', 'users'
    ]
    LOOP
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', 'Read for authenticated', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', 'Insert for authenticated', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', 'Update for authenticated', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', 'Delete for admins only', t);
    END LOOP;
END
$$;

-- Passwords: admins see everyone, a user sees only their own
CREATE POLICY "Admins and owners can access credentials" ON public.user_credentials FOR ALL TO authenticated
    USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());
