-- SQL script to create daily_deposit_settings table
-- Manages daily deposit rates per vehicle with active/inactive status

CREATE TABLE IF NOT EXISTS public.daily_deposit_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rickshaw_id UUID REFERENCES public.rickshaws(id) ON DELETE CASCADE NOT NULL,
    daily_joma_amount NUMERIC(10, 2) NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.daily_deposit_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.daily_deposit_settings;
CREATE POLICY "Allow authenticated users full access" ON public.daily_deposit_settings FOR ALL TO authenticated USING (true);
