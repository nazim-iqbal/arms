import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowUpCircle, Trash2, Hash, PiggyBank, Wallet, AlertTriangle, MessageSquare, Plus, User } from 'lucide-react';
import { today, formatDate, bn } from '../lib/date';

export default function DepositEntry() {
  // Only an admin may delete; everyone else can add and edit
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  const [incomes, setIncomes] = useState([]);
  const [rickshaws, setRickshaws] = useState([]);
  const [depositRates, setDepositRates] = useState([]);
  const [assignments, setAssignments] = useState([]);   // active driver of each vehicle
  const [totalRecovered, setTotalRecovered] = useState(0);
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
  const [miscNote, setMiscNote] = useState('');       // "বিবিধ" বেছে নিলে তার বিবরণ

  // Filter state
  const [filterRickshawId, setFilterRickshawId] = useState('');

  const filteredIncomes = filterRickshawId
    ? incomes.filter(income => income.rickshaw_id === filterRickshawId)
    : incomes;

  const selectedRickshaw = rickshaws.find(r => r.id === rickshawId);
  // Whoever currently holds the selected vehicle — any বাকী is charged to them
  const selectedAssignment = assignments.find(a => a.rickshaw_id === rickshawId);

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

      // Active driver assignments, so a deposit can be attributed to a driver
      const { data: aData, error: aError } = await supabase
        .from('driver_vehicle_assignments')
        .select('rickshaw_id, driver_id, drivers(name, phone)')
        .eq('status', 'active');
      if (aError) throw aError;
      setAssignments(aData || []);

      // Already-recovered বাকী, so the header shows the outstanding balance
      const { data: recData, error: recError } = await supabase
        .from('due_recoveries')
        .select('amount');
      if (recError) throw recError;
      setTotalRecovered((recData || []).reduce((s, r) => s + Number(r.amount || 0), 0));

      const { data: iData, error: iError } = await supabase
        .from('daily_incomes')
        .select(`*, rickshaws(registration_number, identity_no, vehicle_type), drivers(name)`)
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

  // Daily joma changed manually -> recalculate due amount
  function handleDailyJomaChange(value) {
    const joma = value.replace(/\D/g, '');
    setDailyJoma(joma);
    if (joma === '') {
      setDueAmount('');
      return;
    }
    const remaining = Number(joma) - Number(cashAmount || 0);
    setDueAmount(String(remaining > 0 ? remaining : 0));
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

  // জমার ধরণ বদলালে — "বিবিধ" ছাড়া অন্য কিছু হলে বিবরণের ঘরটি খালি হয়ে যায়
  function handleParticularsChange(value) {
    setParticulars(value);
    if (value !== 'বিবিধ') setMiscNote('');
  }

  function resetForm() {
    setRickshawId('');
    setDailyJoma('');
    setDate(today());
    setParticulars('দৈনিক ভাড়ার জমা');
    setCashAmount('');
    setDueAmount('');
    setRemarks('');
    setMiscNote('');
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
    if (particulars === 'বিবিধ' && !miscNote.trim()) {
      alert('বিবিধ জমার বিবরণ লিখুন।');
      return;
    }
    // Without a driver the বাকী cannot be collected from anyone on the Due Recovery screen
    if (Number(dueAmount || 0) > 0 && !selectedAssignment) {
      const ok = window.confirm(
        'এই গাড়িতে বর্তমানে কোনো ড্রাইভার অ্যাসাইন করা নেই, তাই এই বাকীটি কারো নামে যুক্ত হবে না এবং "Due Recovery" পেজে দেখা যাবে না।\n\nতবুও সংরক্ষণ করবেন?'
      );
      if (!ok) return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('daily_incomes')
        .insert([{
          rickshaw_id: rickshawId,
          driver_id: selectedAssignment?.driver_id || null,
          date,
          amount: Number(cashAmount),
          daily_joma_amount: dailyJoma === '' ? null : Number(dailyJoma),
          due_amount: Number(dueAmount || 0),
          income_particulars: particulars === 'বিবিধ'
            ? `বিবিধ — ${miscNote.trim()}`
            : particulars,
          remarks: remarks || null,
        }])
        .select(`*, rickshaws(registration_number, identity_no, vehicle_type), drivers(name)`);

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
    if (!isAdmin) return;
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
  // Outstanding বাকী = everything ever owed minus everything recovered on the
  // Due Recovery screen. Never let rounding push it below zero.
  const totalDueRaised = incomes.reduce((s, i) => s + Number(i.due_amount || 0), 0);
  const totalDue = Math.max(totalDueRaised - totalRecovered, 0);

  return (
    <div className="flex flex-col gap-3 md:gap-6">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-gradient-to-r from-[#10B981]/10 via-[#00f2fe]/10 to-transparent p-3.5 md:p-5 rounded-xl md:rounded-2xl border border-[#10B981]/20">
        <div className="min-w-0">
          <h2 className="text-lg md:text-2xl font-bold text-white flex items-center gap-2">
            <ArrowUpCircle className="text-[#10B981] shrink-0 w-5 h-5 md:w-7 md:h-7" />
            জমা এন্ট্রি (Deposit)
          </h2>
          <p className="hidden md:block text-white/70 text-sm mt-1">
            রিক্সা/অটো নির্বাচন করলে তার দৈনিক জমার পরিমাণ স্বয়ংক্রিয়ভাবে চলে আসবে। ক্যাশ জমা কমালে অবশিষ্ট অংশ বাকীতে যোগ হবে।
          </p>
        </div>
        <div className="grid grid-cols-2 md:flex gap-2.5 shrink-0">
          <div className="px-3 py-2 md:px-5 md:py-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 text-center">
            <div className="text-[10px] md:text-[11px] uppercase tracking-wider text-white/50">আজকের ক্যাশ</div>
            <div className="text-base md:text-xl font-bold text-[#10B981]">৳ {bn(todaysCash)}</div>
          </div>
          <div className="px-3 py-2 md:px-5 md:py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
            <div className="text-[10px] md:text-[11px] uppercase tracking-wider text-white/50">মোট বাকী</div>
            <div className="text-base md:text-xl font-bold text-amber-400">৳ {bn(totalDue)}</div>
          </div>
        </div>
      </div>

      {/* Entry Form */}
      <div className="glass-panel panel-pad w-full border-t-4 border-t-[#10B981]">
        <h3 className="panel-title text-[#10B981]">
          <Plus size={20} /> নতুন জমা যুক্ত করুন
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 items-start">

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

          {/* 2. Daily joma (auto but editable) */}
          <div className="form-group !mb-0">
            <label className="form-label">দৈনিক জমার পরিমাণ (৳)</label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="form-input text-emerald-400 font-bold text-lg"
                value={dailyJoma}
                onChange={(e) => handleDailyJomaChange(e.target.value)}
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
            {/* "বাকী আদায়" lives on the Due Recovery page now — keeping it here
                too would double-count the money and never reduce the balance. */}
            <select className="form-input" value={particulars} onChange={(e) => handleParticularsChange(e.target.value)} required>
              <option value="দৈনিক ভাড়ার জমা">দৈনিক ভাড়ার জমা</option>
              <option value="বিবিধ">বিবিধ</option>
            </select>
          </div>

          {/* 4b. "বিবিধ" বেছে নিলে বিবরণের ঘরটি নিজে থেকেই চলে আসে */}
          {particulars === 'বিবিধ' && (
            <div className="form-group !mb-0">
              <label className="form-label">বিবিধের বিবরণ (কী বাবদ জমা)</label>
              <div className="relative">
                <input
                  type="text"
                  className="form-input pl-11"
                  value={miscNote}
                  onChange={(e) => setMiscNote(e.target.value)}
                  placeholder="যেমনঃ পুরাতন পার্টস বিক্রির অর্থ"
                  autoFocus
                  required
                />
                <MessageSquare size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400/60 pointer-events-none" />
              </div>
            </div>
          )}

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

          <div className="md:col-span-2 lg:col-span-3 grid grid-cols-2 sm:flex sm:justify-end gap-2.5 mt-1">
            <button type="button" onClick={resetForm} className="btn btn-secondary sm:px-8">রিসেট</button>
            <button
              type="submit"
              disabled={saving}
              className="btn bg-[#10B981] hover:bg-[#059669] text-white shadow-[0_4px_15px_rgba(16,185,129,0.3)] sm:px-12 disabled:opacity-60"
            >
              {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </button>
          </div>
        </form>

        {selectedRickshaw && (
          <div className="mt-4 pt-3 border-t border-white/10 text-xs md:text-sm text-white/60 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5 font-mono font-bold text-[#00f2fe]">
              <Hash size={13} /> {selectedRickshaw.identity_no || 'N/A'}
            </span>
            <span>রেজিস্ট্রেশন: <span className="text-white/90 font-semibold">{selectedRickshaw.registration_number}</span></span>
            {selectedRickshaw.vehicle_type && <span>ধরন: <span className="text-white/90">{selectedRickshaw.vehicle_type}</span></span>}
            {selectedAssignment ? (
              <span className="inline-flex items-center gap-1.5">
                <User size={13} className="text-[#00f2fe]" />
                ড্রাইভার: <span className="text-white/90 font-semibold">{selectedAssignment.drivers?.name || 'N/A'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-400/90">
                <AlertTriangle size={13} /> কোনো ড্রাইভার অ্যাসাইন করা নেই
              </span>
            )}
          </div>
        )}
      </div>

      {/* Recent deposits */}
      <div className="glass-panel panel-pad w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 className="panel-title text-[#10B981] !mb-0">
            <ArrowUpCircle size={20} /> সাম্প্রতিক জমা সমূহ
          </h3>

          <div className="w-full sm:w-auto min-w-[200px]">
            <select
              className="form-input py-2 text-sm"
              value={filterRickshawId}
              onChange={(e) => setFilterRickshawId(e.target.value)}
            >
              <option value="">সব রিকশা/অটো (All)</option>
              {rickshaws.map(r => (
                <option key={r.id} value={r.id}>
                  ID: {r.identity_no || 'N/A'} - {r.registration_number}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-white/60 animate-pulse text-center py-8">লোড হচ্ছে...</p>
        ) : filteredIncomes.length === 0 ? (
          <p className="text-white/60 text-center py-8">কোনো রেকর্ড পাওয়া যায়নি।</p>
        ) : (
          <>
          {/* Phone view: one card per record instead of a 8-column table */}
          <div className="md:hidden flex flex-col gap-2.5">
            {filteredIncomes.map(income => (
              <div key={income.id} className="rec-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    {income.rickshaws ? (
                      <span className="inline-flex items-center gap-1.5 flex-wrap">
                        <span className="id-badge">{income.rickshaws.identity_no || 'N/A'}</span>
                        <span className="text-white/85 text-sm font-semibold">{income.rickshaws.registration_number}</span>
                      </span>
                    ) : (
                      <span className="text-white/40 text-sm">গাড়ি নেই</span>
                    )}
                    {income.drivers?.name && (
                      <span className="flex items-center gap-1.5 text-xs text-white/70">
                        <User size={11} className="text-[#00f2fe] shrink-0" /> {income.drivers.name}
                      </span>
                    )}
                    <span className="text-white/45 text-xs font-mono">{formatDate(income.date)}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-bold text-[#10B981] text-base">৳ {bn(income.amount)}</span>
                    {isAdmin && (
                      <button
                      onClick={() => handleDelete(income.id)}
                      className="p-2 text-red-400 rounded-lg active:bg-white/10"
                      aria-label="মুছে ফেলুন"
                    >
                      <Trash2 size={15} />
                    </button>
                    )}
                  </div>
                </div>

                <div className="rec-row">
                  <span className="rec-key">জমার ধরণ</span>
                  <span className="rec-val text-xs">{income.income_particulars || '—'}</span>
                </div>

                <div className="rec-row">
                  <span className="rec-key">দৈনিক জমা</span>
                  <span className="rec-val text-sm">
                    {income.daily_joma_amount != null ? `৳ ${bn(income.daily_joma_amount)}` : '—'}
                  </span>
                </div>

                {Number(income.due_amount || 0) > 0 && (
                  <div className="rec-row">
                    <span className="rec-key">বাকী</span>
                    <span className="font-bold text-amber-400 text-sm">৳ {bn(income.due_amount)}</span>
                  </div>
                )}

                {income.remarks && (
                  <div className="rec-row">
                    <span className="rec-key">মন্তব্য</span>
                    <span className="rec-val text-xs text-white/60">{income.remarks}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tablet and up: the full table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse data-table">
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
                {filteredIncomes.map(income => (
                  <tr key={income.id} className="hover:bg-white/5 transition-colors duration-150">
                    <td className="p-4 whitespace-nowrap text-white/70 font-mono">{formatDate(income.date)}</td>
                    <td className="p-4 whitespace-nowrap">
                      {income.rickshaws ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="id-badge">{income.rickshaws.identity_no || 'N/A'}</span>
                          <span className="text-white/80">{income.rickshaws.registration_number}</span>
                        </span>
                      ) : (
                        <span className="text-white/40">N/A</span>
                      )}
                      {income.drivers?.name && (
                        <span className="flex items-center gap-1.5 text-xs text-white/55 mt-1">
                          <User size={11} className="text-[#00f2fe]" /> {income.drivers.name}
                        </span>
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
                      {isAdmin && (
                        <button
                        onClick={() => handleDelete(income.id)}
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
