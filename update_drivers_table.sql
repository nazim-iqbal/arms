-- SQL script to add new driver fields to drivers table

ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS mother_name TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS nid_no TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS permanent_address TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS present_address TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS special_remarks TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS referred_by TEXT;
