import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PiggyBank, Plus, Trash2, Edit2, CheckCircle2, XCircle, CarFront, Hash, DollarSign } from 'lucide-react';

export default function SetDailyDeposit() {
  const [rickshaws, setRickshaws] = useState([]);
  const [depositSettings, setDepositSettings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedRickshawId, setSelectedRickshawId] = useState('');
  const [selectedRegNo, setSelectedRegNo] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState('');
  const [dailyJomaAmount, setDailyJomaAmount] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);

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

    if (!selectedRickshawId) {
      alert('অনুগ্রহ করে একটি পরিচিতি নম্বর (যানবাহন) নির্বাচন করুন।');
      return;
    }
    if (!dailyJomaAmount || parseFloat(dailyJomaAmount) <= 0) {
      alert('দৈনিক জমার পরিমাণ সঠিকভাবে দিন।');
      return;
    }

    try {
      // Automatically set existing active settings for this vehicle to 'inactive'
      await supabase
        .from('daily_deposit_settings')
        .update({ status: 'inactive' })
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
      setEntryDate(new Date().toISOString().split('T')[0]);

      alert('দৈনিক জমা পরিমাণ সফলভাবে সেট করা হয়েছে!');
    } catch (error) {
      alert('Error adding daily deposit setting: ' + error.message);
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

  return (
    <div className="flex flex-col gap-8">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-[#00f2fe]/10 via-purple-500/10 to-transparent p-6 rounded-2xl border border-[#00f2fe]/20">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <PiggyBank className="text-[#00f2fe]" size={28} /> 
            Set Daily Deposit (দৈনিক জমার পরিমাণ নির্ধারণ)
          </h2>
          <p className="text-white/70 text-sm mt-1">
            প্রতিটি যানবাহনের পরিচিতি নম্বর সিলেক্ট করে নতুন দৈনিক জমা সেট করুন। নতুন জমা সেট করলে পূর্বের জমা স্বয়ংক্রিয়ভাবে ইনঅ্যাকটিভ হয়ে যাবে।
          </p>
        </div>
      </div>

      {/* Form Section */}
      <div className="glass-panel p-8 w-full">
        <h3 className="flex items-center gap-2 mb-6 text-[#00f2fe] text-xl font-bold">
          <Plus size={24} /> নতুন দৈনিক জমা সেট করুন
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          
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
              {rickshaws.map(r => (
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
          <div className="lg:col-span-4 flex justify-end mt-2">
            <button type="submit" className="btn btn-primary w-full md:w-auto md:px-12 text-lg">
              সংরক্ষণ করুন
            </button>
          </div>

        </form>
      </div>

      {/* List Table Section */}
      <div className="glass-panel p-8 w-full">
        <h3 className="flex items-center gap-2 mb-6 text-[#00f2fe] text-xl font-bold">
          <PiggyBank size={24} /> সেট করা দৈনিক জমার তালিকা
        </h3>

        {loading ? (
          <p className="text-white/60 animate-pulse text-center py-8">লোড হচ্ছে...</p>
        ) : depositSettings.length === 0 ? (
          <p className="text-white/60 text-center py-8">এখনো কোনো দৈনিক জমা সেট করা হয়নি।</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-white/60 text-xs uppercase tracking-wider bg-white/5">
                  <th className="p-4">পরিচিতি নম্বর</th>
                  <th className="p-4">রেজিস্ট্রেশন নম্বর</th>
                  <th className="p-4">যানবাহনের ধরন</th>
                  <th className="p-4">দৈনিক জমা (৳)</th>
                  <th className="p-4">এন্ট্রি তারিখ</th>
                  <th className="p-4">অবস্থা</th>
                  <th className="p-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-white/80">
                {depositSettings.map(item => (
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
                      ৳ {Number(item.daily_joma_amount).toLocaleString('bn-BD')}
                    </td>

                    {/* Entry Date */}
                    <td className="p-4 text-white/70">
                      {item.entry_date}
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
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-400 hover:text-red-300 transition-colors rounded-lg hover:bg-white/10"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="glass-panel p-8 w-full max-w-md">
            <h3 className="mb-6 text-[#00f2fe] text-xl font-bold border-b border-white/10 pb-3 flex items-center gap-2">
              <Edit2 size={20} /> দৈনিক জমা আপডেট করুন
            </h3>
            
            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
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

              <div className="flex gap-4 mt-4">
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
