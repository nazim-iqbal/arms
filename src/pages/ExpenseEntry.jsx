import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowDownCircle, Trash2, Plus, Receipt } from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];
const bn = (n) => Number(n || 0).toLocaleString('bn-BD');

export default function ExpenseEntry() {
  const [expenses, setExpenses] = useState([]);
  const [rickshaws, setRickshaws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [rickshawId, setRickshawId] = useState('');
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState('');
  const [particulars, setParticulars] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      const { data: rData, error: rError } = await supabase
        .from('rickshaws')
        .select('id, identity_no, registration_number, vehicle_type')
        .order('identity_no', { ascending: true });
      if (rError) throw rError;
      setRickshaws(rData || []);

      const { data: eData, error: eError } = await supabase
        .from('daily_expenses')
        .select(`*, rickshaws(registration_number, identity_no, vehicle_type)`)
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
    setDate(today());
    setAmount('');
    setParticulars('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount) return;

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('daily_expenses')
        .insert([{
          rickshaw_id: rickshawId || null,
          date,
          amount: Number(amount),
          expense_particulars: particulars,
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
    if (!window.confirm('আপনি কি নিশ্চিত যে এই খরচের রেকর্ডটি মুছে ফেলতে চান?')) return;
    try {
      const { error } = await supabase.from('daily_expenses').delete().eq('id', id);
      if (error) throw error;
      setExpenses(expenses.filter(e => e.id !== id));
    } catch (error) {
      alert('Error deleting record: ' + error.message);
    }
  }

  const todaysExpense = expenses.filter(e => e.date === today()).reduce((s, e) => s + Number(e.amount || 0), 0);

  return (
    <div className="flex flex-col gap-8">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-transparent p-6 rounded-2xl border border-red-500/20">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <ArrowDownCircle className="text-red-400" size={28} />
            Expense Entry (খরচ এন্ট্রি)
          </h2>
          <p className="text-white/70 text-sm mt-1">
            যানবাহন ভিত্তিক দৈনিক খরচ এখানে এন্ট্রি করুন। যানবাহন নির্বাচন না করলে খরচটি সাধারণ খরচ হিসেবে গণ্য হবে।
          </p>
        </div>
        <div className="px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
          <div className="text-[11px] uppercase tracking-wider text-white/50">আজকের খরচ</div>
          <div className="text-xl font-bold text-red-400">৳ {bn(todaysExpense)}</div>
        </div>
      </div>

      {/* Entry Form */}
      <div className="glass-panel p-8 w-full border-t-4 border-t-red-500">
        <h3 className="flex items-center gap-2 mb-6 text-red-400 text-xl font-bold">
          <Plus size={24} /> নতুন খরচ যুক্ত করুন
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">

          <div className="form-group !mb-0">
            <label className="form-label">রিক্সা নাম্বার (Vehicle)</label>
            <select
              className="form-input font-mono font-semibold"
              value={rickshawId}
              onChange={(e) => setRickshawId(e.target.value)}
            >
              <option value="">-- রিক্সা/অটো নির্বাচন করুন (ঐচ্ছিক) --</option>
              {rickshaws.map(r => (
                <option key={r.id} value={r.id}>
                  ID: {r.identity_no || 'N/A'} ({r.vehicle_type || 'Vehicle'}) - {r.registration_number}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group !mb-0">
            <label className="form-label">তারিখ (Date)</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
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
            <input
              type="text"
              className="form-input"
              value={particulars}
              onChange={(e) => setParticulars(e.target.value)}
              placeholder="যেমনঃ টায়ার বদলানো"
              required
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 mt-2">
            <button type="button" onClick={resetForm} className="btn btn-secondary px-8">রিসেট</button>
            <button
              type="submit"
              disabled={saving}
              className="btn bg-red-500 hover:bg-red-600 text-white shadow-[0_4px_15px_rgba(239,68,68,0.3)] px-12 text-lg disabled:opacity-60"
            >
              {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </button>
          </div>
        </form>
      </div>

      {/* Recent expenses */}
      <div className="glass-panel p-8 w-full">
        <h3 className="flex items-center gap-2 mb-6 text-red-400 text-xl font-bold">
          <ArrowDownCircle size={24} /> সাম্প্রতিক খরচ সমূহ
        </h3>

        {loading ? (
          <p className="text-white/60 animate-pulse text-center py-8">লোড হচ্ছে...</p>
        ) : expenses.length === 0 ? (
          <p className="text-white/60 text-center py-8">কোনো খরচ নেই।</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
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
                    <td className="p-4 whitespace-nowrap text-white/70">{expense.date}</td>
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
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="p-2 text-red-400 hover:text-red-300 transition-colors rounded-lg hover:bg-white/10"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
