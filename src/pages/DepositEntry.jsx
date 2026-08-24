import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowUpCircle, Trash2, Hash, PiggyBank, Wallet, AlertTriangle, MessageSquare, Plus } from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];
const bn = (n) => Number(n || 0).toLocaleString('bn-BD');

export default function DepositEntry() {
  const [incomes, setIncomes] = useState([]);
  const [rickshaws, setRickshaws] = useState([]);
  const [depositRates, setDepositRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [rickshawId, setRickshawId] = useState('');
  const [dailyJoma, setDailyJoma] = useState('');      // auto-filled from settings (read only)
  const [date, setDate] = useState(today());
  const [particulars, setParticulars] = useState('দৈনিক ভাড়ার জমা');
  const [cashAmount, setCashAmount] = useState('');    // ক্যাশ জমা (editable)
  const [dueAmount, setDueAmount] = useState('');      // বাকী (auto calculated)
  const [remarks, setRemarks] = useState('');

  const selectedRickshaw = rickshaws.find(r => r.id === rickshawId);

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

      // Active daily deposit rates (set from the "Set Daily Deposit" page)
      const { data: depData, error: depError } = await supabase
        .from('daily_deposit_settings')
        .select('rickshaw_id, daily_joma_amount')
        .eq('status', 'active');
      if (depError) throw depError;
      setDepositRates(depData || []);

      const { data: iData, error: iError } = await supabase
        .from('daily_incomes')
        .select(`*, rickshaws(registration_number, identity_no, vehicle_type)`)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      if (iError) throw iError;
      setIncomes(iData || []);

    } catch (error) {
      alert('Error fetching deposit data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // Vehicle selected -> pull its daily joma amount and pre-fill the cash field
  function handleRickshawChange(id) {
    setRickshawId(id);
    const rate = depositRates.find(d => d.rickshaw_id === id);
    const joma = rate?.daily_joma_amount != null ? String(Number(rate.daily_joma_amount)) : '';
    setDailyJoma(joma);
    setCashAmount(joma);
    setDueAmount(joma ? '0' : '');
  }

  // Cash reduced -> the remaining part automatically becomes "বাকী"
  function handleCashChange(value) {
    const cash = value.replace(/\D/g, '');
    setCashAmount(cash);
    if (dailyJoma === '') {
      setDueAmount('');
      return;
    }
    const remaining = Number(dailyJoma) - Number(cash || 0);
    setDueAmount(String(remaining > 0 ? remaining : 0));
  }

  function resetForm() {
    setRickshawId('');
    setDailyJoma('');
    setDate(today());
    setParticulars('দৈনিক ভাড়ার জমা');
    setCashAmount('');
    setDueAmount('');
    setRemarks('');
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!rickshawId) {
      alert('অনুগ্রহ করে একটি রিক্সা/অটো নির্বাচন করুন।');
      return;
    }
    if (cashAmount === '') {
      alert('ক্যাশ জমার পরিমাণ দিন।');
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('daily_incomes')
        .insert([{
          rickshaw_id: rickshawId,
          date,
          amount: Number(cashAmount),
          daily_joma_amount: dailyJoma === '' ? null : Number(dailyJoma),
          due_amount: Number(dueAmount || 0),
          income_particulars: particulars,
          remarks: remarks || null,
        }])
        .select(`*, rickshaws(registration_number, identity_no, vehicle_type)`);

      if (error) throw error;
      setIncomes([data[0], ...incomes]);
      resetForm();
    } catch (error) {
      alert('Error adding deposit: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই জমার রেকর্ডটি মুছে ফেলতে চান?')) return;
    try {
      const { error } = await supabase.from('daily_incomes').delete().eq('id', id);
      if (error) throw error;
      setIncomes(incomes.filter(i => i.id !== id));
    } catch (error) {
      alert('Error deleting record: ' + error.message);
    }
  }

  const todaysCash = incomes.filter(i => i.date === today()).reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalDue = incomes.reduce((s, i) => s + Number(i.due_amount || 0), 0);

  return (
    <div className="flex flex-col gap-8">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-[#10B981]/10 via-[#00f2fe]/10 to-transparent p-6 rounded-2xl border border-[#10B981]/20">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <ArrowUpCircle className="text-[#10B981]" size={28} />
            Deposit Entry (জমা এন্ট্রি)
          </h2>
          <p className="text-white/70 text-sm mt-1">
            রিক্সা/অটো নির্বাচন করলে তার দৈনিক জমার পরিমাণ স্বয়ংক্রিয়ভাবে চলে আসবে। ক্যাশ জমা কমালে অবশিষ্ট অংশ বাকীতে যোগ হবে।
          </p>
        </div>
        <div className="flex gap-3">
          <div className="px-5 py-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 text-center">
            <div className="text-[11px] uppercase tracking-wider text-white/50">আজকের ক্যাশ</div>
            <div className="text-xl font-bold text-[#10B981]">৳ {bn(todaysCash)}</div>
          </div>
          <div className="px-5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
            <div className="text-[11px] uppercase tracking-wider text-white/50">মোট বাকী</div>
            <div className="text-xl font-bold text-amber-400">৳ {bn(totalDue)}</div>
          </div>
        </div>
      </div>

      {/* Entry Form */}
      <div className="glass-panel p-8 w-full border-t-4 border-t-[#10B981]">
        <h3 className="flex items-center gap-2 mb-6 text-[#10B981] text-xl font-bold">
          <Plus size={24} /> নতুন জমা যুক্ত করুন
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">

          {/* 1. Rickshaw dropdown */}
          <div className="form-group !mb-0">
            <label className="form-label">রিক্সা নাম্বার (Vehicle)</label>
            <select
              className="form-input font-mono font-semibold"
              value={rickshawId}
              onChange={(e) => handleRickshawChange(e.target.value)}
              required
            >
              <option value="">-- রিক্সা/অটো নির্বাচন করুন --</option>
              {rickshaws.map(r => (
                <option key={r.id} value={r.id}>
                  ID: {r.identity_no || 'N/A'} ({r.vehicle_type || 'Vehicle'}) - {r.registration_number}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Daily joma (auto) */}
          <div className="form-group !mb-0">
            <label className="form-label">দৈনিক জমার পরিমাণ (Auto-filled ৳)</label>
            <div className="relative">
              <input
                type="text"
                className="form-input bg-white/5 text-emerald-400 font-bold text-lg cursor-not-allowed"
                value={dailyJoma}
                readOnly
                placeholder={rickshawId ? 'এই গাড়ির দৈনিক জমা সেট করা নেই' : 'রিক্সা সিলেক্ট করলে চলে আসবে'}
              />
              <PiggyBank size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400/50 pointer-events-none" />
            </div>
            {rickshawId && dailyJoma === '' && (
              <p className="text-amber-400/90 text-xs mt-2 flex items-center gap-1.5">
                <AlertTriangle size={13} /> "Set Daily Deposit" পেজ থেকে এই গাড়ির দৈনিক জমা নির্ধারণ করুন।
              </p>
            )}
          </div>

          {/* 3. Date */}
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

          {/* 4. Particulars */}
          <div className="form-group !mb-0">
            <label className="form-label">জমার ধরণ (Particulars)</label>
            <select className="form-input" value={particulars} onChange={(e) => setParticulars(e.target.value)} required>
              <option value="দৈনিক ভাড়ার জমা">দৈনিক ভাড়ার জমা</option>
              <option value="বাকী আদায়">বাকী আদায়</option>
              <option value="পুরাতন পার্টস বিক্রির অর্থ জমা">পুরাতন পার্টস বিক্রির অর্থ জমা</option>
              <option value="বিবিধ">বিবিধ</option>
            </select>
          </div>

          {/* 5. Cash deposit (editable, pre-filled) */}
          <div className="form-group !mb-0">
            <label className="form-label">ক্যাশ জমা (৳)</label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="form-input text-[#00f2fe] font-bold text-lg"
                value={cashAmount}
                onChange={(e) => handleCashChange(e.target.value)}
                placeholder="0"
                required
              />
              <Wallet size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00f2fe]/50 pointer-events-none" />
            </div>
          </div>

          {/* 6. Due (auto) */}
          <div className="form-group !mb-0">
            <label className="form-label">বাকী (Auto ৳)</label>
            <div className="relative">
              <input
                type="text"
                className={`form-input bg-white/5 font-bold text-lg cursor-not-allowed ${Number(dueAmount || 0) > 0 ? 'text-amber-400 border-amber-500/40' : 'text-white/60'}`}
                value={dueAmount}
                readOnly
                placeholder="0"
              />
              <AlertTriangle size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400/50 pointer-events-none" />
            </div>
          </div>

          {/* 7. Remarks */}
          <div className="form-group !mb-0 md:col-span-2 lg:col-span-3">
            <label className="form-label">মন্তব্য (Remarks)</label>
            <div className="relative">
              <input
                type="text"
                className="form-input pl-11"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="যেমনঃ চালক বাকী পরিশোধের প্রতিশ্রুতি দিয়েছে"
              />
              <MessageSquare size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 mt-2">
            <button type="button" onClick={resetForm} className="btn btn-secondary px-8">রিসেট</button>
            <button
              type="submit"
              disabled={saving}
              className="btn bg-[#10B981] hover:bg-[#059669] text-white shadow-[0_4px_15px_rgba(16,185,129,0.3)] px-12 text-lg disabled:opacity-60"
            >
              {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </button>
          </div>
        </form>

        {selectedRickshaw && (
          <div className="mt-6 pt-5 border-t border-white/10 text-sm text-white/60 flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="inline-flex items-center gap-1.5 font-mono font-bold text-[#00f2fe]">
              <Hash size={14} /> {selectedRickshaw.identity_no || 'N/A'}
            </span>
            <span>রেজিস্ট্রেশন: <span className="text-white/90 font-semibold">{selectedRickshaw.registration_number}</span></span>
            {selectedRickshaw.vehicle_type && <span>ধরন: <span className="text-white/90">{selectedRickshaw.vehicle_type}</span></span>}
          </div>
        )}
      </div>

      {/* Recent deposits */}
      <div className="glass-panel p-8 w-full">
        <h3 className="flex items-center gap-2 mb-6 text-[#10B981] text-xl font-bold">
          <ArrowUpCircle size={24} /> সাম্প্রতিক জমা সমূহ
        </h3>

        {loading ? (
          <p className="text-white/60 animate-pulse text-center py-8">লোড হচ্ছে...</p>
        ) : incomes.length === 0 ? (
          <p className="text-white/60 text-center py-8">কোনো জমা নেই।</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-white/60 text-xs uppercase tracking-wider bg-white/5">
                  <th className="p-4">তারিখ</th>
                  <th className="p-4">রিক্সা নাম্বার</th>
                  <th className="p-4">জমার ধরণ</th>
                  <th className="p-4 text-right">দৈনিক জমা</th>
                  <th className="p-4 text-right">ক্যাশ জমা</th>
                  <th className="p-4 text-right">বাকী</th>
                  <th className="p-4">মন্তব্য</th>
                  <th className="p-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-white/80">
                {incomes.map(income => (
                  <tr key={income.id} className="hover:bg-white/5 transition-colors duration-150">
                    <td className="p-4 whitespace-nowrap text-white/70">{income.date}</td>
                    <td className="p-4 whitespace-nowrap">
                      {income.rickshaws ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#00f2fe] bg-[#00f2fe]/10 border border-[#00f2fe]/30 px-2 py-0.5 rounded-md text-xs">
                            {income.rickshaws.identity_no || 'N/A'}
                          </span>
                          <span className="text-white/80">{income.rickshaws.registration_number}</span>
                        </span>
                      ) : (
                        <span className="text-white/40">N/A</span>
                      )}
                    </td>
                    <td className="p-4 text-white/70">{income.income_particulars}</td>
                    <td className="p-4 text-right text-white/60">
                      {income.daily_joma_amount != null ? `৳ ${bn(income.daily_joma_amount)}` : '—'}
                    </td>
                    <td className="p-4 text-right font-bold text-[#10B981]">৳ {bn(income.amount)}</td>
                    <td className="p-4 text-right">
                      {Number(income.due_amount || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                          ৳ {bn(income.due_amount)}
                        </span>
                      ) : (
                        <span className="text-white/40">—</span>
                      )}
                    </td>
                    <td className="p-4 text-white/60 max-w-[220px] truncate" title={income.remarks || ''}>
                      {income.remarks || '—'}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(income.id)}
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
