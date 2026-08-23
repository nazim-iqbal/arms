import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, UserPlus, Trash2, Phone, MapPin, IdCard, User, HeartHandshake, FileText, CheckSquare, Square, Eye, X } from 'lucide-react';

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [dob, setDob] = useState('');
  const [nidNo, setNidNo] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [presentAddress, setPresentAddress] = useState('');
  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  const [specialRemarks, setSpecialRemarks] = useState('');
  const [referredBy, setReferredBy] = useState('');

  // Detail Modal State
  const [selectedDriver, setSelectedDriver] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      // Fetch Drivers
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });
      if (driverError) throw driverError;
      setDrivers(driverData || []);
    } catch (error) {
      alert('Error fetching driver data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle "Same as Permanent Address" Checkbox Toggle
  function handleSameAddressToggle() {
    const nextVal = !sameAsPermanent;
    setSameAsPermanent(nextVal);
    if (nextVal) {
      setPresentAddress(permanentAddress);
    }
  }

  // Handle Permanent Address Input Change
  function handlePermanentAddressChange(e) {
    const val = e.target.value;
    setPermanentAddress(val);
    if (sameAsPermanent) {
      setPresentAddress(val);
    }
  }

  async function addDriver(e) {
    e.preventDefault();
    if (!name.trim()) {
      alert('ড্রাইভারের নাম প্রদান করুন।');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('drivers')
        .insert([{ 
          name,
          father_name: fatherName,
          mother_name: motherName,
          dob: dob || null,
          nid_no: nidNo,
          phone,
          photo_url: photoUrl,
          permanent_address: permanentAddress,
          present_address: presentAddress,
          special_remarks: specialRemarks,
          referred_by: referredBy
        }])
        .select();

      if (error) throw error;
      
      setDrivers([data[0], ...drivers]);
      
      // Reset Form
      setName('');
      setFatherName('');
      setMotherName('');
      setDob('');
      setNidNo('');
      setPhone('');
      setPhotoUrl('');
      setPermanentAddress('');
      setPresentAddress('');
      setSameAsPermanent(false);
      setSpecialRemarks('');
      setReferredBy('');

      alert('ড্রাইভারের তথ্য সফলভাবে সংরক্ষণ করা হয়েছে!');
    } catch (error) {
      alert('Error adding driver: ' + error.message);
    }
  }

  async function deleteDriver(id) {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই ড্রাইভারটি মুছে ফেলতে চান?')) return;
    try {
      const { error } = await supabase.from('drivers').delete().eq('id', id);
      if (error) throw error;
      setDrivers(drivers.filter(d => d.id !== id));
      if (selectedDriver?.id === id) setSelectedDriver(null);
    } catch (error) {
      alert('Error deleting driver: ' + error.message);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-[#00f2fe]/10 via-purple-500/10 to-transparent p-6 rounded-2xl border border-[#00f2fe]/20">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="text-[#00f2fe]" size={28} /> 
            ড্রাইভার রেজিস্ট্রি (Driver Registry)
          </h2>
          <p className="text-white/70 text-sm mt-1">
            ড্রাইভারদের বিস্তারিত ব্যাক্তিগত তথ্য, স্থায়ী ও বর্তমান ঠিকানা, বিশেষ মন্তব্য ও রেফারেন্সসহ প্রোফাইল।
          </p>
        </div>
      </div>

      {/* Driver Entry Form (Full Width - Top) */}
      <div className="glass-panel p-8 w-full">
        <h3 className="flex items-center gap-2 mb-6 text-[#00f2fe] text-xl font-bold border-b border-white/10 pb-3">
          <UserPlus size={24} /> নতুন ড্রাইভার যুক্ত করুন
        </h3>
        
        <form onSubmit={addDriver} className="flex flex-col gap-6">
          
          {/* Row 1: Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="form-label">ড্রাইভারের নাম *</label>
              <input 
                type="text" 
                className="form-input font-medium" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g. মোঃ রহিম মিয়া" 
                required 
              />
            </div>

            <div>
              <label className="form-label">বাবার নাম</label>
              <input 
                type="text" 
                className="form-input" 
                value={fatherName} 
                onChange={(e) => setFatherName(e.target.value)} 
                placeholder="বাবার নাম লিখুন" 
              />
            </div>

            <div>
              <label className="form-label">মায়ের নাম</label>
              <input 
                type="text" 
                className="form-input" 
                value={motherName} 
                onChange={(e) => setMotherName(e.target.value)} 
                placeholder="মায়ের নাম লিখুন" 
              />
            </div>

            <div>
              <label className="form-label">জন্ম তারিখ</label>
              <input 
                type="date" 
                className="form-input" 
                value={dob} 
                onChange={(e) => setDob(e.target.value)} 
              />
            </div>

            <div>
              <label className="form-label">এনআইডি নং (NID No)</label>
              <input 
                type="text" 
                className="form-input font-mono" 
                value={nidNo} 
                onChange={(e) => setNidNo(e.target.value.replace(/\D/g, ''))} 
                placeholder="e.g. 1990xxxxxxxx" 
              />
            </div>

            <div>
              <label className="form-label">মোবাইল নং</label>
              <input 
                type="text" 
                className="form-input font-mono" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="e.g. 017xxxxxxxx" 
              />
            </div>

            <div className="lg:col-span-3">
              <label className="form-label">ছবি (Photo URL/Link)</label>
              <input 
                type="url" 
                className="form-input" 
                value={photoUrl} 
                onChange={(e) => setPhotoUrl(e.target.value)} 
                placeholder="https://..." 
              />
            </div>
          </div>

          {/* Row 2: Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-white/10">
            <div>
              <label className="form-label font-semibold text-[#00f2fe]">১. স্থায়ী ঠিকানা (Permanent Address)</label>
              <textarea 
                rows={3}
                className="form-input resize-none" 
                value={permanentAddress} 
                onChange={handlePermanentAddressChange} 
                placeholder="গ্রাম/রাস্তা, পোস্ট অফিস, থানা, জেলা" 
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="form-label font-semibold text-[#00f2fe] mb-0">২. বর্তমান ঠিকানা (Present Address)</label>
                <div 
                  onClick={handleSameAddressToggle}
                  className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-[#00f2fe] hover:text-[#00f2fe]/80 transition-colors"
                >
                  {sameAsPermanent ? (
                    <CheckSquare size={16} className="text-[#00f2fe]" />
                  ) : (
                    <Square size={16} className="text-white/50" />
                  )}
                  <span>স্থায়ী ঠিকানা ও বর্তমান ঠিকানা একই</span>
                </div>
              </div>
              <textarea 
                rows={3}
                className={`form-input resize-none ${sameAsPermanent ? 'bg-white/5 cursor-not-allowed opacity-80' : ''}`}
                value={presentAddress} 
                onChange={(e) => {
                  if (!sameAsPermanent) setPresentAddress(e.target.value);
                }} 
                readOnly={sameAsPermanent}
                placeholder="বর্তমান বসবাসের ঠিকানা" 
              />
            </div>
          </div>

          {/* Row 3: Remarks & Referred By */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-white/10">
            <div>
              <label className="form-label">বিশেষ মন্তব্য (Special Remarks)</label>
              <textarea 
                rows={3}
                className="form-input resize-none" 
                value={specialRemarks} 
                onChange={(e) => setSpecialRemarks(e.target.value)} 
                placeholder="ড্রাইভারের সম্পর্কিত যেকোনো বিশেষ নোটিশ বা প্রয়োজনীয় তথ্য লিখুন..." 
              />
            </div>

            <div>
              <label className="form-label">রেফার্ড বাই (Referred By)</label>
              <textarea 
                rows={3}
                className="form-input resize-none" 
                value={referredBy} 
                onChange={(e) => setReferredBy(e.target.value)} 
                placeholder="যার মাধ্যমে ড্রাইভার এসেছে তার নাম, ফোন বা বিস্তারিত তথ্য লিখুন..." 
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-2">
            <button type="submit" className="btn btn-primary w-full md:w-auto md:px-12 text-lg py-3">
              সংরক্ষণ করুন
            </button>
          </div>

        </form>
      </div>

      {/* Driver List Section (Full Width - Bottom) */}
      <div className="glass-panel p-8 w-full">
        <h3 className="flex items-center gap-2 mb-6 text-[#00f2fe] text-xl font-bold border-b border-white/10 pb-3">
          <Users size={24} /> ড্রাইভারদের তালিকা ({drivers.length})
        </h3>
        
        {loading ? (
          <p className="text-white/60 animate-pulse text-center py-8">লোড হচ্ছে...</p>
        ) : drivers.length === 0 ? (
          <p className="text-white/60 text-center py-8">কোনো ড্রাইভার পাওয়া যায়নি।</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map(driver => (
              <div 
                key={driver.id} 
                className="flex flex-col justify-between p-5 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 gap-4"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar / Photo */}
                  {driver.photo_url ? (
                    <img 
                      src={driver.photo_url} 
                      alt={driver.name} 
                      className="w-16 h-16 rounded-xl object-cover border border-[#00f2fe]/40 shadow-md shrink-0" 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/150?text=Driver';
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[#00f2fe]/10 border border-[#00f2fe]/30 flex items-center justify-center text-[#00f2fe] shrink-0">
                      <User size={32} />
                    </div>
                  )}

                  <div className="flex flex-col gap-1 text-white/70 overflow-hidden">
                    <h4 className="m-0 text-lg font-bold text-white truncate flex items-center gap-2">
                      {driver.name}
                    </h4>

                    {driver.phone && (
                      <div className="flex items-center gap-2 text-sm text-white/90 font-mono mt-0.5">
                        <Phone size={14} className="text-[#00f2fe] shrink-0" /> {driver.phone}
                      </div>
                    )}
                    
                    {driver.nid_no && (
                      <div className="flex items-center gap-2 text-xs text-white/60 font-mono">
                        <IdCard size={14} className="text-purple-400 shrink-0" /> NID: {driver.nid_no}
                      </div>
                    )}

                    {driver.present_address && (
                      <div className="flex items-center gap-2 text-xs text-white/70 truncate mt-0.5">
                        <MapPin size={13} className="text-red-400 shrink-0" /> {driver.present_address}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-3 mt-auto">
                  <button 
                    onClick={() => setSelectedDriver(driver)}
                    className="btn btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
                    title="সম্পূর্ণ প্রোফাইল দেখুন"
                  >
                    <Eye size={14} /> বিস্তারিত
                  </button>
                  <button 
                    onClick={() => deleteDriver(driver.id)}
                    className="p-1.5 text-red-400 hover:text-red-300 transition-colors rounded-lg hover:bg-white/10"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Driver Detail Profile Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="glass-panel p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <button 
              onClick={() => setSelectedDriver(null)}
              className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-white/10 pb-6 mb-6">
              {selectedDriver.photo_url ? (
                <img 
                  src={selectedDriver.photo_url} 
                  alt={selectedDriver.name} 
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-[#00f2fe] shadow-lg shrink-0"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-[#00f2fe]/10 border-2 border-[#00f2fe] flex items-center justify-center text-[#00f2fe] shrink-0">
                  <User size={48} />
                </div>
              )}

              <div className="text-center sm:text-left">
                <h3 className="text-2xl font-bold text-white">{selectedDriver.name}</h3>
                <p className="text-sm text-[#00f2fe] mt-1 font-mono">
                  {selectedDriver.phone ? `মোবাইল: ${selectedDriver.phone}` : 'মোবাইল নম্বর নেই'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-white/80">
              <div className="space-y-3">
                <p className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/50">বাবার নাম:</span>
                  <span className="font-semibold text-white">{selectedDriver.father_name || 'N/A'}</span>
                </p>
                <p className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/50">মায়ের নাম:</span>
                  <span className="font-semibold text-white">{selectedDriver.mother_name || 'N/A'}</span>
                </p>
                <p className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/50">जन्म তারিখ:</span>
                  <span className="font-semibold text-white">{selectedDriver.dob || 'N/A'}</span>
                </p>
                <p className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/50">এনআইডি নম্বর:</span>
                  <span className="font-semibold font-mono text-white">{selectedDriver.nid_no || 'N/A'}</span>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs text-[#00f2fe] font-bold uppercase tracking-wider block mb-1">
                    ১. স্থায়ী ঠিকানা:
                  </span>
                  <p className="p-3 bg-white/5 rounded-xl border border-white/10 text-white">
                    {selectedDriver.permanent_address || 'তথ্য দেওয়া হয়নি'}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-[#00f2fe] font-bold uppercase tracking-wider block mb-1">
                    ২. বর্তমান ঠিকানা:
                  </span>
                  <p className="p-3 bg-white/5 rounded-xl border border-white/10 text-white">
                    {selectedDriver.present_address || 'তথ্য দেওয়া হয়নি'}
                  </p>
                </div>
              </div>

              {/* Remarks & Referred By Full Width */}
              <div className="md:col-span-2 space-y-4 pt-2 border-t border-white/10">
                <div>
                  <span className="text-xs text-purple-400 font-bold uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <FileText size={14} /> বিশেষ মন্তব্য:
                  </span>
                  <p className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-200 whitespace-pre-wrap">
                    {selectedDriver.special_remarks || 'কোনো বিশেষ মন্তব্য নেই'}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-amber-400 font-bold uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <HeartHandshake size={14} /> রেফার্ড বাই (Referred By):
                  </span>
                  <p className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-200 whitespace-pre-wrap">
                    {selectedDriver.referred_by || 'কোনো রেফারেন্স রেকর্ড নেই'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button onClick={() => setSelectedDriver(null)} className="btn btn-secondary px-8">
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
