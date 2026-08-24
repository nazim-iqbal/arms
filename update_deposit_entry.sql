-- SQL script to extend daily_incomes for the new "Deposit Entry" screen
-- Adds: daily joma snapshot, due (baki) amount and remarks
--
-- Column meaning after this migration:
--   amount            -> ক্যাশ জমা (cash actually received)  [existing column, unchanged]
--   daily_joma_amount -> দৈনিক জমার পরিমাণ at entry time (snapshot from daily_deposit_settings)
--   due_amount        -> বাকী (daily_joma_amount - amount, never negative)
--   remarks           -> মন্তব্য

ALTER TABLE public.daily_incomes
    ADD COLUMN IF NOT EXISTS daily_joma_amount NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS due_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Existing rows: nothing was due, keep the default 0
UPDATE public.daily_incomes SET due_amount = 0 WHERE due_amount IS NULL;

-- Speeds up the per-vehicle / latest-first listing used by the Deposit Entry page
CREATE INDEX IF NOT EXISTS idx_daily_incomes_rickshaw_date
    ON public.daily_incomes (rickshaw_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_expenses_rickshaw_date
    ON public.daily_expenses (rickshaw_id, date DESC);
