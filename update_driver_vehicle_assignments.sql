-- SQL script to create driver_vehicle_assignments table
-- Assigns drivers to vehicles with assign_date, release_date, and status

CREATE TABLE IF NOT EXISTS public.driver_vehicle_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rickshaw_id UUID REFERENCES public.rickshaws(id) ON DELETE CASCADE NOT NULL,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
    assign_date DATE NOT NULL DEFAULT CURRENT_DATE,
    release_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'released')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.driver_vehicle_assignments ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.driver_vehicle_assignments;
CREATE POLICY "Allow authenticated users full access" ON public.driver_vehicle_assignments FOR ALL TO authenticated USING (true);
