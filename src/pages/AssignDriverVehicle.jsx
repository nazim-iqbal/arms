import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserCheck, Plus, Trash2, Edit2, CarFront, Hash, User, CheckCircle2, XCircle, LogOut, Phone } from 'lucide-react';
import { today, formatDate } from '../lib/date';

export default function AssignDriverVehicle() {
  // Only an admin may delete; everyone else can add and edit
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  const [rickshaws, setRickshaws] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedRickshawId, setSelectedRickshawId] = useState('');
  const [selectedRegNo, setSelectedRegNo] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [assignDate, setAssignDate] = useState(today());
  const [releaseDate, setReleaseDate] = useState('');
  const [status, setStatus] = useState('active');

  // Edit Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [editAssignDate, setEditAssignDate] = useState('');
  const [editReleaseDate, setEditReleaseDate] = useState('');
  const [editStatus, setEditStatus] = useState('active');

  // Filter State
  const [filterRickshawId, setFilterRickshawId] = useState('');

  const filteredAssignments = filterRickshawId
    ? assignments.filter(item => item.rickshaw_id === filterRickshawId)
    : assignments;
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      
      // 1. Fetch vehicles (order by identity_no)
      const { data: rData, error: rError } = await supabase
        .from('rickshaws')
        .select('id, identity_no, registration_number, vehicle_type')
        .order('identity_no', { ascending: true });
      if (rError) throw rError;
      setRickshaws(rData || []);

      // 2. Fetch drivers
      const { data: dData, error: dError } = await supabase
        .from('drivers')
        .select('id, name, phone, nid_no')
        .order('name', { ascending: true });
      if (dError) throw dError;
      setDrivers(dData || []);

      // 3. Fetch assignments with joined vehicle and driver info
      const { data: aData, error: aError } = await supabase
        .from('driver_vehicle_assignments')
        .select(`
          *,
          rickshaws (identity_no, registration_number, vehicle_type),
          drivers (name, phone, nid_no)
        `)
        .order('created_at', { ascending: false });
      if (aError) throw aError;
      setAssignments(aData || []);

    } catch (error) {
      alert('Error fetching assignment data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle vehicle selection change
  function handleRickshawChange(id) {
    setSelectedRickshawId(id);
    const found = rickshaws.find(r => r.id === id);
    if (found) {
      setSelectedRegNo(found.registration_number || '');
    } else {
      setSelectedRegNo('');
    }
  }

  // Submit new assignment
  async function handleSubmit(e) {
    e.preventDefault();

    if (!selectedRickshawId) {
      alert('অনুগ্রহ করে যানবাহন (পরিচিতি নম্বর) নির্বাচন করুন।');
      return;
    }
    if (!selectedDriverId) {
      alert('অনুগ্রহ করে ড্রাইভার নির্বাচন করুন।');
      return;
    }

    try {
      // If status is 'active', release any existing active assignments for this vehicle or driver
      if (status === 'active') {
        const todayStr = today();
        
        // Deactivate previous active assignment for this vehicle
        await supabase
          .from('driver_vehicle_assignments')
          .update({ status: 'released', release_date: assignDate || todayStr })
          .eq('rickshaw_id', selectedRickshawId)
          .eq('status', 'active');

        // Deactivate previous active assignment for this driver
        await supabase
          .from('driver_vehicle_assignments')
          .update({ status: 'released', release_date: assignDate || todayStr })
          .eq('driver_id', selectedDriverId)
          .eq('status', 'active');
      }

      // Insert new assignment
      const { error: insertError } = await supabase
        .from('driver_vehicle_assignments')
        .insert([{
          rickshaw_id: selectedRickshawId,
          driver_id: selectedDriverId,
          assign_date: assignDate,
          release_date: releaseDate || null,
          status: status
        }]);

      if (insertError) throw insertError;

      // Also sync driver's assigned rickshaw_id for compatibility
      if (status === 'active') {
        await supabase
          .from('drivers')
          .update({ rickshaw_id: selectedRickshawId })
          .eq('id', selectedDriverId);
      }

      // Re-fetch data
      await fetchData();

      // Reset Form
      setSelectedRickshawId('');
      setSelectedRegNo('');
      setSelectedDriverId('');
      setAssignDate(today());
      setReleaseDate('');
      setStatus('active');

      alert('ড্রাইভার সফলভাবে গাড়িতে অ্যাসাইন করা হয়েছে!');
    } catch (error) {
      alert('Error assigning driver with vehicle: ' + error.message);
    }
  }

  // Quick Release driver from vehicle
  async function handleQuickRelease(item) {
    if (!window.confirm('আপনি কি এই ড্রাইভারকে গাড়ি থেকে রিলিজ করতে চান?')) return;
    
    const todayStr = today();
    try {
      const { error } = await supabase
        .from('driver_vehicle_assignments')
        .update({
          status: 'released',
          release_date: todayStr
        })
        .eq('id', item.id);

      if (error) throw error;

      // Clear driver rickshaw assignment link
      await supabase
        .from('drivers')
        .update({ rickshaw_id: null })
        .eq('id', item.driver_id);

      await fetchData();
    } catch (error) {
      alert('Error releasing vehicle: ' + error.message);
    }
  }

  // Save edit modal changes
  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('driver_vehicle_assignments')
        .update({
          assign_date: editAssignDate,
          release_date: editReleaseDate || null,
          status: editStatus
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      // Sync driver table
      if (editStatus === 'released') {
        await supabase
          .from('drivers')
          .update({ rickshaw_id: null })
          .eq('id', editingItem.driver_id);
      } else if (editStatus === 'active') {
        await supabase
          .from('drivers')
          .update({ rickshaw_id: editingItem.rickshaw_id })
          .eq('id', editingItem.driver_id);
      }

      setEditingItem(null);
      await fetchData();
    } catch (error) {
      alert('Error saving changes: ' + error.message);
    }
  }

  // Delete assignment
  async function handleDelete(id) {
    if (!isAdmin) return;
    if (!window.confirm('আপনি কি নিশ্চিত যে এই অ্যাসাইনমেন্ট রেকর্ডটি মুছে ফেলতে চান?')) return;

    try {
      const { error } = await supabase
        .from('driver_vehicle_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setAssignments(assignments.filter(a => a.id !== id));
    } catch (error) {
      alert('Error deleting assignment: ' + error.message);
    }
  }

  return (
    <div className="flex flex-col gap-3 md:gap-6">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-[#00f2fe]/10 via-purple-500/10 to-transparent p-3.5 md:p-5 rounded-xl md:rounded-2xl border border-[#00f2fe]/20">
        <div className="min-w-0">
          <h2 className="text-lg md:text-2xl font-bold text-white flex items-center gap-2">
            <UserCheck className="text-[#00f2fe] shrink-0 w-5 h-5 md:w-7 md:h-7" />
            Assign Driver with Vehicle (ড্রাইভার অ্যাসাইনমেন্ট)
          </h2>
          <p className="hidden md:block text-white/70 text-sm mt-1">
            কোন ড্রাইভার কোন গাড়ি কত তারিখ থেকে কত তারিখ পর্যন্ত চালাচ্ছে তার অ্যাসাইনমেন্ট ও রিলিজ রেকর্ড।
          </p>
        </div>
      </div>

      {/* Form Section */}
      <div className="glass-panel panel-pad w-full">
        <h3 className="panel-title text-[#00f2fe]">
          <Plus size={20} /> নতুন ড্রাইভার অ্যাসাইন করুন
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 items-start">
          
          {/* 1. Identity No Dropdown */}
          <div className="form-group">
            <label className="form-label flex justify-between items-center">
              <span>১. রিকশা/অটো নম্বর (Identity No)</span>
              <span className="text-xs text-[#00f2fe]/80 font-normal">সিলেক্ট করুন</span>
            </label>
            <select 
              className="form-input font-mono font-semibold"
              value={selectedRickshawId}
              onChange={(e) => handleRickshawChange(e.target.value)}
              required
            >
              <option value="">-- রিকশা/অটো নম্বর সিলেক্ট করুন --</option>
              {rickshaws
                .filter(r => !assignments.some(a => a.status === 'active' && a.rickshaw_id === r.id))
                .map(r => (
                <option key={r.id} value={r.id}>
                  ID: {r.identity_no || 'N/A'} ({r.vehicle_type || 'Vehicle'}) - {r.registration_number}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Auto-populated Registration No */}
          <div className="form-group">
            <label className="form-label">২. রেজিস্ট্রেশন নম্বর (Auto-filled)</label>
            <div className="relative">
              <input 
                type="text" 
                className="form-input bg-white/5 border-white/10 text-white/90 font-medium cursor-not-allowed" 
                value={selectedRegNo}
                readOnly
                placeholder="রিকশা নম্বর সিলেক্ট করলে চলে আসবে"
              />
              <CarFront size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
          </div>

          {/* 3. Driver Name Dropdown */}
          <div className="form-group">
            <label className="form-label flex justify-between items-center">
              <span>৩. ড্রাইভারের নাম (Driver Name)</span>
              <span className="text-xs text-[#00f2fe]/80 font-normal">সিলেক্ট করুন</span>
            </label>
            <select 
              className="form-input font-semibold"
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              required
            >
              <option value="">-- ড্রাইভার নির্বাচন করুন --</option>
              {drivers
                .filter(d => !assignments.some(a => a.status === 'active' && a.driver_id === d.id))
                .map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.phone ? `(${d.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Assign Date */}
          <div className="form-group">
            <label className="form-label">৪. Assign Date (অ্যাসাইন করার তারিখ)</label>
            <input 
              type="date" 
              className="form-input" 
              value={assignDate}
              onChange={(e) => setAssignDate(e.target.value)}
              required
            />
          </div>



          {/* Submit Button */}
          <div className="flex items-end pt-1 md:pt-[28px]">
            <button type="submit" className="btn btn-primary w-full md:w-auto md:px-12">
              সংরক্ষণ করুন
            </button>
          </div>

        </form>
      </div>

      {/* List Table Section */}
      <div className="glass-panel panel-pad w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 className="panel-title text-[#00f2fe] !mb-0">
            <UserCheck size={20} /> ড্রাইভার অ্যাসাইনমেন্ট তালিকা
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
        ) : filteredAssignments.length === 0 ? (
          <p className="text-white/60 text-center py-8">কোনো রেকর্ড পাওয়া যায়নি।</p>
        ) : (
          <>
          {/* Phone view: one card per assignment instead of an 8-column table */}
          <div className="md:hidden flex flex-col gap-2.5">
            {filteredAssignments.map(item => (
              <div key={item.id} className="rec-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="inline-flex items-center gap-1.5 flex-wrap">
                      <span className="id-badge"><Hash size={11} />{item.rickshaws?.identity_no || 'N/A'}</span>
                      <span className="text-white/85 text-sm font-semibold">{item.rickshaws?.registration_number || 'N/A'}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                      <User size={13} className="text-[#00f2fe] shrink-0" /> {item.drivers?.name || 'N/A'}
                    </span>
                    {item.drivers?.phone && (
                      <span className="flex items-center gap-1.5 text-xs font-mono text-white/60">
                        <Phone size={12} className="text-[#00f2fe] shrink-0" /> {item.drivers.phone}
                      </span>
                    )}
                  </div>

                  {item.status === 'active' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                      <CheckCircle2 size={12} /> চলাচ্ছে
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-500/20 text-gray-400 border border-gray-500/30 shrink-0">
                      <XCircle size={12} /> রিলিজড
                    </span>
                  )}
                </div>

                <div className="rec-row">
                  <span className="rec-key">অ্যাসাইন</span>
                  <span className="rec-val text-xs font-mono">{formatDate(item.assign_date)}</span>
                </div>
                <div className="rec-row">
                  <span className="rec-key">রিলিজ</span>
                  <span className="rec-val text-xs font-mono">
                    {item.release_date ? formatDate(item.release_date) : 'চলমান'}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-1 border-t border-white/5 pt-2">
                  {item.status === 'active' && (
                    <button
                      onClick={() => handleQuickRelease(item)}
                      className="btn btn-secondary !py-1.5 !px-3 text-xs text-orange-400 border-orange-500/30 flex items-center gap-1"
                    >
                      <LogOut size={13} /> রিলিজ
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setEditAssignDate(item.assign_date);
                      setEditReleaseDate(item.release_date || '');
                      setEditStatus(item.status);
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
            ))}
          </div>

          {/* Tablet and up */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse data-table">
              <thead>
                <tr className="border-b border-white/10 text-white/60 text-xs uppercase tracking-wider bg-white/5">
                  <th className="p-4">পরিচিতি নম্বর</th>
                  <th className="p-4">রেজিস্ট্রেশন নম্বর</th>
                  <th className="p-4">ড্রাইভারের নাম</th>
                  <th className="p-4">মোবাইল নম্বর</th>
                  <th className="p-4">Assign Date</th>
                  <th className="p-4">Release Date</th>
                  <th className="p-4">স্ট্যাটাস</th>
                  <th className="p-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-white/80">
                {filteredAssignments.map(item => (
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

                    {/* Driver Name */}
                    <td className="p-4 font-bold text-white">
                      <span className="flex items-center gap-2">
                        <User size={15} className="text-[#00f2fe]" />
                        {item.drivers?.name || 'N/A'}
                      </span>
                    </td>

                    {/* Driver Phone */}
                    <td className="p-4 font-mono text-white/80">
                      {item.drivers?.phone || 'N/A'}
                    </td>

                    {/* Assign Date */}
                    <td className="p-4 text-white/80 font-mono">
                      {formatDate(item.assign_date)}
                    </td>

                    {/* Release Date */}
                    <td className="p-4 text-white/70 font-mono">
                      {item.release_date ? formatDate(item.release_date) : 'চলমান'}
                    </td>

                    {/* Status Badge */}
                    <td className="p-4">
                      {item.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          <CheckCircle2 size={13} /> Active (চলাচ্ছে)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-400 border border-gray-500/30">
                          <XCircle size={13} /> Released (অব্যাহতিপ্রাপ্ত)
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
                            title="গাড়ি থেকে রিলিজ করুন"
                          >
                            <LogOut size={13} /> রিলিজ
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setEditingItem(item);
                            setEditAssignDate(item.assign_date);
                            setEditReleaseDate(item.release_date || '');
                            setEditStatus(item.status);
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
              <Edit2 size={19} /> অ্যাসাইনমেন্ট আপডেট করুন
            </h3>
            
            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
              <div>
                <span className="text-xs text-white/50">যানবাহন ও ড্রাইভার</span>
                <p className="text-white font-bold text-base mt-0.5">
                  [ID: {editingItem.rickshaws?.identity_no}] {editingItem.rickshaws?.registration_number}
                </p>
                <p className="text-[#00f2fe] font-semibold text-sm">
                  ড্রাইভার: {editingItem.drivers?.name}
                </p>
              </div>

              <div>
                <label className="form-label">Assign Date</label>
                <input 
                  type="date"
                  className="form-input"
                  value={editAssignDate}
                  onChange={(e) => setEditAssignDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label">Release Date (রিলিজ তারিখ)</label>
                <input 
                  type="date"
                  className="form-input"
                  value={editReleaseDate}
                  onChange={(e) => setEditReleaseDate(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">স্ট্যাটাস (Status)</label>
                <select 
                  className="form-input"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="active">Active (বর্তমানে চালাচ্ছে)</option>
                  <option value="released">Released (অব্যাহতিপ্রাপ্ত)</option>
                </select>
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
