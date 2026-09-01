import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useBranch } from '../contexts/BranchContext';
import { BranchField, BranchTag } from '../components/BranchField';
import { DateField } from '../components/DateField';
import { ArrowDownCircle, Trash2, Plus, Receipt, MessageSquare } from 'lucide-react';
import { today, formatDate, bn } from '../lib/date';

// খরচের ধরণ — তালিকার ক্রম অপরিবর্তিত রাখা হয়েছে
const EXPENSE_TYPES = [
  'ভাড়া সমন্বয়',
  'চার্জিং বিল',
  'ব্যাটারি-পানি ক্রয়',
  'বিদ্যুতের মিটার রিচার্জ/বিল পরিশোধ',
  'লিক সারানো',
  'মেরামত',
  'জরিমানা',
  'বিবিধ',
];

// এই ধরণগুলো নিজে থেকে কিছু বলে না, তাই বেছে নিলেই বিস্তারিতের ঘর চলে আসে
const DETAIL_LABELS = {
  'মেরামত': 'মেরামতের বিস্তারিত (Comment)',
  'বিবিধ': 'বিবিধের বিস্তারিত (Comment)',
};

const DETAIL_PLACEHOLDERS = {
  'মেরামত': 'যেমনঃ পিছনের চাকার বেয়ারিং ও ব্রেক শু বদলানো হয়েছে',
  'বিবিধ': 'যেমনঃ টায়ার বদলানো',
};

