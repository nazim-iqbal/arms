import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseAnonKey } from './supabase';

/**
 * Secondary Supabase client.
 *
 * Signing up a new user, or signing in as someone else to change their
 * password, would replace the session of the main client — i.e. log the current
 * user out. This client keeps nothing: no persisted session, no refresh, and
 * its own storage key so it never touches the main client's stored session.
 */
export const authClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: 'arms-secondary-auth',
  },
});

/**
 * Supabase Auth always needs an email address, so users created with only a
 * 4-digit login number get a generated one. Login.jsx appends the same domain.
 */
export const LOGIN_DOMAIN = 'arms.local';

export const emailForUserId = (userId, email) =>
  (email || '').trim() || `${String(userId).trim().toLowerCase()}@${LOGIN_DOMAIN}`;

export const isGeneratedEmail = (email) => (email || '').endsWith(`@${LOGIN_DOMAIN}`);

/** Next free 4-digit user number, e.g. 1001 -> "1002". */
export function nextUserNumber(users) {
  const highest = users.reduce((max, u) => {
    const n = parseInt(u.user_id, 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 1000);
  return String(highest + 1).padStart(4, '0');
}

export function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
