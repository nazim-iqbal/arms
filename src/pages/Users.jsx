import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users as UsersIcon, Shield, User, UserPlus, Trash2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Create a secondary client for signups so it doesn't log the admin out
const adminAuthClient = supabase; // Fallback, though standard signUp might change session. 
// Actually, creating a new client is safer:
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const authClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userRole, user: currentUser } = useAuth();
  
  // New User State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      alert('Error fetching users: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    if (!email || !password) return;
    
    try {
      setCreating(true);
      
      // 1. Sign up the user using the secondary client
      const { data: authData, error: authError } = await authClient.auth.signUp({
        email,
        password,
      });
      
      if (authError) throw authError;
      
      const newUserId = authData.user?.id;
      if (!newUserId) {
        throw new Error("Failed to get user ID after creation. (Check if email confirmation is required in Supabase)");
      }

      // 2. Insert/Update role in public.users
      // Note: If you have a database trigger for new users, it might already be created.
      // We will perform an upsert just in case.
      const { error: dbError } = await supabase
        .from('users')
        .upsert({ id: newUserId, email: email, role: role });
        
      if (dbError) throw dbError;
      
      alert('User created successfully!');
      setEmail('');
      setPassword('');
      setRole('user');
      fetchUsers();
    } catch (error) {
      alert('Error creating user: ' + error.message);
    } finally {
      setCreating(false);
    }
  }

  async function deleteUser(id) {
    if (id === currentUser?.id) {
      alert("You cannot delete your own account.");
      return;
    }
    if (!window.confirm('Are you sure you want to delete this user? (This only removes access, not the Auth account)')) return;
    
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      setUsers(users.filter(u => u.id !== id));
    } catch (error) {
      alert('Error deleting user: ' + error.message);
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Create User Form */}
      <div className="glass-panel p-8 lg:col-span-1 self-start">
        <h3 className="flex items-center gap-2 mb-6 text-[#00f2fe] text-xl font-bold">
          <UserPlus size={24} /> নতুন ইউজার তৈরি
        </h3>
        
        <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
          <div>
            <label className="form-label">ইমেইল (Email)</label>
            <input 
              type="email" 
              className="form-input" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required 
            />
          </div>
          <div>
            <label className="form-label">পাসওয়ার্ড (Password)</label>
            <input 
              type="password" 
              className="form-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              minLength={6}
              required 
            />
          </div>
          <div>
            <label className="form-label">রোল (Role)</label>
            <select 
              className="form-input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="user">User (সাধারণ এক্সেস)</option>
              <option value="admin">Admin (সম্পূর্ণ এক্সেস)</option>
            </select>
          </div>
          
          <button 
            type="submit" 
            disabled={creating}
            className="btn btn-primary w-full mt-2"
          >
            {creating ? 'তৈরি হচ্ছে...' : 'ইউজার তৈরি করুন'}
          </button>
        </form>
      </div>

      {/* Users List */}
      <div className="glass-panel p-8 lg:col-span-2">
        <h4 className="flex items-center gap-2 text-xl font-bold text-white mb-6">
          <UsersIcon size={24} className="text-[#4facfe]" /> ব্যবহারকারীদের তালিকা
        </h4>
        
        {loading ? (
          <p className="text-white/60 text-center">লোড হচ্ছে...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${u.role === 'admin' ? 'bg-[#00f2fe]/20 text-[#00f2fe]' : 'bg-white/10 text-white/70'}`}>
                    {u.role === 'admin' ? <Shield size={20} /> : <User size={20} />}
                  </div>
                  <div>
                    <div className="font-bold text-white">{u.email}</div>
                    <div className="text-xs text-white/50 uppercase tracking-wider mt-1">{u.role}</div>
                  </div>
                </div>
                
                {u.id !== currentUser?.id && (
                  <button 
                    onClick={() => deleteUser(u.id)}
                    className="text-red-400 hover:text-red-300 p-2 bg-red-400/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