export default function ExpenseEntry() {
  // Only an admin may delete; everyone else can add and edit
  const { isAdmin } = useAuth();
  const { activeBranchId, scopeQuery } = useBranch();

  const [expenses, setExpenses] = useState([]);
  const [rickshaws, setRickshaws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [branchId, setBranchId] = useState('');       // কোন শাখার খরচ
  const [rickshawId, setRickshawId] = useState('');
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState('');
  const [particulars, setParticulars] = useState('');
  const [detailNote, setDetailNote] = useState('');   // "মেরামত"/"বিবিধ" হলে তার বিস্তারিত

  // Switching branch in the header reloads this screen's books
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  // A vehicle from the old branch must not stay selected after a switch
  useEffect(() => {
    if (rickshawId && !branchRickshaws.some(r => r.id === rickshawId)) setRickshawId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, rickshaws]);

  async function fetchData() {
    try {
      setLoading(true);

      const { data: rData, error: rError } = await scopeQuery(supabase
        .from('rickshaws')
        .select('id, identity_no, registration_number, vehicle_type, branch_id'))
        .order('identity_no', { ascending: true });
      if (rError) throw rError;
      setRickshaws(rData || []);

      const { data: eData, error: eError } = await scopeQuery(supabase
        .from('daily_expenses')
        .select(`*, rickshaws(registration_number, identity_no, vehicle_type)`))
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      if (eError) throw eError;
      setExpenses(eData || []);

    } catch (error) {
      alert('Error fetching expense data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setRickshawId('');
    setAmount('');
    setParticulars('');
    setDetailNote('');
    // branchId and date are deliberately kept: consecutive entries are for
    // the same শাখা and the same working day
  }

  // ধরণ বদলালে — বিস্তারিত লাগে না এমন কিছু হলে ঘরটি খালি হয়ে যায়
  function handleParticularsChange(value) {
    setParticulars(value);
    if (!DETAIL_LABELS[value]) setDetailNote('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount) return;
    if (!branchId) {
      alert('এই খরচটি কোন শাখার জন্য, সেটি নির্বাচন করুন।');
      return;
    }
    if (!particulars) {
      alert('খরচের ধরণ নির্বাচন করুন।');
      return;
    }
    if (DETAIL_LABELS[particulars] && !detailNote.trim()) {
      alert(`${particulars} বাবদ খরচের বিস্তারিত লিখুন।`);
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('daily_expenses')
        .insert([{
          branch_id: branchId,
          rickshaw_id: rickshawId || null,
          date,
          amount: Number(amount),
          expense_particulars: DETAIL_LABELS[particulars]
            ? `${particulars} — ${detailNote.trim()}`
            : particulars,
        }])
        .select(`*, rickshaws(registration_number, identity_no, vehicle_type)`);

      if (error) throw error;
      setExpenses([data[0], ...expenses]);
      resetForm();
    } catch (error) {
      alert('Error adding expense: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!isAdmin) return;
    if (!window.confirm('আপনি কি নিশ্চিত যে এই খরচের রেকর্ডটি মুছে ফেলতে চান?')) return;
    try {
      const { error } = await supabase.from('daily_expenses').delete().eq('id', id);
      if (error) throw error;
      setExpenses(expenses.filter(e => e.id !== id));
    } catch (error) {
      alert('Error deleting record: ' + error.message);
    }
  }

  // Only the chosen branch's vehicles can carry this expense
  const branchRickshaws = branchId
    ? rickshaws.filter(r => r.branch_id === branchId)
    : rickshaws;

  const todaysExpense = expenses.filter(e => e.date === today()).reduce((s, e) => s + Number(e.amount || 0), 0);

  return (
    <div className="flex flex-col gap-3 md:gap-6">

      {/* Header Banner */}
      <div className="flex flex-row justify-between items-center gap-3 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-transparent p-3.5 md:p-5 rounded-xl md:rounded-2xl border border-red-500/20">
        <div className="min-w-0">
          <h2 className="text-lg md:text-2xl font-bold text-white flex items-center gap-2">
            <ArrowDownCircle className="text-red-400 shrink-0 w-5 h-5 md:w-7 md:h-7" />
            খরচ এন্ট্রি (Expense)
          </h2>
          <p className="hidden md:block text-white/70 text-sm mt-1">
            যানবাহন ভিত্তিক দৈনিক খরচ এখানে এন্ট্রি করুন। যানবাহন নির্বাচন না করলে খরচটি সাধারণ খরচ হিসেবে গণ্য হবে।
          </p>
        </div>
        <div className="px-3 py-2 md:px-5 md:py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center shrink-0">
          <div className="text-[10px] md:text-[11px] uppercase tracking-wider text-white/50">আজকের খরচ</div>
          <div className="text-base md:text-xl font-bold text-red-400">৳ {bn(todaysExpense)}</div>
        </div>
      </div>

      {/* Entry Form */}
      <div className="glass-panel panel-pad w-full border-t-4 border-t-red-500">
        <h3 className="panel-title text-red-400">
          <Plus size={20} /> নতুন খরচ যুক্ত করুন
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 items-start">

          {/* Which day the খরচ belongs to. Like the জমা screen this comes
              first — the entry is often written up the following morning. */}
          <DateField
            label="তারিখ (Date)"
            value={date}
            onChange={setDate}
            max={today()}
            required
            helperText="খরচটি যে দিনের, সেই দিনের তারিখ দিন।"
          />

          {/* কোন শাখার জন্য এই খরচ */}
          <BranchField value={branchId} onChange={setBranchId} />

          <div className="form-group !mb-0">
            <label className="form-label">রিক্সা নাম্বার (Vehicle)</label>
            <select
              className="form-input font-mono font-semibold"
              value={rickshawId}
              onChange={(e) => setRickshawId(e.target.value)}
            >
              <option value="">-- রিক্সা/অটো নির্বাচন করুন (ঐচ্ছিক) --</option>
              {branchRickshaws.map(r => (
                <option key={r.id} value={r.id}>
                  ID: {r.identity_no || 'N/A'} ({r.vehicle_type || 'Vehicle'}) - {r.registration_number}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group !mb-0">
            <label className="form-label">টাকার পরিমাণ (৳)</label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="form-input text-red-400 font-bold text-lg"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                required
              />
              <Receipt size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400/50 pointer-events-none" />
            </div>
          </div>

          <div className="form-group !mb-0 md:col-span-2 lg:col-span-3">
            <label className="form-label">খরচের বিবরণ (Particulars)</label>
            <select
              className="form-input"
              value={particulars}
              onChange={(e) => handleParticularsChange(e.target.value)}
              required
            >
              <option value="">-- খরচের ধরণ নির্বাচন করুন --</option>
              {EXPENSE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* "মেরামত"/"বিবিধ" বেছে নিলে বিস্তারিত লেখার ঘরটি নিজে থেকেই চলে আসে */}
          {DETAIL_LABELS[particulars] && (
            <div className="form-group !mb-0 md:col-span-2 lg:col-span-3">
              <label className="form-label">{DETAIL_LABELS[particulars]}</label>
              <div className="relative">
                <textarea
                  className="form-input pl-11 resize-y min-h-[52px]"
                  rows={2}
                  value={detailNote}
                  onChange={(e) => setDetailNote(e.target.value)}
                  placeholder={DETAIL_PLACEHOLDERS[particulars]}
                  autoFocus
                  required
                />
                <MessageSquare size={18} className="absolute left-3.5 top-3.5 text-red-400/60 pointer-events-none" />
              </div>
            </div>
          )}

          <div className="md:col-span-2 lg:col-span-3 grid grid-cols-2 sm:flex sm:justify-end gap-2.5 mt-1">
            <button type="button" onClick={resetForm} className="btn btn-secondary sm:px-8">রিসেট</button>
            <button
              type="submit"
              disabled={saving}
              className="btn bg-red-500 hover:bg-red-600 text-white shadow-[0_4px_15px_rgba(239,68,68,0.3)] sm:px-12 disabled:opacity-60"
            >
              {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </button>
          </div>
        </form>
      </div>

      {/* Recent expenses */}
      <div className="glass-panel panel-pad w-full">
        <h3 className="panel-title text-red-400">
          <ArrowDownCircle size={20} /> সাম্প্রতিক খরচ সমূহ
        </h3>

        {loading ? (
          <p className="text-white/60 animate-pulse text-center py-8">লোড হচ্ছে...</p>
        ) : expenses.length === 0 ? (
          <p className="text-white/60 text-center py-8">কোনো খরচ নেই।</p>
        ) : (
          <>
          {/* Phone view */}
          <div className="md:hidden flex flex-col gap-2.5">
            {expenses.map(expense => (
              <div key={expense.id} className="rec-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    {expense.rickshaws ? (
                      <span className="inline-flex items-center gap-1.5 flex-wrap">
                        <span className="id-badge">{expense.rickshaws.identity_no || 'N/A'}</span>
                        <span className="text-white/85 text-sm font-semibold">{expense.rickshaws.registration_number}</span>
                      </span>
                    ) : (
                      <span className="text-white/40 text-sm">সাধারণ খরচ</span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-white/45 text-xs font-mono">{formatDate(expense.date)}</span>
                      <BranchTag branchId={expense.branch_id} />
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-bold text-red-400 text-base">৳ {bn(expense.amount)}</span>
                    {isAdmin && (
                      <button
                      onClick={() => handleDelete(expense.id)}
                      className="p-2 text-red-400 rounded-lg active:bg-white/10"
                      aria-label="মুছে ফেলুন"
                    >
                      <Trash2 size={15} />
                    </button>
                    )}
                  </div>
                </div>

                <div className="rec-row">
                  <span className="rec-key">বিবরণ</span>
                  <span className="rec-val text-xs">{expense.expense_particulars || '—'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Tablet and up */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse data-table">
              <thead>
                <tr className="border-b border-white/10 text-white/60 text-xs uppercase tracking-wider bg-white/5">
                  <th className="p-4">তারিখ</th>
                  <th className="p-4">রিক্সা নাম্বার</th>
                  <th className="p-4">খরচের বিবরণ</th>
                  <th className="p-4 text-right">টাকার পরিমাণ</th>
                  <th className="p-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-white/80">
                {expenses.map(expense => (
                  <tr key={expense.id} className="hover:bg-white/5 transition-colors duration-150">
                    <td className="p-4 whitespace-nowrap text-white/70 font-mono">
                      <span className="inline-flex items-center gap-1.5">
                        {formatDate(expense.date)}
                        <BranchTag branchId={expense.branch_id} />
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {expense.rickshaws ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#00f2fe] bg-[#00f2fe]/10 border border-[#00f2fe]/30 px-2 py-0.5 rounded-md text-xs">
                            {expense.rickshaws.identity_no || 'N/A'}
                          </span>
                          <span className="text-white/80">{expense.rickshaws.registration_number}</span>
                        </span>
                      ) : (
                        <span className="text-white/40">সাধারণ খরচ</span>
                      )}
                    </td>
                    <td className="p-4 text-white/70">{expense.expense_particulars}</td>
                    <td className="p-4 text-right font-bold text-red-400">৳ {bn(expense.amount)}</td>
                    <td className="p-4 text-right">
                      {isAdmin && (
                        <button
                        onClick={() => handleDelete(expense.id)}
                        className="p-2 text-red-400 hover:text-red-300 transition-colors rounded-lg hover:bg-white/10"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 size={16} />
                      </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
