import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserCheck, Plus, Trash2, Edit2, CarFront, Hash, Calendar, User, CheckCircle2, XCircle, LogOut } from 'lucide-react';

export default function AssignDriverVehicle() {
  const [rickshaws, setRickshaws] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedRickshawId, setSelectedRickshawId] = useState('');
  const [selectedRegNo, setSelectedRegNo] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [assignDate, setAssignDate] = useState(new Date().toISOString().split('T')[0]);
  const [releaseDate, setReleaseDate] = useState('');
  const [status, setStatus] = useState('active');

  // Edit Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [editAssignDate, setEditAssignDate] = useState('');
  const [editReleaseDate, setEditReleaseDate] = useState('');
  const [editStatus, setEditStatus] = useState('active');

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
        const todayStr = new Date().toISOString().split('T')[0];
        
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
      setAssignDate(new Date().toISOString().split('T')[0]);
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
    
    const todayStr = new Date().toISOString().split('T')[0];
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
    <div className="flex flex-col gap-8">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-[#00f2fe]/10 via-purple-500/10 to-transparent p-6 rounded-2xl border border-[#00f2fe]/20">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <UserCheck className="text-[#00f2fe]" size={28} /> 
            Assign Driver with Vehicle (ড্রাইভার অ্যাসাইনমেন্ট)
          </h2>
          <p className="text-white/70 text-sm mt-1">
            কোন ড্রাইভার কোন গাড়ি কত তারিখ থেকে কত তারিখ পর্যন্ত চালাচ্ছে তার অ্যাসাইনমেন্ট ও রিলিজ রেকর্ড।
          </p>
        </div>
      </div>

      {/* Form Section */}
      <div className="glass-panel p-8 w-full">
        <h3 className="flex items-center gap-2 mb-6 text-[#00f2fe] text-xl font-bold">
          <Plus size={24} /> নতুন ড্রাইভার অ্যাসাইন করুন
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          
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
              {rickshaws.map(r => (
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
              {drivers.map(d => (
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

          {/* 5. Release Date */}
          <div className="form-group">
            <label className="form-label">৫. Release Date (রিলিজ তারিখ - অপশনাল)</label>
            <input 
              type="date" 
              className="form-input" 
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
            />
          </div>

          {/* 6. Status */}
          <div className="form-group">
            <label className="form-label">৬. স্ট্যাটাস (Status)</label>
            <select 
              className="form-input" 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Active (বর্তমানে চালাচ্ছে)</option>
              <option value="released">Released (অব্যাহতিপ্রাপ্ত)</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="lg:col-span-3 flex justify-end mt-2">
            <button type="submit" className="btn btn-primary w-full md:w-auto md:px-12 text-lg">
              সংরক্ষণ করুন
            </button>
          </div>

        </form>
      </div>

      {/* List Table Section */}
      <div className="glass-panel p-8 w-full">
        <h3 className="flex items-center gap-2 mb-6 text-[#00f2fe] text-xl font-bold">
          <UserCheck size={24} /> ড্রাইভার অ্যাসাইনমেন্ট তালিকা
        </h3>

        {loading ? (
          <p className="text-white/60 animate-pulse text-center py-8">লোড হচ্ছে...</p>
        ) : assignments.length === 0 ? (
          <p className="text-white/60 text-center py-8">এখনো কোনো অ্যাসাইনমেন্ট রেকর্ড নেই।</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
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
                {assignments.map(item => (
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
                      {item.assign_date}
                    </td>

                    {/* Release Date */}
                    <td className="p-4 text-white/70 font-mono">
                      {item.release_date || 'চলমান'}
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
              <Edit2 size={20} /> অ্যাসাইনমেন্ট আপডেট করুন
            </h3>
            
            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
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
