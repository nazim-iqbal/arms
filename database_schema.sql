-- Users table (Extending Supabase Auth)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Rickshaws table
CREATE TABLE public.rickshaws (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    registration_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Drivers table
CREATE TABLE public.drivers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rickshaw_id UUID REFERENCES public.rickshaws(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    joined_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Daily Incomes table
CREATE TABLE public.daily_incomes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rickshaw_id UUID REFERENCES public.rickshaws(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(10, 2) NOT NULL,
    income_particulars TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Daily Expenses table
CREATE TABLE public.daily_expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rickshaw_id UUID REFERENCES public.rickshaws(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(10, 2) NOT NULL,
    expense_particulars TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

-- Setup Row Level Security (RLS) - Optional but recommended
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rickshaws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies (For development, allow all authenticated users)
CREATE POLICY "Allow authenticated users full access" ON public.users FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON public.rickshaws FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON public.drivers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON public.daily_incomes FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON public.daily_expenses FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON public.parts_transactions FOR ALL TO authenticated USING (true);
