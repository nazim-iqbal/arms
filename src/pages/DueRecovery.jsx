import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { today, formatDate, bn } from '../lib/date';
import { buildDueBalances, listDebtors, orphanDue as sumOrphanDue } from '../lib/due';
import {
  HandCoins, Plus, Trash2, Hash, User, Wallet, AlertTriangle,
  MessageSquare, CarFront, CheckCircle2
} from 'lucide-react';

export default function DueRecovery() {
  // Only an admin may delete; everyone else can add and edit
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  const [drivers, setDrivers] = useState([]);
  const [dueRows, setDueRows] = useState([]);        // deposits that left a বাকী
  const [recoveries, setRecoveries] = useState([]);  // everything recovered so far
  const [assignments, setAssignments] = useState([]);// current driver -> vehicle
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [driverId, setDriverId] = useState('');
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      const [dRes, iRes, rRes, aRes] = await Promise.all([
        supabase.from('drivers').select('id, name, phone').order('name', { ascending: true }),
        supabase
          .from('daily_incomes')
          .select('driver_id, rickshaw_id, due_amount, date, rickshaws(identity_no, registration_number)')
          .gt('due_amount', 0)
          .order('date', { ascending: false }),
        supabase
          .from('due_recoveries')
          .select('*, drivers(name, phone), rickshaws(identity_no, registration_number)')
          .order('recovery_date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('driver_vehicle_assignments')
          .select('driver_id, rickshaw_id, rickshaws(identity_no, registration_number)')
          .eq('status', 'active'),
      ]);

      if (dRes.error) throw dRes.error;
      if (iRes.error) throw iRes.error;
      if (rRes.error) throw rRes.error;
      if (aRes.error) throw aRes.error;

      setDrivers(dRes.data || []);
      setDueRows(iRes.data || []);
      setRecoveries(rRes.data || []);
      setAssignments(aRes.data || []);
    } catch (error) {
      alert('Error fetching due recovery data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  /* Running balance per driver: total বাকী raised minus everything recovered. */
  const balances = useMemo(() => buildDueBalances(dueRows, recoveries), [dueRows, recoveries]);

  /* Deposits with no driver recorded — their বাকী can't be assigned to anyone */
  const orphanDue = useMemo(() => sumOrphanDue(dueRows), [dueRows]);

  /* Vehicle shown in the read-only field: the driver's current vehicle, or
     failing that the one their most recent বাকী came from. */
  const selectedVehicle = useMemo(() => {
    if (!driverId) return null;
    const active = assignments.find((a) => a.driver_id === driverId);
    if (active?.rickshaws) return { ...active.rickshaws, id: active.rickshaw_id, source: 'active' };
    const b = balances[driverId];
    if (b?.lastVehicle) return { ...b.lastVehicle, id: b.lastVehicleId, source: 'last' };
    return null;
  }, [driverId, assignments, balances]);

  const outstanding = driverId ? (balances[driverId]?.outstanding || 0) : 0;

  const debtors = useMemo(() => listDebtors(balances, drivers), [balances, drivers]);

  const totalOutstanding = debtors.reduce((s, b) => s + b.outstanding, 0);
  const totalRecovered = recoveries.reduce((s, r) => s + Number(r.amount || 0), 0);
  const todaysRecovered = recoveries
    .filter((r) => r.recovery_date === today())
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  function resetForm() {
    setDriverId('');
    setDate(today());
    setAmount('');
    setRemarks('');
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!driverId) {
      alert('অনুগ্রহ করে একজন ড্রাইভার নির্বাচন করুন।');
      return;
    }
    const value = Number(amount || 0);
    if (value <= 0) {
      alert('জমার পরিমাণ সঠিকভাবে দিন।');
      return;
    }
    if (value > outstanding) {
      const ok = window.confirm(
        `এই ড্রাইভারের মোট বাকী ৳ ${bn(outstanding)}, কিন্তু আপনি ৳ ${bn(value)} জমা দিচ্ছেন।\nআপনি কি নিশ্চিত?`
      );
      if (!ok) return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.from('due_recoveries').insert([{
        driver_id: driverId,
        rickshaw_id: selectedVehicle?.id || null,
        due_total: outstanding,
        amount: value,
        recovery_date: date,
        remarks: remarks || null,
      }]);

      if (error) throw error;

      await fetchData();
      resetForm();
    } catch (error) {
      alert('Error saving recovery: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!isAdmin) return;
    if (!window.confirm('আপনি কি নিশ্চিত যে এই আদায়ের রেকর্ডটি মুছে ফেলতে চান?\nমুছে ফেললে টাকাটি আবার বাকীতে যোগ হয়ে যাবে।')) return;
    try {
      const { error } = await supabase.from('due_recoveries').delete().eq('id', id);
      if (error) throw error;
      setRecoveries(recoveries.filter((r) => r.id !== id));
    } catch (error) {
      alert('Error deleting record: ' + error.message);
    }
  }

  return (
    <div className="flex flex-col gap-3 md:gap-6">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-gradient-to-r from-amber-500/10 via-[#00f2fe]/10 to-transparent p-3.5 md:p-5 rounded-xl md:rounded-2xl border border-amber-500/20">
        <div className="min-w-0">
          <h2 className="text-lg md:text-2xl font-bold text-white flex items-center gap-2">
            <HandCoins className="text-amber-400 shrink-0 w-5 h-5 md:w-7 md:h-7" />
            বাকী আদায় (Due Recovery)
          </h2>
          <p className="hidden md:block text-white/70 text-sm mt-1">
            ড্রাইভার নির্বাচন করলে তার গাড়ির পরিচিতি নম্বর ও মোট বাকীর পরিমাণ স্বয়ংক্রিয়ভাবে চলে আসবে। আদায়কৃত টাকা জমা দিলে বাকী সেই পরিমাণ কমে যাবে।
          </p>
        </div>
        <div className="grid grid-cols-3 md:flex gap-2 shrink-0">
          <div className="px-2.5 py-2 md:px-5 md:py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
            <div className="text-[10px] md:text-[11px] uppercase tracking-wider text-white/50">ড্রাইভারদের বাকী</div>
            <div className="text-sm md:text-xl font-bold text-amber-400">৳ {bn(totalOutstanding)}</div>
          </div>
          <div className="px-2.5 py-2 md:px-5 md:py-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 text-center">
            <div className="text-[10px] md:text-[11px] uppercase tracking-wider text-white/50">আজ আদায়</div>
            <div className="text-sm md:text-xl font-bold text-[#10B981]">৳ {bn(todaysRecovered)}</div>
          </div>
          <div className="px-2.5 py-2 md:px-5 md:py-3 rounded-xl bg-[#00f2fe]/10 border border-[#00f2fe]/30 text-center">
            <div className="text-[10px] md:text-[11px] uppercase tracking-wider text-white/50">সর্বমোট আদায়</div>
            <div className="text-sm md:text-xl font-bold text-[#00f2fe]">৳ {bn(totalRecovered)}</div>
          </div>
        </div>
      </div>

      {/* Entry Form */}
      <div className="glass-panel panel-pad w-full border-t-4 border-t-amber-500">
        <h3 className="panel-title text-amber-400">
          <Plus size={20} /> নতুন আদায় এন্ট্রি
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 items-start">

          {/* 1. Driver */}
          <div className="form-group !mb-0">
            <label className="form-label">ড্রাইভারের নাম (Driver)</label>
            <select
              className="form-input font-semibold"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              required
            >
              <option value="">-- ড্রাইভার নির্বাচন করুন --</option>
              {drivers.map((d) => {
                const bal = balances[d.id]?.outstanding || 0;
                return (
                  <option key={d.id} value={d.id}>
                    {d.name}{d.phone ? ` (${d.phone})` : ''}{bal > 0 ? ` — বাকী ৳${bal}` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 2. Vehicle identity no (auto) */}
          <div className="form-group !mb-0">
            <label className="form-label">রিক্সার পরিচিতি নম্বর (Auto-filled)</label>
            <div className="relative">
              <input
                type="text"
                className="form-input bg-white/5 text-[#00f2fe] font-mono font-bold cursor-not-allowed"
                value={
                  selectedVehicle
                    ? `${selectedVehicle.identity_no || 'N/A'} — ${selectedVehicle.registration_number || ''}`
                    : ''
                }
                readOnly
                placeholder={driverId ? 'এই ড্রাইভারের কোনো গাড়ি পাওয়া যায়নি' : 'ড্রাইভার সিলেক্ট করলে চলে আসবে'}
              />
              <CarFront size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00f2fe]/50 pointer-events-none" />
            </div>
            {driverId && selectedVehicle?.source === 'last' && (
              <p className="text-white/50 text-xs mt-1.5">
                বর্তমানে কোনো গাড়িতে নিয়োজিত নয় — সর্বশেষ যে গাড়ির বাকী, সেটি দেখানো হচ্ছে।
              </p>
            )}
          </div>

          {/* 3. Outstanding due (auto) */}
          <div className="form-group !mb-0">
            <label className="form-label">বাকীর পরিমাণ (মোট ৳)</label>
            <div className="relative">
              <input
                type="text"
                className={`form-input bg-white/5 font-bold text-lg cursor-not-allowed ${outstanding > 0 ? 'text-amber-400 border-amber-500/40' : 'text-white/60'}`}
                value={driverId ? bn(outstanding) : ''}
                readOnly
                placeholder="ড্রাইভার সিলেক্ট করলে চলে আসবে"
              />
              <AlertTriangle size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400/50 pointer-events-none" />
            </div>
            {driverId && outstanding <= 0 && (
              <p className="text-[#10B981] text-xs mt-1.5 flex items-center gap-1.5">
                <CheckCircle2 size={13} /> এই ড্রাইভারের কোনো বাকী নেই।
              </p>
            )}
          </div>

          {/* 4. Amount being recovered */}
          <div className="form-group !mb-0">
            <label className="form-label">জমার পরিমাণ (৳)</label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="form-input text-[#10B981] font-bold text-lg"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                required
              />
              <Wallet size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#10B981]/50 pointer-events-none" />
            </div>
            {driverId && outstanding > 0 && Number(amount || 0) > 0 && (
              <p className="text-white/50 text-xs mt-1.5">
                জমার পর অবশিষ্ট বাকী: <span className="text-amber-400 font-semibold">৳ {bn(Math.max(outstanding - Number(amount), 0))}</span>
              </p>
            )}
          </div>

          {/* 5. Date */}
          <div className="form-group !mb-0">
            <label className="form-label">জমার তারিখ (Date)</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* 6. Remarks */}
          <div className="form-group !mb-0">
            <label className="form-label">মন্তব্য (Remarks)</label>
            <div className="relative">
              <input
                type="text"
                className="form-input pl-11"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="যেমনঃ আংশিক পরিশোধ"
              />
              <MessageSquare size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-3 grid grid-cols-2 sm:flex sm:justify-end gap-2.5 mt-1">
            <button type="button" onClick={resetForm} className="btn btn-secondary sm:px-8">রিসেট</button>
            <button
              type="submit"
              disabled={saving}
              className="btn bg-amber-500 hover:bg-amber-600 text-white shadow-[0_4px_15px_rgba(245,158,11,0.3)] sm:px-12 disabled:opacity-60"
            >
              {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </button>
          </div>
        </form>
      </div>

      {/* Outstanding balances per driver */}
      <div className="glass-panel panel-pad w-full">
        <h3 className="panel-title text-amber-400">
          <AlertTriangle size={20} /> বাকীদার ড্রাইভার ({bn(debtors.length)})
        </h3>

        {orphanDue > 0 && (
          <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-xs md:text-sm">
            ৳ {bn(orphanDue)} বাকী কোনো ড্রাইভারের নামে নেই — ঐ জমা এন্ট্রিগুলোর সময় গাড়িতে কোনো ড্রাইভার
            অ্যাসাইন করা ছিল না। "Assign Driver" পেজ থেকে ড্রাইভার অ্যাসাইন করে নতুন এন্ট্রি দিলে এটি আর হবে না।
          </div>
        )}

        {loading ? (
          <p className="text-white/60 animate-pulse text-center py-8">লোড হচ্ছে...</p>
        ) : debtors.length === 0 ? (
          <p className="text-white/60 text-center py-8">কারো কোনো বাকী নেই।</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {debtors.map((b) => (
              <button
                key={b.driverId}
                type="button"
                onClick={() => setDriverId(b.driverId)}
                className={`rec-card text-left transition-colors ${driverId === b.driverId ? 'border-amber-500/60 bg-amber-500/10' : 'md:hover:bg-white/10'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-bold text-white text-sm truncate">
                    <User size={13} className="text-[#00f2fe] shrink-0" /> {b.driver.name}
                  </span>
                  <span className="font-bold text-amber-400 shrink-0">৳ {bn(b.outstanding)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-white/50">
                  <span>মোট বাকী ৳ {bn(b.due)} · আদায় ৳ {bn(b.recovered)}</span>
                  {b.lastVehicle?.identity_no && (
                    <span className="id-badge shrink-0"><Hash size={10} />{b.lastVehicle.identity_no}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recovery history */}
      <div className="glass-panel panel-pad w-full">
        <h3 className="panel-title text-[#10B981]">
          <HandCoins size={20} /> সাম্প্রতিক আদায় সমূহ
        </h3>

        {loading ? (
          <p className="text-white/60 animate-pulse text-center py-8">লোড হচ্ছে...</p>
        ) : recoveries.length === 0 ? (
          <p className="text-white/60 text-center py-8">এখনো কোনো আদায় এন্ট্রি হয়নি।</p>
        ) : (
          <>
          {/* Phone view */}
          <div className="md:hidden flex flex-col gap-2.5">
            {recoveries.map((r) => (
              <div key={r.id} className="rec-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="flex items-center gap-1.5 font-bold text-white text-sm truncate">
                      <User size={13} className="text-[#00f2fe] shrink-0" /> {r.drivers?.name || 'N/A'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 flex-wrap">
                      {r.rickshaws ? (
                        <>
                          <span className="id-badge">{r.rickshaws.identity_no || 'N/A'}</span>
                          <span className="text-white/70 text-xs">{r.rickshaws.registration_number}</span>
                        </>
                      ) : (
                        <span className="text-white/40 text-xs">গাড়ি নেই</span>
                      )}
                    </span>
                    <span className="text-white/45 text-xs font-mono">{formatDate(r.recovery_date)}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-bold text-[#10B981] text-base">৳ {bn(r.amount)}</span>
                    {isAdmin && (
                      <button
                      onClick={() => handleDelete(r.id)}
                      className="p-2 text-red-400 rounded-lg active:bg-white/10"
                      aria-label="মুছে ফেলুন"
                    >
                      <Trash2 size={15} />
                    </button>
                    )}
                  </div>
                </div>

                <div className="rec-row">
                  <span className="rec-key">তখনকার বাকী</span>
                  <span className="rec-val text-sm">৳ {bn(r.due_total)}</span>
                </div>

                {r.remarks && (
                  <div className="rec-row">
                    <span className="rec-key">মন্তব্য</span>
                    <span className="rec-val text-xs text-white/60">{r.remarks}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tablet and up */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse data-table">
              <thead>
                <tr className="border-b border-white/10 text-white/60 text-xs uppercase tracking-wider bg-white/5">
                  <th className="p-4">তারিখ</th>
                  <th className="p-4">ড্রাইভার</th>
                  <th className="p-4">রিক্সা নাম্বার</th>
                  <th className="p-4 text-right">তখনকার বাকী</th>
                  <th className="p-4 text-right">জমার পরিমাণ</th>
                  <th className="p-4">মন্তব্য</th>
                  <th className="p-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-white/80">
                {recoveries.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors duration-150">
                    <td className="p-4 whitespace-nowrap text-white/70 font-mono">{formatDate(r.recovery_date)}</td>
                    <td className="p-4 font-semibold text-white whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <User size={14} className="text-[#00f2fe]" /> {r.drivers?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {r.rickshaws ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="id-badge">{r.rickshaws.identity_no || 'N/A'}</span>
                          <span className="text-white/80">{r.rickshaws.registration_number}</span>
                        </span>
                      ) : (
                        <span className="text-white/40">N/A</span>
                      )}
                    </td>
                    <td className="p-4 text-right text-amber-400/80">৳ {bn(r.due_total)}</td>
                    <td className="p-4 text-right font-bold text-[#10B981]">৳ {bn(r.amount)}</td>
                    <td className="p-4 text-white/60 max-w-[220px] truncate" title={r.remarks || ''}>
                      {r.remarks || '—'}
                    </td>
                    <td className="p-4 text-right">
                      {isAdmin && (
                        <button
                        onClick={() => handleDelete(r.id)}
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
