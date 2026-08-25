-- SQL script for the extended User Management screen
--   * user_id / name / photo_url on public.users
--   * user_credentials: the admin-visible copy of each user's password
--
-- !! SECURITY NOTE !!
-- Supabase Auth stores only a hash of the password, so a password can never be
-- read back from auth.users. The "পাসওয়ার্ড দেখুন" feature therefore needs the
-- app to keep its own copy. That copy lives in public.user_credentials and its
-- RLS policy lets ONLY users with role = 'admin' read or write it.

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS user_id   TEXT,
    ADD COLUMN IF NOT EXISTS name      TEXT,
    ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Login IDs are case-insensitive and unique
CREATE UNIQUE INDEX IF NOT EXISTS users_user_id_lower_key
    ON public.users (lower(user_id))
    WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.user_credentials (
    user_id    UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    password   TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

-- Admin-only access (a normal logged-in user cannot read anyone's password)
DROP POLICY IF EXISTS "Only admins can access credentials" ON public.user_credentials;
CREATE POLICY "Only admins can access credentials"
    ON public.user_credentials FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- ---------------------------------------------------------------------------
-- Supabase dashboard setting required for admin-created accounts:
--   Authentication -> Providers -> Email -> turn OFF "Confirm email".
-- Otherwise every new user stays unconfirmed and cannot log in, and users
-- created with a generated <userid>@arms.local address can never be confirmed.
-- ---------------------------------------------------------------------------
