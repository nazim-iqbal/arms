-- Follow-up to update_user_management.sql
--   * ইউজার আইডি is now a unique 4-digit number, assigned automatically
--   * a user may change their own password, so they also need write access to
--     their OWN credential row (otherwise the admin's stored copy goes stale)

-- 1. Give every existing user a number, continuing after the highest one in use
WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
    FROM public.users
    WHERE user_id IS NULL OR user_id !~ '^[0-9]{4}$'
)
UPDATE public.users u
SET user_id = LPAD((
        COALESCE((SELECT MAX(user_id::int) FROM public.users WHERE user_id ~ '^[0-9]{4}$'), 1000)
        + n.rn
    )::text, 4, '0')
FROM numbered n
WHERE u.id = n.id;

-- 2. New rows must be exactly 4 digits.
--    NOT VALID: existing rows are left alone, only new/updated rows are checked.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_user_id_4digits;
ALTER TABLE public.users
    ADD CONSTRAINT users_user_id_4digits CHECK (user_id ~ '^[0-9]{4}$') NOT VALID;

-- 3. Credentials: admins see everyone, a user sees/updates only their own row
DROP POLICY IF EXISTS "Only admins can access credentials" ON public.user_credentials;
DROP POLICY IF EXISTS "Admins and owners can access credentials" ON public.user_credentials;
CREATE POLICY "Admins and owners can access credentials"
    ON public.user_credentials FOR ALL TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    )
    WITH CHECK (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );
