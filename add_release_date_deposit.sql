-- SQL script to add release_date to daily_deposit_settings table

ALTER TABLE public.daily_deposit_settings
ADD COLUMN IF NOT EXISTS release_date DATE;
