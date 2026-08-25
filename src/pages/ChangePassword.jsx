import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { authClient, isGeneratedEmail, randomPassword } from '../lib/authClient';
import { useAuth } from '../contexts/AuthContext';
import { KeyRound, Eye, EyeOff, RefreshCw, Hash, User, CheckCircle2 } from 'lucide-react';

export default function ChangePassword() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('users')
      .select('user_id, name, email, photo_url, role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [user?.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('নতুন পাসওয়ার্ড দুটি মিলছে না।');
      return;
    }
    if (newPassword === currentPassword) {
      setError('নতুন পাসওয়ার্ড আগেরটির থেকে আলাদা হতে হবে।');
      return;
    }

    try {
      setSaving(true);

      // Verify the current password on the secondary client — Supabase does not
      // ask for it, but changing a password without proving the old one lets
      // anyone with an unlocked browser take over the account.
      const { error: verifyError } = await authClient.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      await authClient.auth.signOut();
      if (verifyError) {
        setError('বর্তমান পাসওয়ার্ডটি সঠিক নয়।');
        return;
      }

      // Change it on the live session so this user stays logged in
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      // Keep the admin-visible copy in sync (RLS lets a user write their own row)
      await supabase
        .from('user_credentials')
        .upsert({ user_id: user.id, password: newPassword, updated_at: new Date().toISOString() });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 md:gap-6 max-w-3xl mx-auto w-full">

      {/* Profile card */}
      <div className="glass-panel panel-pad w-full">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-[#00f2fe]/15 border border-[#00f2fe]/30 flex items-center justify-center shrink-0">
            {profile?.photo_url
              ? <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
              : <User size={24} className="text-[#00f2fe]" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-bold text-white truncate">
              {profile?.name || user?.email?.split('@')[0]}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-white/50">
              {profile?.user_id && (
                <span className="id-badge inline-flex items-center gap-1">
                  <Hash size={11} /> {profile.user_id}
                </span>
              )}
              {profile?.role && <span className="uppercase tracking-wider">{profile.role}</span>}
              {!isGeneratedEmail(user?.email) && <span className="truncate">{user?.email}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="glass-panel panel-pad w-full border-t-4 border-t-[#00f2fe]">
        <h3 className="panel-title text-[#00f2fe]">
          <KeyRound size={20} /> পাসওয়ার্ড পরিবর্তন
        </h3>

        {done && (
          <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 p-3.5 rounded-xl mb-4 text-sm">
            <CheckCircle2 size={18} className="shrink-0" />
            পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে। পরের বার নতুন পাসওয়ার্ড দিয়ে লগইন করুন।
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-300 p-3.5 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:gap-5">
          <div>
            <label className="form-label">বর্তমান পাসওয়ার্ড</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                className="form-input pr-12 font-mono"
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setDone(false); }}
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-[#00f2fe] transition-colors"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
            <div>
              <label className="form-label">নতুন পাসওয়ার্ড</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  className="form-input pr-20 font-mono"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setDone(false); }}
                  placeholder="কমপক্ষে ৬ অক্ষর"
                  minLength={6}
                  required
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                  <button
                    type="button"
                    onClick={() => { const p = randomPassword(); setNewPassword(p); setConfirmPassword(p); }}
                    className="p-2 text-white/50 hover:text-[#00f2fe] transition-colors"
                    title="পাসওয়ার্ড তৈরি করুন"
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="p-2 text-white/50 hover:text-[#00f2fe] transition-colors"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="form-label">নতুন পাসওয়ার্ড (আবার লিখুন)</label>
              <input
                type={showNew ? 'text' : 'password'}
                className="form-input font-mono"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setDone(false); }}
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="flex justify-end mt-1">
            <button type="submit" disabled={saving} className="btn btn-primary w-full sm:w-auto sm:px-12 disabled:opacity-60">
              {saving ? 'পরিবর্তন হচ্ছে...' : 'পাসওয়ার্ড পরিবর্তন করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
