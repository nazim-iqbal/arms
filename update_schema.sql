ALTER TABLE public.rickshaws ADD COLUMN vehicle_type TEXT DEFAULT 'Rickshaw' CHECK (vehicle_type IN ('Rickshaw', 'Auto'));
ALTER TABLE public.rickshaws ADD COLUMN condition TEXT DEFAULT 'New' CHECK (condition IN ('New', 'Old'));
ALTER TABLE public.rickshaws ADD COLUMN purchase_price NUMERIC(10, 2);
