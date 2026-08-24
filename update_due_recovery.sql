-- =====================================================================
-- Due Recovery (বাকী আদায়) module
--
-- Problem this solves:
--   daily_incomes.due_amount records how much a driver still owes, but the
--   row only stores rickshaw_id — there is no way to tell WHICH DRIVER the
--   বাকী belongs to. The Due Recovery screen needs a per-driver balance, so
--   every deposit now also records the driver, and recovered amounts are
--   stored in their own table.
--
--   Outstanding due for a driver
--     = SUM(daily_incomes.due_amount WHERE driver_id = D)
--     - SUM(due_recoveries.amount    WHERE driver_id = D)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Tag every deposit with the driver who was operating the vehicle
-- ---------------------------------------------------------------------
ALTER TABLE public.daily_incomes
    ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL;

-- Backfill historical rows from the assignment history: a deposit belongs to
-- whichever driver held that vehicle on that date.
UPDATE public.daily_incomes di
SET driver_id = a.driver_id
FROM public.driver_vehicle_assignments a
WHERE di.driver_id IS NULL
  AND a.rickshaw_id = di.rickshaw_id
  AND di.date >= a.assign_date
  AND (a.release_date IS NULL OR di.date <= a.release_date);

CREATE INDEX IF NOT EXISTS idx_daily_incomes_driver
    ON public.daily_incomes (driver_id);


-- ---------------------------------------------------------------------
-- 2. Due Recovery entries
--
--   amount    -> জমার পরিমাণ (cash recovered against outstanding বাকী)
--   due_total -> snapshot of the driver's outstanding বাকী at entry time,
--                kept for the record so an old receipt still makes sense
--                even after later deposits change the running balance.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.due_recoveries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
    rickshaw_id UUID REFERENCES public.rickshaws(id) ON DELETE SET NULL,
    due_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    recovery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_due_recoveries_driver_date
    ON public.due_recoveries (driver_id, recovery_date DESC);

ALTER TABLE public.due_recoveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.due_recoveries;
CREATE POLICY "Allow authenticated users full access"
    ON public.due_recoveries FOR ALL TO authenticated USING (true);
