import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useBranch } from '../contexts/BranchContext';
import { formatDate, bn } from '../lib/date';
import {
  Building2, Plus, Trash2, Pencil, X, Hash, MapPin, Phone, User,
  MessageSquare, ShieldAlert, CheckCircle2
} from 'lucide-react';

const EMPTY = {
  name: '', code: '', address: '', phone: '',
  manager_name: '', remarks: '', status: 'active',
};

export default function Branches() {
  // Branch Management belongs to the super admin alone — RLS enforces the
  // same rule, this check only keeps the screen from teasing other users.
  const { isSuperAdmin } = useAuth();
  const { refreshBranches } = useBranch();

  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);      // null = adding a new branch

  useEffect(() => {
    if (isSuperAdmin) fetchData();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  async function fetchData() {
    try {
      setLoading(true);

      const [bRes, vRes, uRes] = await Promise.all([
        supabase.from('branches').select('*').order('code', { ascending: true }),
        supabase.from('rickshaws').select('branch_id'),
        supabase.from('users').select('branch_id'),
      ]);

      if (bRes.error) throw bRes.error;
      if (vRes.error) throw vRes.error;
      if (uRes.error) throw uRes.error;

      setRows(bRes.data || []);

      // How much each branch is carrying — shown on its card, and used to
      // explain why a branch cannot simply be deleted.
      const tally = {};
      const bump = (id, key) => {
        if (!id) return;
        tally[id] = tally[id] || { vehicles: 0, users: 0 };
        tally[id][key] += 1;
      };
      (vRes.data || []).forEach((r) => bump(r.branch_id, 'vehicles'));
      (uRes.data || []).forEach((r) => bump(r.branch_id, 'users'));
      setCounts(tally);
    } catch (error) {
      alert('Error fetching branches: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function resetForm() {
    setForm(EMPTY);
    setEditId(null);
  }

  function startEdit(b) {
    setForm({
      name: b.name || '',
      code: b.code || '',
      address: b.address || '',
      phone: b.phone || '',
      manager_name: b.manager_name || '',
      remarks: b.remarks || '',
      status: b.status || 'active',
    });
    setEditId(b.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();

    if (!name || !code) {
      alert('শাখার নাম এবং শাখা কোড দুটোই দিন।');
      return;
    }

    // Codes label every record in the "সকল শাখা" view, so they must be unique
    const clash = rows.find(
      (b) => b.code.toUpperCase() === code && b.id !== editId
    );
    if (clash) {
      alert(`"${code}" কোডটি ইতিমধ্যে "${clash.name}" শাখার জন্য ব্যবহৃত হচ্ছে।`);
      return;
    }

    const payload = {
      name,
      code,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      manager_name: form.manager_name.trim() || null,
      remarks: form.remarks.trim() || null,
      status: form.status,
    };

    try {
      setSaving(true);
      const { error } = editId
        ? await supabase.from('branches').update(payload).eq('id', editId)
        : await supabase.from('branches').insert([payload]);

      if (error) throw error;

      await fetchData();
      await refreshBranches();     // the header switcher picks it up at once
      resetForm();
    } catch (error) {
      alert('Error saving branch: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(b) {
    const c = counts[b.id] || { vehicles: 0, users: 0 };

    // Deleting a branch that still owns records would orphan its whole
    // ledger, so the screen refuses and suggests deactivating instead.
    if (c.vehicles > 0 || c.users > 0) {
      alert(
        `"${b.name}" শাখাটি মুছে ফেলা যাবে না — এর অধীনে ${bn(c.vehicles)} টি গাড়ি ` +
        `এবং ${bn(c.users)} জন ইউজার রয়েছে।\n\n` +
        'হিসাব ঠিক রাখতে শাখাটি মুছে না ফেলে "নিষ্ক্রিয়" করে দিন।'
      );
      return;
    }

    if (!window.confirm(`আপনি কি নিশ্চিত যে "${b.name}" শাখাটি মুছে ফেলতে চান?`)) return;

    try {
      const { error } = await supabase.from('branches').delete().eq('id', b.id);
      if (error) throw error;
      await fetchData();
      await refreshBranches();
      if (editId === b.id) resetForm();
    } catch (error) {
      alert('Error deleting branch: ' + error.message);
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="glass-panel panel-pad w-full text-center py-12">
        <ShieldAlert size={40} className="mx-auto text-amber-400 mb-3" />
        <h3 className="text-white font-bold text-lg">শুধুমাত্র সুপার অ্যাডমিন</h3>
        <p className="text-white/60 text-sm mt-1.5">
          শাখা ব্যবস্থাপনা শুধুমাত্র সুপার অ্যাডমিন ব্যবহার করতে পারবেন।
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 md:gap-6">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-gradient-to-r from-violet-500/10 via-[#00f2fe]/10 to-transparent p-3.5 md:p-5 rounded-xl md:rounded-2xl border border-violet-500/20">
        <div className="min-w-0">
          <h2 className="text-lg md:text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="text-violet-400 shrink-0 w-5 h-5 md:w-7 md:h-7" />
            শাখা ব্যবস্থাপনা (Branch Management)
          </h2>
          <p className="hidden md:block text-white/70 text-sm mt-1">
            প্রতিটি শাখার হিসাব সম্পূর্ণ আলাদা। উপরের ডানদিকের শাখা সুইচার দিয়ে যেকোনো শাখার
            হিসাব দেখা যাবে, অথবা "সকল শাখা" বেছে নিলে সবগুলো একসাথে।
          </p>
        </div>
        <div className="px-3 py-2 md:px-5 md:py-3 rounded-xl bg-violet-500/10 border border-violet-500/30 text-center shrink-0">
          <div className="text-[10px] md:text-[11px] uppercase tracking-wider text-white/50">মোট শাখা</div>
          <div className="text-base md:text-xl font-bold text-violet-300">{bn(rows.length)}</div>
        </div>
      </div>

      {/* Entry / edit form */}
      <div className="glass-panel panel-pad w-full border-t-4 border-t-violet-500">
        <div className="flex items-center justify-between gap-3">
          <h3 className="panel-title text-violet-300 !mb-0">
            {editId ? <Pencil size={20} /> : <Plus size={20} />}
            {editId ? 'শাখা সম্পাদনা' : 'নতুন শাখা যুক্ত করুন'}
          </h3>
          {editId && (
            <button type="button" onClick={resetForm} className="text-white/50 hover:text-white p-1.5" title="বাতিল">
              <X size={18} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 items-start mt-4">

          <div className="form-group !mb-0">
            <label className="form-label">শাখার নাম *</label>
            <input
              type="text"
              className="form-input font-semibold"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="যেমনঃ রাজশাহী"
              required
            />
          </div>

          <div className="form-group !mb-0">
            <label className="form-label">শাখা কোড *</label>
            <div className="relative">
              <input
                type="text"
                className="form-input pl-11 font-mono font-bold uppercase text-[#00f2fe]"
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                placeholder="যেমনঃ RAJ"
                maxLength={10}
                required
              />
              <Hash size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#00f2fe]/50 pointer-events-none" />
            </div>
            <p className="text-white/40 text-xs mt-1.5">সংক্ষিপ্ত কোড — রেকর্ডের পাশে এটিই দেখানো হবে।</p>
          </div>

          <div className="form-group !mb-0">
            <label className="form-label">শাখা ব্যবস্থাপক</label>
            <div className="relative">
              <input
                type="text"
                className="form-input pl-11"
                value={form.manager_name}
                onChange={(e) => set('manager_name', e.target.value)}
                placeholder="দায়িত্বপ্রাপ্ত ব্যক্তির নাম"
              />
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
          </div>

          <div className="form-group !mb-0">
            <label className="form-label">মোবাইল</label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                className="form-input pl-11 font-mono"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="01XXXXXXXXX"
              />
              <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
          </div>

          <div className="form-group !mb-0">
            <label className="form-label">ঠিকানা</label>
            <div className="relative">
              <input
                type="text"
                className="form-input pl-11"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="শাখার ঠিকানা"
              />
              <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
          </div>

          <div className="form-group !mb-0">
            <label className="form-label">অবস্থা</label>
            <select className="form-input" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="active">সচল (Active)</option>
              <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
            </select>
          </div>

          <div className="form-group !mb-0 md:col-span-2 lg:col-span-3">
            <label className="form-label">মন্তব্য</label>
            <div className="relative">
              <input
                type="text"
                className="form-input pl-11"
                value={form.remarks}
                onChange={(e) => set('remarks', e.target.value)}
                placeholder="ঐচ্ছিক"
              />
              <MessageSquare size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-3 grid grid-cols-2 sm:flex sm:justify-end gap-2.5 mt-1">
            <button type="button" onClick={resetForm} className="btn btn-secondary sm:px-8">
              {editId ? 'বাতিল' : 'রিসেট'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn bg-violet-500 hover:bg-violet-600 text-white shadow-[0_4px_15px_rgba(139,92,246,0.3)] sm:px-12 disabled:opacity-60"
            >
              {saving ? 'সংরক্ষণ হচ্ছে...' : editId ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
            </button>
          </div>
        </form>
      </div>

      {/* Branch list */}
      <div className="glass-panel panel-pad w-full">
        <h3 className="panel-title text-violet-300">
          <Building2 size={20} /> শাখার তালিকা ({bn(rows.length)})
        </h3>

        {loading ? (
          <p className="text-white/60 animate-pulse text-center py-8">লোড হচ্ছে...</p>
        ) : rows.length === 0 ? (
          <p className="text-white/60 text-center py-8">কোনো শাখা নেই।</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {rows.map((b) => {
              const c = counts[b.id] || { vehicles: 0, users: 0 };
              return (
                <div key={b.id} className={`rec-card border-l-4 ${b.status === 'active' ? 'border-l-violet-500' : 'border-l-white/20 opacity-70'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="m-0 font-bold text-white text-base truncate">{b.name}</h4>
                      <span className="id-badge mt-1 inline-flex"><Hash size={10} />{b.code}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(b)}
                        className="p-2 text-[#00f2fe] rounded-lg hover:bg-white/10 transition-colors"
                        title="সম্পাদনা"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(b)}
                        className="p-2 text-red-400 rounded-lg hover:bg-white/10 transition-colors"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {b.manager_name && (
                    <div className="rec-row">
                      <span className="rec-key">ব্যবস্থাপক</span>
                      <span className="rec-val text-xs">{b.manager_name}</span>
                    </div>
                  )}
                  {b.phone && (
                    <div className="rec-row">
                      <span className="rec-key">মোবাইল</span>
                      <span className="rec-val text-xs font-mono">{b.phone}</span>
                    </div>
                  )}
                  {b.address && (
                    <div className="rec-row">
                      <span className="rec-key">ঠিকানা</span>
                      <span className="rec-val text-xs text-white/60">{b.address}</span>
                    </div>
                  )}

                  <div className="flex gap-4 text-xs border-t border-white/5 pt-2 mt-1">
                    <span className="text-white/60">গাড়ি {bn(c.vehicles)}</span>
                    <span className="text-white/60">ইউজার {bn(c.users)}</span>
                    <span className={`ml-auto font-semibold ${b.status === 'active' ? 'text-[#10B981]' : 'text-white/40'}`}>
                      {b.status === 'active'
                        ? <><CheckCircle2 size={11} className="inline mb-0.5 mr-1" />সচল</>
                        : 'নিষ্ক্রিয়'}
                    </span>
                  </div>

                  {b.created_at && (
                    <div className="text-white/30 text-[11px] font-mono">{formatDate(b.created_at.slice(0, 10))}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
