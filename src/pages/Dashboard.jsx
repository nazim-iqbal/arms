import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { today, daysAgo, formatDate, bn } from '../lib/date';
import { buildDueBalances, listDebtors, orphanDue } from '../lib/due';
import { useBranch } from '../contexts/BranchContext';
import {
  CarFront, Users, DollarSign, TrendingUp, TrendingDown, Activity,
  X, ChevronRight, RefreshCw, Loader2, AlertTriangle, Wallet, Hash, Phone, Menu, User, HandCoins,
  Search, CalendarRange, Building2, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Quick actions — the three entry forms, one tap away on a phone      */
/* without going through the sidebar                                   */
/* ------------------------------------------------------------------ */
const QUICK_ACTIONS = [
  { to: '/deposits',     label: 'Deposit Entry', icon: ArrowUpCircle,   color: 'text-emerald-400', tile: 'bg-emerald-500/10 border-emerald-500/25' },
  { to: '/expenses',     label: 'Expense Entry', icon: ArrowDownCircle, color: 'text-rose-400',    tile: 'bg-rose-500/10 border-rose-500/25' },
  { to: '/due-recovery', label: 'Due Recovery',  icon: HandCoins,       color: 'text-amber-400',   tile: 'bg-amber-500/10 border-amber-500/25' },
];

/* ------------------------------------------------------------------ */
/* Stat card — tap to open the matching detail report                  */
/* ------------------------------------------------------------------ */
const StatCard = ({ title, value, subValue, icon: Icon, gradient, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{ background: gradient }}
    className="glass-panel border-none shadow-lg text-white text-left w-full
      p-3.5 sm:p-4 md:p-6 flex items-center gap-3 md:gap-5
      active:scale-[0.98] transition-transform duration-150"
  >
    <div className="p-2.5 md:p-4 bg-white/20 rounded-xl shrink-0">
      <Icon className="w-5 h-5 md:w-8 md:h-8" />
    </div>

    <div className="min-w-0 flex-1">
      <p className="m-0 text-[10px] md:text-xs opacity-90 uppercase tracking-wider font-semibold truncate">
        {title}
      </p>
      <h2 className="m-0 mt-0.5 text-lg md:text-3xl text-white font-bold truncate">{value}</h2>
      {subValue && <p className="m-0 mt-0.5 text-[10px] md:text-sm opacity-80 truncate">{subValue}</p>}
    </div>

    <ChevronRight className="w-4 h-4 md:w-5 md:h-5 opacity-70 shrink-0" />
  </button>
);

/* ------------------------------------------------------------------ */
/* Report container: bottom sheet on phones, centred dialog on desktop */
/* ------------------------------------------------------------------ */
const ReportSheet = ({ title, subtitle, icon: Icon, loading, error, onClose, onRefresh, children }) => {
  // Lock the page behind the sheet and wire up Escape
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm md:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-3xl bg-[#111119] border border-white/10 rounded-t-2xl md:rounded-2xl
          max-h-[92vh] md:max-h-[85vh] flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.6)]"
      >
        {/* Grab handle (mobile affordance) */}
        <div className="md:hidden pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/25" />
        </div>

        <header className="flex items-start justify-between gap-3 px-4 md:px-6 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon size={20} className="text-[#00f2fe] shrink-0" />
            <div className="min-w-0">
              <h3 className="text-base md:text-lg font-bold text-white truncate">{title}</h3>
              {subtitle && <p className="text-[11px] md:text-xs text-white/50 truncate">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="রিফ্রেশ"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="বন্ধ করুন"
            >
              <X size={19} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-white/50">
              <Loader2 size={30} className="animate-spin text-[#00f2fe]" />
              <span className="text-sm">রিপোর্ট লোড হচ্ছে...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <AlertTriangle size={30} className="text-amber-400" />
              <p className="text-white/70 text-sm">{error}</p>
              <button onClick={onRefresh} className="btn btn-secondary mt-1">আবার চেষ্টা করুন</button>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
};

/* Small summary tiles shown at the top of every report */
const Summary = ({ items }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
    {items.map((it) => (
      <div key={it.label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        <div className="text-[10px] uppercase tracking-wider text-white/45">{it.label}</div>
        <div className={`text-base md:text-lg font-bold mt-0.5 ${it.color || 'text-white'}`}>{it.value}</div>
      </div>
    ))}
  </div>
);

const Empty = ({ text }) => (
  <p className="text-white/50 text-center py-12 text-sm">{text}</p>
);

/* Vehicle label used in every report row */
const VehicleTag = ({ rickshaw, fallback = 'সাধারণ' }) =>
  rickshaw ? (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="id-badge"><Hash size={11} />{rickshaw.identity_no || 'N/A'}</span>
      <span className="text-white/85 text-sm font-semibold">{rickshaw.registration_number}</span>
    </span>
  ) : (
    <span className="text-white/40 text-sm">{fallback}</span>
  );

/* ------------------------------------------------------------------ */

/* Selectable time windows for the stat cards. `back` = how many days before
   today the window starts; `single` marks a one-day window (গতকাল). */
const RANGES = [
  { key: 'today', label: 'আজ', back: 0 },
  { key: 'yesterday', label: 'গতকাল', back: 1, single: true },
  { key: '3d', label: 'গত ৩ দিন', back: 2 },
  { key: '7d', label: 'গত ৭ দিন', back: 6 },
  { key: '30d', label: 'গত মাস', back: 29 },
  { key: 'all', label: 'সকল', all: true },
];

function resolveRange(key) {
  const r = RANGES.find((x) => x.key === key) || RANGES[0];
  if (r.all) {
    return { key: r.key, label: r.label, from: '2000-01-01', to: today(), all: true };
  }
  const from = daysAgo(r.back);
  return { key: r.key, label: r.label, from, to: r.single ? from : today() };
}

const REPORTS = {
  income: { title: 'জমার বিস্তারিত', icon: TrendingUp, ranged: true },
  expense: { title: 'খরচের বিস্তারিত', icon: TrendingDown, ranged: true },
  profit: { title: 'লাভ-ক্ষতির হিসাব', icon: DollarSign, ranged: true },
  due: { title: 'বাকীর বিস্তারিত হিসাব', icon: HandCoins },
  vehicles: { title: 'গাড়ির তালিকা ও অবস্থা', icon: CarFront },
  drivers: { title: 'ড্রাইভারদের তালিকা', icon: Users },
};

export default function Dashboard() {
  // Every figure on this screen belongs to the শাখা chosen in the header
  const { activeBranchId, scopeQuery, activeBranch, isAllBranches } = useBranch();

  const [stats, setStats] = useState({
    totalRickshaws: 0,
    activeRickshaws: 0,
    totalDrivers: 0,
    income: 0,
    expense: 0,
    newDue: 0,
    recovered: 0,
    outstandingDue: 0,
    debtorCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Time window: one of the RANGES presets, or 'custom' with a searched range
  const [rangeKey, setRangeKey] = useState('today');
  const [customDraft, setCustomDraft] = useState(() => ({ from: daysAgo(6), to: today() }));
  const [customRange, setCustomRange] = useState(() => ({ from: daysAgo(6), to: today() }));

  const range = rangeKey === 'custom'
    ? { key: 'custom', label: 'কাস্টম', from: customRange.from, to: customRange.to }
    : resolveRange(rangeKey);

  // Report sheet state
  const [reportKey, setReportKey] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  // Re-pull whenever the selected time window changes (customRange only gets a
  // new object when the user actually presses সার্চ, so typing does not refetch)
  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey, customRange, activeBranchId]);

  function applyCustomRange() {
    const { from, to } = customDraft;
    if (!from || !to) {
      alert('ফ্রম ডেট এবং টু ডেট দুটোই দিন।');
      return;
    }
    if (from > to) {
      alert('ফ্রম ডেট টু ডেটের পরে হতে পারে না।');
      return;
    }
    setCustomRange({ from, to });
    setRangeKey('custom');
  }

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const { from, to } = range;

      const [rRes, dRes, iRes, eRes, recRes, allDueRes, allRecRes] = await Promise.all([
        scopeQuery(supabase.from('rickshaws').select('status')),
        scopeQuery(supabase.from('drivers').select('*', { count: 'exact', head: true })),
        scopeQuery(supabase.from('daily_incomes').select('amount, due_amount')).gte('date', from).lte('date', to),
        scopeQuery(supabase.from('daily_expenses').select('amount')).gte('date', from).lte('date', to),
        scopeQuery(supabase.from('due_recoveries').select('amount')).gte('recovery_date', from).lte('recovery_date', to),
        // Whole history — the outstanding বাকী is a running balance, not a period figure
        scopeQuery(supabase.from('daily_incomes').select('driver_id, due_amount')).gt('due_amount', 0),
        scopeQuery(supabase.from('due_recoveries').select('driver_id, amount')),
      ]);

      if (rRes.error) throw rRes.error;
      if (dRes.error) throw dRes.error;
      if (iRes.error) throw iRes.error;
      if (eRes.error) throw eRes.error;
      if (recRes.error) throw recRes.error;
      if (allDueRes.error) throw allDueRes.error;
      if (allRecRes.error) throw allRecRes.error;

      const rickshaws = rRes.data || [];
      const incomes = iRes.data || [];
      const expenses = eRes.data || [];
      const recovered = (recRes.data || []).reduce((s, r) => s + Number(r.amount || 0), 0);

      const allDue = allDueRes.data || [];
      const allRec = allRecRes.data || [];
      const raised = allDue.reduce((s, r) => s + Number(r.due_amount || 0), 0);
      const paidBack = allRec.reduce((s, r) => s + Number(r.amount || 0), 0);
      const debtors = Object.values(buildDueBalances(allDue, allRec)).filter((b) => b.outstanding > 0);

      setStats({
        totalRickshaws: rickshaws.length,
        activeRickshaws: rickshaws.filter((r) => r.status === 'active').length,
        totalDrivers: dRes.count || 0,
        // Cash in for the window = daily deposits + বাকী recovered in it
        income: incomes.reduce((s, i) => s + Number(i.amount || 0), 0) + recovered,
        expense: expenses.reduce((s, e) => s + Number(e.amount || 0), 0),
        newDue: incomes.reduce((s, i) => s + Number(i.due_amount || 0), 0),
        recovered,
        outstandingDue: Math.max(raised - paidBack, 0),
        debtorCount: debtors.length,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error.message);
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- Report loading ---------------- */

  async function loadReport(key) {
    const { from, to } = range;

    if (key === 'income') {
      const [iRes, recRes] = await Promise.all([
        scopeQuery(supabase
          .from('daily_incomes')
          .select('*, rickshaws(identity_no, registration_number, vehicle_type), drivers(name)'))
          .gte('date', from).lte('date', to)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),
        scopeQuery(supabase
          .from('due_recoveries')
          .select('*, rickshaws(identity_no, registration_number), drivers(name)'))
          .gte('recovery_date', from).lte('recovery_date', to)
          .order('recovery_date', { ascending: false })
          .order('created_at', { ascending: false }),
      ]);
      if (iRes.error) throw iRes.error;
      if (recRes.error) throw recRes.error;
      return { rows: iRes.data || [], recoveries: recRes.data || [] };
    }

    if (key === 'expense') {
      const { data, error } = await scopeQuery(supabase
        .from('daily_expenses')
        .select('*, rickshaws(identity_no, registration_number, vehicle_type)'))
        .gte('date', from).lte('date', to)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { rows: data || [] };
    }

    if (key === 'profit') {
      const [iRes, eRes, recRes] = await Promise.all([
        scopeQuery(supabase
          .from('daily_incomes')
          .select('rickshaw_id, amount, due_amount, rickshaws(identity_no, registration_number)'))
          .gte('date', from).lte('date', to),
        scopeQuery(supabase
          .from('daily_expenses')
          .select('rickshaw_id, amount, rickshaws(identity_no, registration_number)'))
          .gte('date', from).lte('date', to),
        scopeQuery(supabase
          .from('due_recoveries')
          .select('rickshaw_id, amount, rickshaws(identity_no, registration_number)'))
          .gte('recovery_date', from).lte('recovery_date', to),
      ]);
      if (iRes.error) throw iRes.error;
      if (eRes.error) throw eRes.error;
      if (recRes.error) throw recRes.error;
      // Recovered বাকী is cash in for the window, same as a deposit
      return {
        incomes: [...(iRes.data || []), ...(recRes.data || [])],
        expenses: eRes.data || [],
        recovered: (recRes.data || []).reduce((s, r) => s + Number(r.amount || 0), 0),
      };
    }

    if (key === 'due') {
      const [dueRes, recRes, drvRes] = await Promise.all([
        scopeQuery(supabase
          .from('daily_incomes')
          .select('driver_id, rickshaw_id, due_amount, date, rickshaws(identity_no, registration_number)'))
          .gt('due_amount', 0),
        scopeQuery(supabase.from('due_recoveries').select('driver_id, amount, recovery_date')),
        scopeQuery(supabase.from('drivers').select('id, name, phone, branch_id')),
      ]);
      if (dueRes.error) throw dueRes.error;
      if (recRes.error) throw recRes.error;
      if (drvRes.error) throw drvRes.error;

      const dueRows = dueRes.data || [];
      const recRows = recRes.data || [];
      const balances = buildDueBalances(dueRows, recRows);

      return {
        debtors: listDebtors(balances, drvRes.data || []),
        raised: dueRows.reduce((s, r) => s + Number(r.due_amount || 0), 0),
        recovered: recRows.reduce((s, r) => s + Number(r.amount || 0), 0),
        // Recovered inside the selected window only
        periodRecovered: recRows
          .filter((r) => r.recovery_date >= from && r.recovery_date <= to)
          .reduce((s, r) => s + Number(r.amount || 0), 0),
        orphan: orphanDue(dueRows),
      };
    }

    if (key === 'vehicles') {
      const { data, error } = await scopeQuery(supabase
        .from('rickshaws')
        .select('*'))
        .order('identity_no', { ascending: true });
      if (error) throw error;
      return { rows: data || [] };
    }

    if (key === 'drivers') {
      const [dRes, aRes] = await Promise.all([
        scopeQuery(supabase.from('drivers').select('id, name, phone, nid_no, branch_id'))
          .order('name', { ascending: true }),
        scopeQuery(supabase
          .from('driver_vehicle_assignments')
          .select('driver_id, assign_date, rickshaws(identity_no, registration_number)'))
          .eq('status', 'active'),
      ]);
      if (dRes.error) throw dRes.error;
      if (aRes.error) throw aRes.error;

      const byDriver = {};
      (aRes.data || []).forEach((a) => { byDriver[a.driver_id] = a; });

      return {
        rows: (dRes.data || []).map((d) => ({ ...d, assignment: byDriver[d.id] || null })),
      };
    }

    return null;
  }

  async function openReport(key) {
    setReportKey(key);
    setReportData(null);
    setReportError('');
    setReportLoading(true);
    try {
      setReportData(await loadReport(key));
    } catch (error) {
      setReportError('রিপোর্ট আনা যায়নি: ' + error.message);
    } finally {
      setReportLoading(false);
    }
  }

  // Stable identity so ReportSheet's scroll-lock effect does not re-run every render
  const closeReport = useCallback(() => {
    setReportKey(null);
    setReportData(null);
    setReportError('');
  }, []);

  /* ---------------- Report bodies ---------------- */

  function renderReportBody() {
    if (!reportData) return null;

    // Multi-day windows need a date on every row to stay readable
    const multiDay = range.from !== range.to;
    const dateRow = (value) => multiDay && (
      <div className="rec-row">
        <span className="rec-key">তারিখ</span>
        <span className="rec-val text-xs font-mono">{formatDate(value)}</span>
      </div>
    );

    if (reportKey === 'income') {
      const { rows, recoveries } = reportData;
      const cash = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
      const due = rows.reduce((s, r) => s + Number(r.due_amount || 0), 0);
      const recovered = recoveries.reduce((s, r) => s + Number(r.amount || 0), 0);

      return (
        <>
          <Summary items={[
            { label: 'দৈনিক জমা', value: `৳ ${bn(cash)}`, color: 'text-[#10B981]' },
            { label: 'বাকী আদায়', value: `৳ ${bn(recovered)}`, color: 'text-[#00f2fe]' },
            { label: 'সর্বমোট ক্যাশ', value: `৳ ${bn(cash + recovered)}`, color: 'text-[#10B981]' },
            { label: 'নতুন বাকী', value: `৳ ${bn(due)}`, color: 'text-amber-400' },
            { label: 'এন্ট্রি সংখ্যা', value: bn(rows.length + recoveries.length) },
          ]} />

          {recoveries.length > 0 && (
            <>
              <p className="text-white/45 text-[11px] uppercase tracking-wider mb-2">বাকী আদায়</p>
              <div className="flex flex-col gap-2.5 mb-4">
                {recoveries.map((r) => (
                  <div key={r.id} className="rec-card border-[#00f2fe]/25">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 font-bold text-white text-sm truncate">
                        <User size={13} className="text-[#00f2fe] shrink-0" /> {r.drivers?.name || 'N/A'}
                      </span>
                      <span className="font-bold text-[#00f2fe] text-base shrink-0">৳ {bn(r.amount)}</span>
                    </div>
                    <div className="rec-row">
                      <span className="rec-key">গাড়ি</span>
                      <span className="rec-val"><VehicleTag rickshaw={r.rickshaws} fallback="—" /></span>
                    </div>
                    {dateRow(r.recovery_date)}
                    {r.remarks && (
                      <div className="rec-row">
                        <span className="rec-key">মন্তব্য</span>
                        <span className="rec-val text-xs text-white/60">{r.remarks}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-white/45 text-[11px] uppercase tracking-wider mb-2">দৈনিক জমা</p>
            </>
          )}

          {rows.length === 0 ? <Empty text="আজ কোনো জমা এন্ট্রি হয়নি।" /> : (
            <div className="flex flex-col gap-2.5">
              {rows.map((r) => (
                <div key={r.id} className="rec-card">
                  <div className="flex items-center justify-between gap-3">
                    <VehicleTag rickshaw={r.rickshaws} fallback="গাড়ি নেই" />
                    <span className="font-bold text-[#10B981] text-base shrink-0">৳ {bn(r.amount)}</span>
                  </div>
                  {r.drivers?.name && (
                    <div className="rec-row">
                      <span className="rec-key">ড্রাইভার</span>
                      <span className="rec-val text-sm">{r.drivers.name}</span>
                    </div>
                  )}
                  {dateRow(r.date)}
                  <div className="rec-row">
                    <span className="rec-key">জমার ধরণ</span>
                    <span className="rec-val text-sm">{r.income_particulars || '—'}</span>
                  </div>
                  <div className="rec-row">
                    <span className="rec-key">দৈনিক জমা</span>
                    <span className="rec-val">{r.daily_joma_amount != null ? `৳ ${bn(r.daily_joma_amount)}` : '—'}</span>
                  </div>
                  {Number(r.due_amount || 0) > 0 && (
                    <div className="rec-row">
                      <span className="rec-key">বাকী</span>
                      <span className="font-bold text-amber-400">৳ {bn(r.due_amount)}</span>
                    </div>
                  )}
                  {r.remarks && (
                    <div className="rec-row">
                      <span className="rec-key">মন্তব্য</span>
                      <span className="rec-val text-white/60 text-xs">{r.remarks}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      );
    }

    if (reportKey === 'expense') {
      const { rows } = reportData;
      const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
      const general = rows.filter((r) => !r.rickshaw_id).reduce((s, r) => s + Number(r.amount || 0), 0);

      return (
        <>
          <Summary items={[
            { label: 'মোট খরচ', value: `৳ ${bn(total)}`, color: 'text-red-400' },
            { label: 'সাধারণ খরচ', value: `৳ ${bn(general)}`, color: 'text-white/80' },
            { label: 'এন্ট্রি সংখ্যা', value: bn(rows.length) },
          ]} />

          {rows.length === 0 ? <Empty text="আজ কোনো খরচ এন্ট্রি হয়নি।" /> : (
            <div className="flex flex-col gap-2.5">
              {rows.map((r) => (
                <div key={r.id} className="rec-card">
                  <div className="flex items-center justify-between gap-3">
                    <VehicleTag rickshaw={r.rickshaws} fallback="সাধারণ খরচ" />
                    <span className="font-bold text-red-400 text-base shrink-0">৳ {bn(r.amount)}</span>
                  </div>
                  {dateRow(r.date)}
                  <div className="rec-row">
                    <span className="rec-key">বিবরণ</span>
                    <span className="rec-val text-sm">{r.expense_particulars || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      );
    }

    if (reportKey === 'profit') {
      const { incomes, expenses } = reportData;
      const totalIn = incomes.reduce((s, r) => s + Number(r.amount || 0), 0);
      const totalOut = expenses.reduce((s, r) => s + Number(r.amount || 0), 0);
      const net = totalIn - totalOut;

      // Per-vehicle breakdown so it is clear which vehicle earned what today
      const byVehicle = {};
      const put = (row, field) => {
        const id = row.rickshaw_id || 'none';
        if (!byVehicle[id]) {
          byVehicle[id] = { id, rickshaw: row.rickshaws || null, income: 0, expense: 0 };
        }
        byVehicle[id][field] += Number(row.amount || 0);
      };
      incomes.forEach((r) => put(r, 'income'));
      expenses.forEach((r) => put(r, 'expense'));

      const list = Object.values(byVehicle).sort(
        (a, b) => (b.income - b.expense) - (a.income - a.expense)
      );

      return (
        <>
          <Summary items={[
            { label: 'মোট জমা', value: `৳ ${bn(totalIn)}`, color: 'text-[#10B981]' },
            { label: 'এর মধ্যে বাকী আদায়', value: `৳ ${bn(reportData.recovered || 0)}`, color: 'text-[#00f2fe]' },
            { label: 'মোট খরচ', value: `৳ ${bn(totalOut)}`, color: 'text-red-400' },
            { label: 'নিট প্রফিট', value: `৳ ${bn(net)}`, color: net >= 0 ? 'text-[#00f2fe]' : 'text-red-400' },
          ]} />

          <p className="text-white/45 text-[11px] uppercase tracking-wider mb-2">গাড়ি ভিত্তিক হিসাব</p>

          {list.length === 0 ? <Empty text="আজ কোনো লেনদেন হয়নি।" /> : (
            <div className="flex flex-col gap-2.5">
              {list.map((v) => {
                const vnet = v.income - v.expense;
                return (
                  <div key={v.id} className="rec-card">
                    <div className="flex items-center justify-between gap-3">
                      <VehicleTag rickshaw={v.rickshaw} fallback="সাধারণ (গাড়ি ছাড়া)" />
                      <span className={`font-bold text-base shrink-0 ${vnet >= 0 ? 'text-[#00f2fe]' : 'text-red-400'}`}>
                        ৳ {bn(vnet)}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-[#10B981]">জমা ৳ {bn(v.income)}</span>
                      <span className="text-red-400">খরচ ৳ {bn(v.expense)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      );
    }

    if (reportKey === 'due') {
      const { debtors, raised, recovered, periodRecovered, orphan } = reportData;

      return (
        <>
          <Summary items={[
            { label: 'চলমান বাকী', value: `৳ ${bn(Math.max(raised - recovered, 0))}`, color: 'text-amber-400' },
            { label: 'সর্বমোট বাকী উঠেছিল', value: `৳ ${bn(raised)}`, color: 'text-white/80' },
            { label: 'সর্বমোট আদায়', value: `৳ ${bn(recovered)}`, color: 'text-[#10B981]' },
            { label: `আদায় (${range.label})`, value: `৳ ${bn(periodRecovered)}`, color: 'text-[#00f2fe]' },
            { label: 'বাকীদার ড্রাইভার', value: bn(debtors.length) },
          ]} />

          {orphan > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-xs md:text-sm">
              ৳ {bn(orphan)} বাকী কোনো ড্রাইভারের নামে নেই — ঐ জমাগুলোর সময় গাড়িতে কেউ অ্যাসাইন করা ছিল না।
              এই অংশটি উপরের "চলমান বাকী"-তে ধরা আছে, কিন্তু নিচের তালিকায় নেই।
            </div>
          )}

          <p className="text-white/45 text-[11px] uppercase tracking-wider mb-2">ড্রাইভার ভিত্তিক বাকী</p>

          {debtors.length === 0 ? <Empty text="কারো কোনো বাকী নেই।" /> : (
            <div className="flex flex-col gap-2.5">
              {debtors.map((b) => (
                <div key={b.driverId} className="rec-card">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 font-bold text-white text-sm truncate">
                      <User size={13} className="text-[#00f2fe] shrink-0" /> {b.driver.name}
                    </span>
                    <span className="font-bold text-amber-400 text-base shrink-0">৳ {bn(b.outstanding)}</span>
                  </div>

                  {b.driver.phone && (
                    <div className="rec-row">
                      <span className="rec-key">মোবাইল</span>
                      <span className="rec-val text-xs font-mono">{b.driver.phone}</span>
                    </div>
                  )}

                  <div className="rec-row">
                    <span className="rec-key">গাড়ি</span>
                    <span className="rec-val"><VehicleTag rickshaw={b.lastVehicle} fallback="—" /></span>
                  </div>

                  <div className="flex gap-4 text-xs border-t border-white/5 pt-2">
                    <span className="text-white/60">উঠেছিল ৳ {bn(b.due)}</span>
                    <span className="text-[#10B981]">আদায় ৳ {bn(b.recovered)}</span>
                    {b.lastDate && <span className="text-white/40 font-mono ml-auto">{formatDate(b.lastDate)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      );
    }

    if (reportKey === 'vehicles') {
      const { rows } = reportData;
      const count = (s) => rows.filter((r) => r.status === s).length;

      return (
        <>
          <Summary items={[
            { label: 'সচল', value: bn(count('active')), color: 'text-[#00f2fe]' },
            { label: 'মেরামতে', value: bn(count('maintenance')), color: 'text-amber-400' },
            { label: 'বন্ধ', value: bn(count('inactive')), color: 'text-red-400' },
            { label: 'রিকশা', value: bn(rows.filter((r) => r.vehicle_type === 'Rickshaw').length) },
            { label: 'অটো', value: bn(rows.filter((r) => r.vehicle_type === 'Auto').length) },
            { label: 'মোট গাড়ি', value: bn(rows.length) },
          ]} />

          {rows.length === 0 ? <Empty text="কোনো গাড়ি নেই।" /> : (
            <div className="flex flex-col gap-2.5">
              {rows.map((r) => (
                <div key={r.id} className="rec-card">
                  <div className="flex items-center justify-between gap-3">
                    <VehicleTag rickshaw={r} />
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold shrink-0 ${
                      r.status === 'active' ? 'bg-[#00f2fe]/20 text-[#00f2fe]'
                        : r.status === 'maintenance' ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {r.status === 'active' ? 'সচল' : r.status === 'maintenance' ? 'মেরামত' : 'বন্ধ'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
                    <span>ধরন: <span className="text-white/85">{r.vehicle_type || 'N/A'}</span></span>
                    <span>অবস্থা: <span className="text-white/85">{r.condition === 'Old' ? 'পুরাতন' : 'নতুন'}</span></span>
                    <span>ক্রয় মূল্য: <span className="text-white/85">৳ {bn(r.purchase_price)}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      );
    }

    if (reportKey === 'drivers') {
      const { rows } = reportData;
      const assigned = rows.filter((d) => d.assignment).length;

      return (
        <>
          <Summary items={[
            { label: 'মোট ড্রাইভার', value: bn(rows.length) },
            { label: 'গাড়িতে নিয়োজিত', value: bn(assigned), color: 'text-[#10B981]' },
            { label: 'খালি আছে', value: bn(rows.length - assigned), color: 'text-amber-400' },
          ]} />

          {rows.length === 0 ? <Empty text="কোনো ড্রাইভার নেই।" /> : (
            <div className="flex flex-col gap-2.5">
              {rows.map((d) => (
                <div key={d.id} className="rec-card">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-white text-sm truncate">{d.name}</span>
                    {d.phone && (
                      <span className="flex items-center gap-1.5 text-xs font-mono text-white/70 shrink-0">
                        <Phone size={12} className="text-[#00f2fe]" /> {d.phone}
                      </span>
                    )}
                  </div>

                  {d.assignment ? (
                    <div className="rec-row">
                      <span className="rec-key">চালাচ্ছে</span>
                      <span className="inline-flex items-center gap-1.5">
                        <VehicleTag rickshaw={d.assignment.rickshaws} />
                      </span>
                    </div>
                  ) : (
                    <div className="rec-row">
                      <span className="rec-key">অবস্থা</span>
                      <span className="text-amber-400/90 text-xs">কোনো গাড়িতে নিয়োজিত নয়</span>
                    </div>
                  )}

                  {d.assignment?.assign_date && (
                    <div className="rec-row">
                      <span className="rec-key">অ্যাসাইন তারিখ</span>
                      <span className="rec-val text-xs font-mono">{formatDate(d.assignment.assign_date)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      );
    }

    return null;
  }

  /* ---------------- Render ---------------- */

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-white/50">
        <Loader2 size={30} className="animate-spin text-[#00f2fe]" />
        <span className="text-sm">ড্যাশবোর্ড লোড হচ্ছে...</span>
      </div>
    );
  }

  const net = stats.income - stats.expense;
  const report = reportKey ? REPORTS[reportKey] : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 md:mb-6">
        <h2 className="flex items-center gap-2 text-[#00f2fe] text-lg md:text-3xl font-bold tracking-tight min-w-0">
          <Activity className="w-5 h-5 md:w-8 md:h-8 shrink-0" />
          <span className="truncate">আজকের ওভারভিউ</span>
        </h2>
        <button
          onClick={fetchDashboardData}
          className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          aria-label="রিফ্রেশ"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* The three entry forms — big tap targets so a phone needs no sidebar */}
      <nav className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 md:mb-5">
        {QUICK_ACTIONS.map(({ to, label, icon: Icon, color, tile }) => (
          <Link
            key={to}
            to={to}
            aria-label={label}
            className={`glass-panel flex flex-col items-center justify-center gap-1.5 px-2 py-3.5 sm:py-4
                        ${tile} active:scale-[0.97]`}
          >
            <Icon className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 ${color}`} />
            <span className="text-[11px] sm:text-sm font-semibold text-white/85 text-center leading-tight">
              {label}
            </span>
          </Link>
        ))}
      </nav>

      {/* Time-window selector — scrolls sideways on narrow phones */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRangeKey(r.key)}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              rangeKey === r.key
                ? 'bg-[#00f2fe]/20 border-[#00f2fe]/50 text-[#00f2fe]'
                : 'bg-white/5 border-white/10 text-white/60 md:hover:bg-white/10 md:hover:text-white/90'
            }`}
          >
            {r.label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setRangeKey('custom')}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            rangeKey === 'custom'
              ? 'bg-[#00f2fe]/20 border-[#00f2fe]/50 text-[#00f2fe]'
              : 'bg-white/5 border-white/10 text-white/60 md:hover:bg-white/10 md:hover:text-white/90'
          }`}
        >
          <CalendarRange size={15} /> কাস্টম
        </button>
      </div>

      {/* From / To search — only shown while the কাস্টম window is selected */}
      {rangeKey === 'custom' && (
        <div className="glass-panel p-3 mt-2 flex flex-col sm:flex-row sm:items-end gap-2.5">
          <div className="flex-1 min-w-0">
            <label className="form-label">ফ্রম ডেট (From)</label>
            <input
              type="date"
              className="form-input"
              value={customDraft.from}
              max={customDraft.to || undefined}
              onChange={(e) => setCustomDraft({ ...customDraft, from: e.target.value })}
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="form-label">টু ডেট (To)</label>
            <input
              type="date"
              className="form-input"
              value={customDraft.to}
              min={customDraft.from || undefined}
              onChange={(e) => setCustomDraft({ ...customDraft, to: e.target.value })}
            />
          </div>
          <button
            type="button"
            onClick={applyCustomRange}
            className="btn btn-primary sm:px-8 shrink-0"
          >
            <Search size={16} /> সার্চ করুন
          </button>
        </div>
      )}

      {/* Which শাখা these figures belong to */}
      <div className="flex items-center gap-2 mt-3">
        <Building2 size={15} className="text-violet-400 shrink-0" />
        <span className="text-sm md:text-base font-bold text-violet-200">
          {isAllBranches ? 'সকল শাখার সম্মিলিত হিসাব' : activeBranch ? `${activeBranch.name} শাখা` : 'শাখা নির্ধারিত নয়'}
        </span>
      </div>

      <p className="text-white/45 text-xs md:text-sm mt-1 mb-3 md:mb-4">
        {range.all
          ? 'শুরু থেকে আজ পর্যন্ত সকল লেনদেন'
          : range.from === range.to
            ? formatDate(range.from)
            : `${formatDate(range.from)} — ${formatDate(range.to)}`}
        {' · '}যেকোনো কার্ডে ট্যাপ করলে বিস্তারিত রিপোর্ট দেখা যাবে।
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 md:gap-5">
        <StatCard
          title={`মোট ইনকাম (${range.label})`}
          value={`৳ ${bn(stats.income)}`}
          subValue={
            [
              stats.recovered > 0 ? `আদায় ৳ ${bn(stats.recovered)}` : null,
              stats.newDue > 0 ? `নতুন বাকী ৳ ${bn(stats.newDue)}` : null,
            ].filter(Boolean).join(' · ') || null
          }
          icon={TrendingUp}
          gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
          onClick={() => openReport('income')}
        />

        <StatCard
          title={`মোট খরচ (${range.label})`}
          value={`৳ ${bn(stats.expense)}`}
          icon={TrendingDown}
          gradient="linear-gradient(135deg, #EF4444 0%, #DC2626 100%)"
          onClick={() => openReport('expense')}
        />

        <StatCard
          title={`নিট প্রফিট (${range.label})`}
          value={`৳ ${bn(net)}`}
          icon={DollarSign}
          gradient="linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)"
          onClick={() => openReport('profit')}
        />

        {/* A balance, not a period total — the window only drives the sub-line */}
        <StatCard
          title="মোট বাকী (চলমান)"
          value={`৳ ${bn(stats.outstandingDue)}`}
          subValue={
            stats.debtorCount > 0
              ? `${bn(stats.debtorCount)} জনের কাছে · ${range.label} আদায় ৳ ${bn(stats.recovered)}`
              : 'কারো কোনো বাকী নেই'
          }
          icon={HandCoins}
          gradient="linear-gradient(135deg, #F59E0B 0%, #B45309 100%)"
          onClick={() => openReport('due')}
        />

        <StatCard
          title="মোট রিক্সা/অটো"
          value={bn(stats.totalRickshaws)}
          subValue={`${bn(stats.activeRickshaws)} টি সচল`}
          icon={CarFront}
          gradient="linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)"
          onClick={() => openReport('vehicles')}
        />

        <StatCard
          title="মোট ড্রাইভার"
          value={bn(stats.totalDrivers)}
          icon={Users}
          gradient="linear-gradient(135deg, #64748B 0%, #475569 100%)"
          onClick={() => openReport('drivers')}
        />
      </div>

      <div className="glass-panel panel-pad mt-4 md:mt-8 border-l-4 border-l-[#00f2fe]">
        <h3 className="mb-1.5 text-base md:text-lg text-[#00f2fe] font-bold flex items-center gap-2">
          <Wallet size={18} /> দ্রুত নেভিগেশন
        </h3>
        <p className="text-white/55 text-sm">
          উপরের বাম কোণের <Menu size={13} className="inline text-[#00f2fe]" /> মেনু বাটন থেকে বিভিন্ন মডিউলে গিয়ে
          নতুন তথ্য যুক্ত করুন বা পুরাতন তথ্য দেখুন।
        </p>
      </div>

      {report && (
        <ReportSheet
          title={report.ranged ? `${report.title} — ${range.label}` : report.title}
          subtitle={
            report.ranged
              ? (range.from === range.to
                  ? formatDate(range.from)
                  : `${formatDate(range.from)} — ${formatDate(range.to)}`)
              : reportKey === 'due'
                ? 'আজ পর্যন্ত চলমান হিসাব'
                : 'সম্পূর্ণ তালিকা'
          }
          icon={report.icon}
          loading={reportLoading}
          error={reportError}
          onClose={closeReport}
          onRefresh={() => openReport(reportKey)}
        >
          {renderReportBody()}
        </ReportSheet>
      )}
    </div>
  );
}
