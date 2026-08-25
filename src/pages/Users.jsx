import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users as UsersIcon, Shield, User, UserPlus, Trash2, ShieldAlert,
  Eye, EyeOff, KeyRound, RefreshCw, Copy, Check, Hash, Image as ImageIcon, X, Edit2, Save,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  authClient, LOGIN_DOMAIN, emailForUserId, isGeneratedEmail,
  nextUserNumber, randomPassword,
} from '../lib/authClient';
import { processGoogleDriveUrl } from '../lib/utils';

const initials = (u) => (u.name || u.email || '?').trim().charAt(0).toUpperCase();

export default function Users() {
  const [users, setUsers] = useState([]);
  const [passwords, setPasswords] = useState({});   // auth user id -> stored password
  const [loading, setLoading] = useState(true);
  const { userRole, user: currentUser } = useAuth();

  // Create form — the user number is assigned automatically
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [role, setRole] = useState('user');
  const [showNewPassword, setShowNewPassword] = useState(true);
  const [creating, setCreating] = useState(false);

  // List / modal state
  const [revealed, setRevealed] = useState({});
  const [copiedId, setCopiedId] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editRole, setEditRole] = useState('user');
  const [savingEdit, setSavingEdit] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(true);
  const [resetting, setResetting] = useState(false);

  // Next free 4-digit number, shown read-only on the form
  const userId = nextUserNumber(users);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('user_id', { ascending: true });
      if (error) throw error;
      setUsers(data || []);

      // Admin-only table. The error is ignored so the page still renders before
      // update_user_management.sql has been run.
      const { data: creds } = await supabase.from('user_credentials').select('user_id, password');
      setPasswords(Object.fromEntries((creds || []).map(c => [c.user_id, c.password])));
    } catch (error) {
      alert('Error fetching users: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    if (!password) return;

    const authEmail = emailForUserId(userId, email);

    try {
      setCreating(true);

      const { data: authData, error: authError } = await authClient.auth.signUp({
        email: authEmail,
        password,
      });
      if (authError) throw authError;

      const newUserId = authData.user?.id;
      if (!newUserId) {
        throw new Error('ইউজার আইডি পাওয়া যায়নি। Supabase এ "Confirm email" বন্ধ আছে কিনা দেখুন।');
      }
      // Drop the freshly created session from the secondary client
      await authClient.auth.signOut();

      // Two admins could pick the same number at the same time; on a unique
      // violation take the next free number from the database and retry.
      let assignedNumber = userId;
      let dbError = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { error } = await supabase.from('users').upsert({
          id: newUserId,
          user_id: assignedNumber,
          name: name.trim() || null,
          email: authEmail,
          photo_url: photoUrl.trim() || null,
          role,
        });
        if (!error) { dbError = null; break; }
        dbError = error;
        if (error.code !== '23505') break;
        const { data: fresh } = await supabase.from('users').select('user_id');
        assignedNumber = nextUserNumber(fresh || []);
      }
      if (dbError) throw dbError;

      const { error: credError } = await supabase
        .from('user_credentials')
        .upsert({ user_id: newUserId, password, updated_at: new Date().toISOString() });
      if (credError) throw credError;

      alert(`ইউজার সফলভাবে তৈরি হয়েছে! ইউজার নাম্বার: ${assignedNumber}`);
      setName(''); setEmail(''); setPassword(''); setPhotoUrl(''); setRole('user');
      fetchUsers();
    } catch (error) {
      alert('Error creating user: ' + error.message);
    } finally {
      setCreating(false);
    }
  }

  function openEdit(u) {
    setEditTarget(u);
    setEditName(u.name || '');
    setEditPhotoUrl(u.photo_url || '');
    setEditRole(u.role || 'user');
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editTarget) return;

    try {
      setSavingEdit(true);
      const patch = {
        name: editName.trim() || null,
        photo_url: editPhotoUrl.trim() || null,
        // An admin editing their own account keeps their role, otherwise they
        // could demote themselves and lose access to this page instantly.
        role: editTarget.id === currentUser?.id ? editTarget.role : editRole,
      };

      const { error } = await supabase.from('users').update(patch).eq('id', editTarget.id);
      if (error) throw error;

      setUsers(users.map(u => (u.id === editTarget.id ? { ...u, ...patch } : u)));
      setEditTarget(null);
    } catch (error) {
      alert('Error updating user: ' + error.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!resetTarget || resetPassword.length < 6) return;

    try {
      setResetting(true);

      if (resetTarget.id === currentUser?.id) {
        // Own account: change it on the live session so the admin stays logged in
        const { error } = await supabase.auth.updateUser({ password: resetPassword });
        if (error) throw error;
      } else {
        // Someone else: sign in as them on the secondary client with the stored
        // password, then change it. Changing another user's password directly
        // needs the service_role key, which must never ship in a browser app.
        const stored = passwords[resetTarget.id];
        if (!stored) {
          throw new Error('এই ইউজারের সংরক্ষিত পাসওয়ার্ড নেই, তাই এখান থেকে রিসেট করা যাচ্ছে না। Supabase ড্যাশবোর্ড থেকে পাসওয়ার্ড বদলে নিয়ে এখানে আবার সেট করুন।');
        }
        const { error: signInError } = await authClient.auth.signInWithPassword({
          email: resetTarget.email,
          password: stored,
        });
        if (signInError) {
          throw new Error('সংরক্ষিত পুরাতন পাসওয়ার্ড দিয়ে লগইন করা যায়নি — সম্ভবত পাসওয়ার্ডটি অ্যাপের বাইরে থেকে বদলানো হয়েছে।');
        }
        const { error: updateError } = await authClient.auth.updateUser({ password: resetPassword });
        await authClient.auth.signOut();
        if (updateError) throw updateError;
      }

      const { error: credError } = await supabase
        .from('user_credentials')
        .upsert({ user_id: resetTarget.id, password: resetPassword, updated_at: new Date().toISOString() });
      if (credError) throw credError;

      setPasswords({ ...passwords, [resetTarget.id]: resetPassword });
      setResetTarget(null);
      setResetPassword('');
      alert('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!');
    } catch (error) {
      alert('Error resetting password: ' + error.message);
    } finally {
      setResetting(false);
    }
  }

  async function deleteUser(id) {
    if (id === currentUser?.id) {
      alert('আপনি নিজের অ্যাকাউন্ট মুছতে পারবেন না।');
      return;
    }
    if (!window.confirm('আপনি কি নিশ্চিত? (এতে অ্যাপের এক্সেস বাতিল হবে, Supabase Auth অ্যাকাউন্টটি থেকে যাবে)')) return;

    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      setUsers(users.filter(u => u.id !== id));
    } catch (error) {
      alert('Error deleting user: ' + error.message);
    }
  }

  async function copyPassword(id) {
    try {
      await navigator.clipboard.writeText(passwords[id] || '');
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 1500);
    } catch {
      alert('কপি করা যায়নি।');
    }
  }

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-white/60">Only Administrators can access this page.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 md:gap-6">

      {/* Create User Form */}
      <div className="glass-panel panel-pad w-full border-t-4 border-t-[#00f2fe]">
        <h3 className="panel-title text-[#00f2fe]">
          <UserPlus size={20} /> নতুন ইউজার তৈরি
        </h3>

        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 items-start">

          <div>
            <label className="form-label">ইউজার নাম্বার (Auto)</label>
            <div className="relative">
              <input
                type="text"
                className="form-input pl-10 font-mono font-bold text-lg text-[#00f2fe] bg-white/5 cursor-not-allowed tracking-[0.2em]"
                value={userId}
                readOnly
              />
              <Hash size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00f2fe]/60 pointer-events-none" />
            </div>
            <p className="text-white/40 text-xs mt-1.5">৪ ডিজিটের ইউনিক নাম্বার, স্বয়ংক্রিয়ভাবে নির্ধারিত। এটি দিয়েই ইউজার লগইন করবে।</p>
          </div>

          <div>
            <label className="form-label">নাম (Name)</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="পূর্ণ নাম"
            />
          </div>

          <div>
            <label className="form-label">ইমেইল (ঐচ্ছিক)</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`${userId}@${LOGIN_DOMAIN}`}
            />
            <p className="text-white/40 text-xs mt-1.5">খালি রাখলে ইউজার আইডি দিয়ে ঠিকানা তৈরি হবে।</p>
          </div>

          <div>
            <label className="form-label">পাসওয়ার্ড (Password) *</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                className="form-input pr-20 font-mono"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="কমপক্ষে ৬ অক্ষর"
                minLength={6}
                required
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                <button
                  type="button"
                  onClick={() => setPassword(randomPassword())}
                  className="p-2 text-white/50 hover:text-[#00f2fe] transition-colors"
                  title="পাসওয়ার্ড তৈরি করুন"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="p-2 text-white/50 hover:text-[#00f2fe] transition-colors"
                  title={showNewPassword ? 'লুকান' : 'দেখুন'}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="form-label">রোল (Role)</label>
            <select className="form-input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="user">User (সাধারণ এক্সেস)</option>
              <option value="admin">Admin (সম্পূর্ণ এক্সেস)</option>
            </select>
          </div>

          <div>
            <label className="form-label">ছবি (Photo URL/Link)</label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="url"
                  className="form-input pl-10"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(processGoogleDriveUrl(e.target.value))}
                  placeholder="https://..."
                />
                <ImageIcon size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              </div>
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                {photoUrl ? (
                  <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={18} className="text-white/30" />
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-3 flex justify-end mt-1">
            <button type="submit" disabled={creating} className="btn btn-primary w-full sm:w-auto sm:px-12 disabled:opacity-60">
              {creating ? 'তৈরি হচ্ছে...' : 'ইউজার তৈরি করুন'}
            </button>
          </div>
        </form>
      </div>

      {/* Users List */}
      <div className="glass-panel panel-pad w-full">
        <h4 className="panel-title text-white">
          <UsersIcon size={20} className="text-[#4facfe]" /> ইউজার নাম্বারের তালিকা
          <span className="text-white/40 text-sm font-normal ml-1">({users.length} জন)</span>
        </h4>

        {loading ? (
          <p className="text-white/60 text-center py-8 animate-pulse">লোড হচ্ছে...</p>
        ) : users.length === 0 ? (
          <p className="text-white/60 text-center py-8">কোনো ইউজার নেই।</p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 md:gap-4">
            {users.map(u => (
              <div key={u.id} className="flex flex-col gap-3 p-3 md:p-4 bg-white/5 border border-white/10 rounded-xl md:hover:bg-white/10 transition-colors">

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center shrink-0 font-bold ${u.role === 'admin' ? 'bg-[#00f2fe]/20 text-[#00f2fe]' : 'bg-white/10 text-white/70'}`}>
                      {u.photo_url
                        ? <img src={u.photo_url} alt="" className="w-full h-full object-cover" />
                        : <span>{initials(u)}</span>}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-sm md:text-base truncate">
                        {u.name || u.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-white/50 truncate mt-1">
                        {u.user_id && <span className="id-badge">{u.user_id}</span>}
                        {!isGeneratedEmail(u.email) && <span className="truncate">{u.email}</span>}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 font-bold ${u.role === 'admin' ? 'bg-[#00f2fe]/15 text-[#00f2fe] border border-[#00f2fe]/30' : 'bg-white/10 text-white/60 border border-white/10'}`}>
                    {u.role === 'admin' ? <Shield size={11} className="inline mb-0.5 mr-1" /> : <User size={11} className="inline mb-0.5 mr-1" />}
                    {u.role}
                  </span>
                </div>

                {/* Password row */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/25 border border-white/10">
                  <KeyRound size={15} className="text-amber-400 shrink-0" />
                  <span className="font-mono text-sm text-white/80 truncate flex-1">
                    {passwords[u.id]
                      ? (revealed[u.id] ? passwords[u.id] : '•'.repeat(Math.min(passwords[u.id].length, 12)))
                      : <span className="text-white/35 font-sans text-xs">সংরক্ষিত নেই</span>}
                  </span>
                  {passwords[u.id] && (
                    <>
                      <button
                        onClick={() => setRevealed({ ...revealed, [u.id]: !revealed[u.id] })}
                        className="p-1.5 text-white/50 hover:text-[#00f2fe] transition-colors shrink-0"
                        title={revealed[u.id] ? 'লুকান' : 'পাসওয়ার্ড দেখুন'}
                      >
                        {revealed[u.id] ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button
                        onClick={() => copyPassword(u.id)}
                        className="p-1.5 text-white/50 hover:text-[#00f2fe] transition-colors shrink-0"
                        title="কপি করুন"
                      >
                        {copiedId === u.id ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(u)}
                    className="btn btn-secondary flex-1 !py-2 text-sm gap-2"
                  >
                    <Edit2 size={15} /> এডিট
                  </button>
                  <button
                    onClick={() => { setResetTarget(u); setResetPassword(''); setShowResetPassword(true); }}
                    className="btn btn-secondary flex-1 !py-2 text-sm gap-2"
                  >
                    <KeyRound size={15} /> পাসওয়ার্ড
                  </button>
                  {u.id !== currentUser?.id && (
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="text-red-400 md:hover:text-red-300 p-2.5 bg-red-400/10 rounded-lg transition-colors shrink-0"
                      aria-label="মুছে ফেলুন"
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="glass-panel panel-pad w-full max-w-md">
            <div className="flex items-start justify-between gap-3 mb-5 pb-3 border-b border-white/10">
              <h3 className="text-[#00f2fe] text-lg md:text-xl font-bold flex items-center gap-2">
                <Edit2 size={20} /> ইউজারের তথ্য এডিট
              </h3>
              <button onClick={() => setEditTarget(null)} className="text-white/50 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3 md:gap-4">

              {/* Fixed identity — changing these would break the user's login */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-black/25 border border-white/10">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-[#00f2fe]/15 border border-[#00f2fe]/30 flex items-center justify-center shrink-0">
                  {editPhotoUrl
                    ? <img src={editPhotoUrl} alt="" className="w-full h-full object-cover" />
                    : <span className="font-bold text-[#00f2fe]">{initials({ name: editName, email: editTarget.email })}</span>}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="id-badge">{editTarget.user_id || 'N/A'}</span>
                    <span className="text-xs text-white/40">ইউজার নাম্বার (অপরিবর্তনীয়)</span>
                  </div>
                  {!isGeneratedEmail(editTarget.email) && (
                    <div className="text-xs text-white/50 truncate mt-1.5">{editTarget.email}</div>
                  )}
                </div>
              </div>

              <div>
                <label className="form-label">নাম (Name)</label>
                <input
                  type="text"
                  className="form-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="পূর্ণ নাম"
                  autoFocus
                />
              </div>

              <div>
                <label className="form-label">ছবি (Photo URL/Link)</label>
                <div className="relative">
                  <input
                    type="url"
                    className="form-input pl-10"
                    value={editPhotoUrl}
                    onChange={(e) => setEditPhotoUrl(processGoogleDriveUrl(e.target.value))}
                    placeholder="https://..."
                  />
                  <ImageIcon size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="form-label">রোল (Role)</label>
                <select
                  className="form-input disabled:opacity-60 disabled:cursor-not-allowed"
                  value={editTarget.id === currentUser?.id ? editTarget.role : editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  disabled={editTarget.id === currentUser?.id}
                >
                  <option value="user">User (সাধারণ এক্সেস)</option>
                  <option value="admin">Admin (সম্পূর্ণ এক্সেস)</option>
                </select>
                {editTarget.id === currentUser?.id && (
                  <p className="text-amber-400/90 text-xs mt-1.5">নিজের রোল পরিবর্তন করা যাবে না।</p>
                )}
              </div>

              <p className="text-white/40 text-xs">
                পাসওয়ার্ড বদলাতে তালিকার "পাসওয়ার্ড" বাটনটি ব্যবহার করুন।
              </p>

              <div className="grid grid-cols-2 gap-3 mt-1">
                <button type="button" onClick={() => setEditTarget(null)} className="btn btn-secondary">বাতিল</button>
                <button type="submit" disabled={savingEdit} className="btn btn-primary gap-2 disabled:opacity-60">
                  <Save size={16} /> {savingEdit ? 'সংরক্ষণ...' : 'সংরক্ষণ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="glass-panel panel-pad w-full max-w-md">
            <div className="flex items-start justify-between gap-3 mb-5 pb-3 border-b border-white/10">
              <h3 className="text-[#00f2fe] text-lg md:text-xl font-bold flex items-center gap-2">
                <KeyRound size={20} /> পাসওয়ার্ড রিসেট
              </h3>
              <button onClick={() => setResetTarget(null)} className="text-white/50 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <span className="text-xs text-white/50">ইউজার</span>
              <p className="text-white font-bold text-lg mt-0.5">
                {resetTarget.name || resetTarget.email}
                {resetTarget.user_id && <span className="id-badge ml-2 align-middle">{resetTarget.user_id}</span>}
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              <div>
                <label className="form-label">নতুন পাসওয়ার্ড</label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    className="form-input pr-20 font-mono"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="কমপক্ষে ৬ অক্ষর"
                    minLength={6}
                    required
                    autoFocus
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                    <button type="button" onClick={() => setResetPassword(randomPassword())} className="p-2 text-white/50 hover:text-[#00f2fe] transition-colors" title="পাসওয়ার্ড তৈরি করুন">
                      <RefreshCw size={16} />
                    </button>
                    <button type="button" onClick={() => setShowResetPassword(!showResetPassword)} className="p-2 text-white/50 hover:text-[#00f2fe] transition-colors">
                      {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {resetTarget.id === currentUser?.id && (
                <p className="text-amber-400/90 text-xs">আপনি নিজের পাসওয়ার্ড পরিবর্তন করছেন।</p>
              )}

              <div className="grid grid-cols-2 gap-3 mt-1">
                <button type="button" onClick={() => setResetTarget(null)} className="btn btn-secondary">বাতিল</button>
                <button type="submit" disabled={resetting} className="btn btn-primary disabled:opacity-60">
                  {resetting ? 'হচ্ছে...' : 'রিসেট করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
