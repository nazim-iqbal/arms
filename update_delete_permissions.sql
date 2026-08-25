-- Only admins may DELETE. Every other logged-in user keeps full
-- read / insert / update access, so they can still add and edit entries.
--
-- Hiding the delete buttons in the UI is not enough on its own: the anon key
-- ships with the browser bundle, so anyone could call the delete endpoint
-- directly. These policies are what actually enforces the rule.

-- Helper: is the caller an admin? SECURITY DEFINER so the lookup on
-- public.users is not itself filtered by RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'rickshaws', 'drivers', 'daily_incomes', 'daily_expenses',
        'parts_transactions', 'daily_deposit_settings',
        'driver_vehicle_assignments', 'due_recoveries', 'users'
    ]
    LOOP
        -- Drop the old "everything for everyone" policy
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow authenticated users full access', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Read for authenticated', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Insert for authenticated', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Update for authenticated', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Delete for admins only', t);

        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
                       'Read for authenticated', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (true)',
                       'Insert for authenticated', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)',
                       'Update for authenticated', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin())',
                       'Delete for admins only', t);
    END LOOP;
END
$$;
