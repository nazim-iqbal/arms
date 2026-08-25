import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PiggyBank, Plus, Trash2, Edit2, CheckCircle2, XCircle, CarFront, Hash, DollarSign, LogOut } from 'lucide-react';
import { today, formatDate, bn } from '../lib/date';

export default function SetDailyDeposit() {
  // Only an admin may delete; everyone else can add and edit
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  const [rickshaws, setRickshaws] = useState([]);
  const [depositSettings, setDepositSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterIdentityNo, setFilterIdentityNo] = useState('all');

  // Form State
  const [selectedRickshawId, setSelectedRickshawId] = useState('');
  const [selectedRegNo, setSelectedRegNo] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState('');
  const [dailyJomaAmount, setDailyJomaAmount] = useState('');
  const [entryDate, setEntryDate] = useState(today());

  // Edit Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      
      // Fetch vehicles for dropdown (order by identity_no)
      const { data: rData, error: rError } = await supabase
        .from('rickshaws')
        .select('id, identity_no, registration_number, vehicle_type')
        .order('identity_no', { ascending: true });
      if (rError) throw rError;
      setRickshaws(rData || []);

      // Fetch existing daily deposit settings with vehicle details
      const { data: dData, error: dError } = await supabase
        .from('daily_deposit_settings')
        .select(`
          *,
          rickshaws (identity_no, registration_number, vehicle_type)
        `)
        .order('created_at', { ascending: false });
      if (dError) throw dError;
      setDepositSettings(dData || []);

    } catch (error) {
      alert('Error fetching deposit settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle vehicle dropdown selection change
  function handleRickshawChange(id) {
    setSelectedRickshawId(id);
    const found = rickshaws.find(r => r.id === id);
    if (found) {
      setSelectedRegNo(found.registration_number || '');
      setSelectedVehicleType(found.vehicle_type || '');
    } else {
      setSelectedRegNo('');
      setSelectedVehicleType('');
    }
  }

  // Add new daily deposit setting
  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    if (!selectedRickshawId) {
      alert('অনুগ্রহ করে একটি পরিচিতি নম্বর (যানবাহন) নির্বাচন করুন।');
      return;
    }
    if (!dailyJomaAmount || parseFloat(dailyJomaAmount) <= 0) {
      alert('দৈনিক জমার পরিমাণ সঠিকভাবে দিন।');
      return;
    }

    try {
      setSubmitting(true);
      // Automatically set existing active settings for this vehicle to 'inactive'
      await supabase
        .from('daily_deposit_settings')
        .update({ status: 'inactive', release_date: entryDate })
        .eq('rickshaw_id', selectedRickshawId)
        .eq('status', 'active');

      // Insert new active setting
      const { error } = await supabase
        .from('daily_deposit_settings')
        .insert([{
          rickshaw_id: selectedRickshawId,
          daily_joma_amount: parseFloat(dailyJomaAmount),
          entry_date: entryDate,
          status: 'active'
        }]);

      if (error) throw error;

      // Re-fetch data to reflect updated statuses
      await fetchData();

      // Reset Form
      setSelectedRickshawId('');
      setSelectedRegNo('');
      setSelectedVehicleType('');
      setDailyJomaAmount('');
      setEntryDate(today());

      alert('দৈনিক জমা পরিমাণ সফলভাবে সেট করা হয়েছে!');
    } catch (error) {
      alert('Error adding daily deposit setting: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Quick Release deposit setting
  async function handleQuickRelease(item) {
    if (!window.confirm('আপনি কি এই জমার হিসাবটি রিলিজ (ইনঅ্যাকটিভ) করতে চান?')) return;
    
    try {
      const { error } = await supabase
        .from('daily_deposit_settings')
        .update({ status: 'inactive', release_date: today() })
        .eq('id', item.id);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      alert('Error releasing setting: ' + error.message);
    }
  }

  // Save edit modal changes
  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('daily_deposit_settings')
        .update({
          daily_joma_amount: parseFloat(editAmount),
          entry_date: editDate
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      setEditingItem(null);
      await fetchData();
    } catch (error) {
      alert('Error saving changes: ' + error.message);
    }
  }

  // Delete deposit setting
  async function handleDelete(id) {
    if (!isAdmin) return;
    if (!window.confirm('আপনি কি নিশ্চিত যে এই রেকর্ডটি মুছে ফেলতে চান?')) return;

    try {
      const { error } = await supabase
        .from('daily_deposit_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDepositSettings(depositSettings.filter(item => item.id !== id));
    } catch (error) {
      alert('Error deleting setting: ' + error.message);
    }
  }

  const uniqueIdentityNos = [...new Set(depositSettings.map(item => item.rickshaws?.identity_no).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
  const filteredSettings = filterIdentityNo === 'all' ? depositSettings : depositSettings.filter(item => item.rickshaws?.identity_no === filterIdentityNo);

  return (
    <div className="flex flex-col gap-3 md:gap-6">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-[#00f2fe]/10 via-purple-500/10 to-transparent p-3.5 md:p-5 rounded-xl md:rounded-2xl border border-[#00f2fe]/20">
        <div className="min-w-0">
          <h2 className="text-lg md:text-2xl font-bold text-white flex items-center gap-2">
            <PiggyBank className="text-[#00f2fe] shrink-0 w-5 h-5 md:w-7 md:h-7" />
            Set Daily Deposit (দৈনিক জমার পরিমাণ নির্ধারণ)
          </h2>
          <p className="hidden md:block text-white/70 text-sm mt-1">
            প্রতিটি যানবাহনের পরিচিতি নম্বর সিলেক্ট করে নতুন দৈনিক জমা সেট করুন। নতুন জমা সেট করলে পূর্বের জমা স্বয়ংক্রিয়ভাবে ইনঅ্যাকটিভ হয়ে যাবে।
          </p>
        </div>
      </div>

      {/* Form Section */}
      <div className="glass-panel panel-pad w-full">
        <h3 className="panel-title text-[#00f2fe]">
          <Plus size={20} /> নতুন দৈনিক জমা সেট করুন
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 items-start">
          
          {/* 1. Identity No Dropdown */}
          <div className="form-group">
            <label className="form-label flex justify-between items-center">
              <span>পরিচিতি নম্বর (Identity No)</span>
            </label>
            <select 
              className="form-input font-mono font-semibold"
              value={selectedRickshawId}
              onChange={(e) => handleRickshawChange(e.target.value)}
              required
            >
              <option value="">-- পরিচিতি নম্বর নির্বাচন করুন --</option>
              {rickshaws
                .filter(r => !depositSettings.some(d => d.status === 'active' && d.rickshaw_id === r.id))
                .map(r => (
                <option key={r.id} value={r.id}>
                  ID: {r.identity_no || 'N/A'} ({r.vehicle_type || 'Vehicle'}) - {r.registration_number}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Auto-populated Registration No */}
          <div className="form-group">
            <label className="form-label">রেজিস্ট্রেশন নম্বর (Auto-filled)</label>
            <div className="relative">
              <input 
                type="text" 
                className="form-input bg-white/5 border-white/10 text-white/90 font-medium cursor-not-allowed" 
                value={selectedRegNo}
                readOnly
                placeholder="পরিচিতি নম্বর সিলেক্ট করলে চলে আসবে"
              />
              <CarFront size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
          </div>

          {/* 3. Daily Joma Amount */}
          <div className="form-group">
            <label className="form-label">Daily Joma Amount (দৈনিক জমার পরিমাণ ৳)</label>
            <div className="relative">
              <input 
                type="text" 
                inputMode="numeric"
                pattern="[0-9]*"
                className="form-input text-emerald-400 font-bold text-lg" 
                value={dailyJomaAmount}
                onChange={(e) => setDailyJomaAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 500"
                required
              />
              <DollarSign size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400/50 pointer-events-none" />
            </div>
          </div>

          {/* 4. Daily Joma Entry Date */}
          <div className="form-group">
            <label className="form-label">Daily Joma Entry Date (তারিখ)</label>
            <input 
              type="date" 
              className="form-input" 
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
            />
          </div>

          {/* Submit Button */}
          <div className="lg:col-span-4 flex justify-end mt-1">
            <button type="submit" disabled={submitting} className="btn btn-primary w-full md:w-auto md:px-12 disabled:opacity-60">
              {submitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </button>
          </div>

        </form>
      </div>

      {/* List Table Section */}
      <div className="glass-panel panel-pad w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-3 mb-4">
          <h3 className="text-[#00f2fe] text-lg font-bold flex items-center gap-2">
            <PiggyBank size={20} /> সেট করা দৈনিক জমার তালিকা
          </h3>
          <div className="flex items-center gap-2 w-full sm:w-auto bg-[#00f2fe]/10 p-1.5 rounded-lg border border-[#00f2fe]/30">
            <Hash size={16} className="text-[#00f2fe] ml-1" />
            <select 
              className="bg-transparent text-[#00f2fe] font-bold text-sm focus:outline-none cursor-pointer pr-2"
              value={filterIdentityNo}
              onChange={(e) => setFilterIdentityNo(e.target.value)}
            >
              <option value="all" className="bg-[#111119] text-white">সব রিকশা (All)</option>
              {uniqueIdentityNos.map(idNo => (
                <option key={idNo} value={idNo} className="bg-[#111119] text-white">ID: {idNo}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-white/60 animate-pulse text-center py-8">লোড হচ্ছে...</p>
        ) : depositSettings.length === 0 ? (
          <p className="text-white/60 text-center py-8">এখনো কোনো দৈনিক জমা সেট করা হয়নি।</p>
        ) : filteredSettings.length === 0 ? (
          <p className="text-white/60 text-center py-8">এই পরিচিতি নম্বরের কোনো রেকর্ড নেই।</p>
        ) : (
          <>
          {/* Phone view: one card per record instead of a 7-column table */}
          <div className="md:hidden flex flex-col gap-2.5">
            {filteredSettings.map(item => (
              <div key={item.id} className="rec-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="inline-flex items-center gap-1.5 flex-wrap">
                      <span className="id-badge"><Hash size={11} />{item.rickshaws?.identity_no || 'N/A'}</span>
                      <span className="text-white/85 text-sm font-semibold">{item.rickshaws?.registration_number || 'N/A'}</span>
                    </span>
                    <span className="text-white/45 text-xs mt-1 block">
                      এন্ট্রি: {formatDate(item.entry_date)}
                      {item.release_date && ` · রিলিজ: ${formatDate(item.release_date)}`}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-emerald-400 shrink-0">৳ {bn(item.daily_joma_amount)}</span>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-2">
                  {item.status === 'active' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      <CheckCircle2 size={12} /> সচল
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-500/20 text-gray-400 border border-gray-500/30">
                      <XCircle size={12} /> পূর্বের হিসাব
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    {item.status === 'active' && (
                      <button
                        onClick={() => handleQuickRelease(item)}
                        className="btn btn-secondary !py-1.5 !px-3 text-xs text-orange-400 border-orange-500/30 flex items-center gap-1 mr-1"
                      >
                        <LogOut size={13} /> রিলিজ
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setEditAmount(String(item.daily_joma_amount));
                        setEditDate(item.entry_date);
                      }}
                      className="p-2 text-white/70 rounded-lg active:bg-white/10"
                      aria-label="এডিট"
                    >
                      <Edit2 size={15} />
                    </button>
                    {isAdmin && (
                      <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-red-400 rounded-lg active:bg-white/10"
                      aria-label="মুছে ফেলুন"
                    >
                      <Trash2 size={15} />
                    </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tablet and up */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse data-table">
              <thead>
                <tr className="border-b border-white/10 text-white/60 text-xs uppercase tracking-wider bg-white/5">
                  <th className="p-4">পরিচিতি নম্বর</th>
                  <th className="p-4">রেজিস্ট্রেশন নম্বর</th>
                  <th className="p-4">যানবাহনের ধরন</th>
                  <th className="p-4">দৈনিক জমা (৳)</th>
                  <th className="p-4">এন্ট্রি তারিখ</th>
                  <th className="p-4">রিলিজ তারিখ</th>
                  <th className="p-4">অবস্থা</th>
                  <th className="p-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-white/80">
                {filteredSettings.map(item => (
                  <tr 
                    key={item.id}
                    className="hover:bg-white/5 transition-colors duration-150"
                  >
                    {/* Identity No */}
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-[#00f2fe] bg-[#00f2fe]/10 border border-[#00f2fe]/30 px-3 py-1 rounded-lg">
                        <Hash size={14} /> {item.rickshaws?.identity_no || 'N/A'}
                      </span>
                    </td>

                    {/* Registration No */}
                    <td className="p-4 font-semibold text-white">
                      {item.rickshaws?.registration_number || 'N/A'}
                    </td>

                    {/* Vehicle Type */}
                    <td className="p-4">
                      <span className="text-xs px-2.5 py-1 rounded-md bg-white/10 text-white/70">
                        {item.rickshaws?.vehicle_type || 'N/A'}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="p-4 font-bold text-emerald-400 text-base">
                      ৳ {bn(item.daily_joma_amount)}
                    </td>

                    {/* Entry Date */}
                    <td className="p-4 text-white/70 font-mono">
                      {formatDate(item.entry_date)}
                    </td>

                    {/* Release Date */}
                    <td className="p-4 text-white/70 font-mono">
                      {item.release_date ? formatDate(item.release_date) : '-'}
                    </td>

                    {/* Status Badge */}
                    <td className="p-4">
                      {item.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          <CheckCircle2 size={13} /> বর্তমানে সচল (Active)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-400 border border-gray-500/30">
                          <XCircle size={13} /> পূর্বের হিসাব (Inactive)
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.status === 'active' && (
                          <button 
                            onClick={() => handleQuickRelease(item)}
                            className="btn btn-secondary !py-1 !px-2.5 text-xs text-orange-400 border-orange-500/30 hover:bg-orange-500/10 flex items-center gap-1"
                            title="রিলিজ করুন"
                          >
                            <LogOut size={13} /> রিলিজ
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setEditingItem(item);
                            setEditAmount(String(item.daily_joma_amount));
                            setEditDate(item.entry_date);
                          }}
                          className="p-2 text-white/70 hover:text-[#00f2fe] transition-colors rounded-lg hover:bg-white/10"
                          title="এডিট করুন"
                        >
                          <Edit2 size={16} />
                        </button>
                        {isAdmin && (
                          <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-400 hover:text-red-300 transition-colors rounded-lg hover:bg-white/10"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 size={16} />
                        </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center md:p-4">
          <div className="w-full md:max-w-md bg-[#111119] border border-white/10 rounded-t-2xl md:rounded-2xl p-5 md:p-7 max-h-[92vh] overflow-y-auto">
            <h3 className="mb-4 text-[#00f2fe] text-lg font-bold border-b border-white/10 pb-3 flex items-center gap-2">
              <Edit2 size={19} /> দৈনিক জমা আপডেট করুন
            </h3>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
              <div>
                <span className="text-xs text-white/50">যানবাহন</span>
                <p className="text-white font-bold text-lg mt-0.5">
                  [ID: {editingItem.rickshaws?.identity_no}] {editingItem.rickshaws?.registration_number}
                </p>
              </div>

              <div>
                <label className="form-label">দৈনিক জমার পরিমাণ (৳)</label>
                <input 
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="form-input font-bold text-emerald-400 text-lg"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>

              <div>
                <label className="form-label">তারিখ</label>
                <input 
                  type="date"
                  className="form-input"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="btn btn-secondary flex-1"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  আপডেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
