import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CarFront, Plus, Trash2, Hash, Tag } from 'lucide-react';

export default function Rickshaws() {
  const [rickshaws, setRickshaws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [identityNo, setIdentityNo] = useState('');
  const [newRegNo, setNewRegNo] = useState('');
  const [status, setStatus] = useState('active');
  const [vehicleType, setVehicleType] = useState('Rickshaw');
  const [condition, setCondition] = useState('New');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchRickshaws();
  }, []);

  async function fetchRickshaws() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rickshaws')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      const loaded = data || [];
      setRickshaws(loaded);
      
      // Suggest initial identity_no based on default vehicleType ('Rickshaw')
      setIdentityNo(suggestNextIdentityNo('Rickshaw', loaded));
    } catch (error) {
      alert('Error fetching vehicles: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // Calculate next 3-digit Identity No (101+ for Rickshaw, 201+ for Auto)
  function suggestNextIdentityNo(type, list = rickshaws) {
    const minVal = type === 'Rickshaw' ? 101 : 201;
    const maxVal = type === 'Rickshaw' ? 199 : 299;
    const prefix = type === 'Rickshaw' ? '1' : '2';

    const numbers = list
      .map(r => r.identity_no)
      .filter(id => id && /^\d{3}$/.test(id) && id.startsWith(prefix))
      .map(id => parseInt(id, 10))
      .filter(num => num >= minVal && num <= maxVal);

    if (numbers.length === 0) {
      return String(minVal);
    }

    const maxNum = Math.max(...numbers);
    const nextNum = maxNum + 1;
    if (nextNum > maxVal) {
      return String(nextNum); // In case it goes beyond 199/299
    }
    return String(nextNum).padStart(3, '0');
  }

  function handleTypeChange(newType) {
    setVehicleType(newType);
    setIdentityNo(suggestNextIdentityNo(newType, rickshaws));
    setErrorMsg('');
  }

  function validateIdentityNo(idNum, type) {
    if (!/^\d{3}$/.test(idNum)) {
      return 'পরিচিতি নাম্বার অবশ্যই ৩ ডিজিটের হতে হবে (যেমন: ১০১ বা ২০১)।';
    }
    if (type === 'Rickshaw' && !idNum.startsWith('1')) {
      return 'রিকশার পরিচিতি নাম্বার ১০১ দিয়ে শুরু হওয়া আবশ্যক (১০১-১৯৯ range)।';
    }
    if (type === 'Auto' && !idNum.startsWith('2')) {
      return 'অটোর পরিচিতি নাম্বার ২০১ দিয়ে শুরু হওয়া আবশ্যক (২০১-২৯৯ range)।';
    }
    const exists = rickshaws.some(r => r.identity_no === idNum);
    if (exists) {
      return `পরিচিতি নাম্বার ${idNum} ইতোমধ্যে একজন গাড়িতে ব্যবহৃত হয়েছে। অনুগ্রহ করে ইউনিক পরিচিতি নাম্বার দিন।`;
    }
    return null;
  }

  function handlePreview(e) {
    e.preventDefault();
    setErrorMsg('');

    if (!newRegNo.trim()) {
      setErrorMsg('রেজিস্ট্রেশন নাম্বার প্রদান করুন।');
      return;
    }

    const valError = validateIdentityNo(identityNo, vehicleType);
    if (valError) {
      setErrorMsg(valError);
      return;
    }

    setShowPreview(true);
  }

  async function addRickshaw() {
    try {
      setErrorMsg('');
      const { data, error } = await supabase
        .from('rickshaws')
        .insert([{ 
          identity_no: identityNo,
          registration_number: newRegNo, 
          status,
          vehicle_type: vehicleType,
          condition,
          purchase_price: purchasePrice ? parseFloat(purchasePrice) : null
        }])
        .select();

      if (error) throw error;
      
      const updatedList = [data[0], ...rickshaws];
      setRickshaws(updatedList);
      setNewRegNo('');
      setStatus('active');
      setCondition('New');
      setPurchasePrice('');
      setShowPreview(false);
      
      // Auto-suggest next Identity No for current vehicle type
      setIdentityNo(suggestNextIdentityNo(vehicleType, updatedList));
    } catch (error) {
      alert('Error adding vehicle: ' + error.message);
    }
  }

  async function deleteRickshaw(id) {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই গাড়িটি মুছে ফেলতে চান?')) return;
    
    try {
      const { error } = await supabase
        .from('rickshaws')
        .delete()
        .eq('id', id);

      if (error) throw error;
      const updatedList = rickshaws.filter(r => r.id !== id);
      setRickshaws(updatedList);
      setIdentityNo(suggestNextIdentityNo(vehicleType, updatedList));
    } catch (error) {
      alert('Error deleting vehicle: ' + error.message);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-[#00f2fe]/10 to-transparent p-6 rounded-2xl border border-[#00f2fe]/20">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <CarFront className="text-[#00f2fe]" size={28} /> 
            নতুন গাড়ি ভুক্তি (New Vehicle Entry)
          </h2>
          <p className="text-white/70 text-sm mt-1">
            রিকশা ও অটোরিকশার ৩-ডিজিটের ইউনিক পরিচিতি নম্বর সহ নতুন গাড়ি এন্ট্রি ও তালিকা ব্যবস্থাপনা।
          </p>
        </div>
      </div>

      {/* Add New Vehicle Form */}
      <div className="glass-panel p-8 w-full">
        <h3 className="flex items-center gap-2 mb-6 text-[#00f2fe] text-xl font-bold">
          <Plus size={24} /> নতুন গাড়ি যুক্ত করুন
        </h3>
        
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handlePreview} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          
          <div className="form-group">
            <label className="form-label">গাড়ির ধরন (Vehicle Type)</label>
            <select className="form-input" value={vehicleType} onChange={(e) => handleTypeChange(e.target.value)}>
              <option value="Rickshaw">Rickshaw (রিক্সা)</option>
              <option value="Auto">Auto (অটো)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label flex justify-between items-center">
              <span>পরিচিতি নম্বর (Identity No)</span>
              <span className="text-xs text-[#00f2fe]/80 font-normal">
                {vehicleType === 'Rickshaw' ? '১০১ দিয়ে শুরু' : '২০১ দিয়ে শুরু'}
              </span>
            </label>
            <div className="relative">
              <input 
                type="text" 
                maxLength={3}
                className="form-input font-mono font-bold tracking-widest text-[#00f2fe]" 
                value={identityNo}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setIdentityNo(val);
                  setErrorMsg('');
                }}
                placeholder={vehicleType === 'Rickshaw' ? '101' : '201'}
                required
              />
              <Hash size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            </div>
            <p className="text-[11px] text-white/50 mt-1">
              ৩ ডিজিটের ইউনিক পরিচিতি নম্বর (রিকশা: ১০১+, অটো: ২০১+)
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">রেজিস্ট্রেশন নাম্বার</label>
            <input 
              type="text" 
              className="form-input" 
              value={newRegNo}
              onChange={(e) => setNewRegNo(e.target.value)}
              placeholder="e.g. ঢাকা-থ-১১-২২৩৩"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">প্রাথমিক ক্রয় মূল্য (৳)</label>
            <input 
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="form-input" 
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 150000"
            />
          </div>

          <div className="form-group">
            <label className="form-label">নতুন নাকি পুরাতন?</label>
            <select className="form-input" value={condition} onChange={(e) => setCondition(e.target.value)}>
              <option value="New">নতুন (New)</option>
              <option value="Old">পুরাতন (Old)</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">বর্তমান অবস্থা (Status)</label>
            <select 
              className="form-input" 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Active (সচল)</option>
              <option value="maintenance">Maintenance (মেরামত)</option>
              <option value="inactive">Inactive (বন্ধ)</option>
            </select>
          </div>
          
          <div className="lg:col-span-3 flex justify-end mt-2">
            <button type="submit" className="btn btn-primary w-full md:w-auto md:px-12 text-lg">
              যুক্ত করুন
            </button>
          </div>
        </form>
      </div>

      {/* Vehicle List */}
      <div className="glass-panel p-8 w-full">
        <h3 className="flex items-center gap-2 mb-6 text-[#00f2fe] text-xl font-bold">
          <CarFront size={24} /> সকল রেজিস্ট্রার্ড গাড়ির তালিকা
        </h3>
        
        {loading ? (
          <p className="text-white/60 animate-pulse">লোড হচ্ছে...</p>
        ) : rickshaws.length === 0 ? (
          <p className="text-white/60">কোনো গাড়ি পাওয়া যায়নি।</p>
        ) : (
          <div className="flex flex-col gap-4">
            {rickshaws.map(rickshaw => (
              <div 
                key={rickshaw.id} 
                className="flex justify-between items-center p-5 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 transition-colors duration-200"
              >
                <div className="flex items-start gap-4">
                  {/* Identity No Badge */}
                  <div className="flex flex-col items-center justify-center bg-[#00f2fe]/10 border border-[#00f2fe]/30 rounded-xl px-4 py-2 text-center min-w-[70px]">
                    <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">ID NO</span>
                    <span className="text-xl font-black text-[#00f2fe] font-mono">
                      {rickshaw.identity_no || 'N/A'}
                    </span>
                  </div>

                  <div>
                    <h4 className="m-0 text-lg font-bold text-white flex items-center gap-2">
                      {rickshaw.registration_number} 
                      <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70 font-normal">
                        {rickshaw.vehicle_type || 'N/A'}
                      </span>
                    </h4>
                    <div className="text-sm text-white/70 mt-1">
                      ক্রয় মূল্য: ৳{rickshaw.purchase_price ? Number(rickshaw.purchase_price).toLocaleString('bn-BD') : '0'} | অবস্থা: {rickshaw.condition === 'New' ? 'নতুন' : 'পুরাতন'}
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full inline-block mt-2 font-semibold ${
                      rickshaw.status === 'active' ? 'bg-[#00f2fe]/20 text-[#00f2fe]' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {rickshaw.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={() => deleteRickshaw(rickshaw.id)}
                  className="bg-transparent border-none text-red-400 hover:text-red-300 cursor-pointer p-2 transition-colors"
                  title="মুছে ফেলুন"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="glass-panel p-8 w-full max-w-md">
            <h3 className="mb-6 text-[#00f2fe] text-xl font-bold border-b border-white/10 pb-3">
              গাড়ির তথ্য প্রিভিউ (Preview)
            </h3>
            <div className="flex flex-col gap-4 mb-8 text-white/80">
              <p className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/60">পরিচিতি নম্বর (ID):</span> 
                <span className="font-mono font-bold text-[#00f2fe] text-lg">{identityNo}</span>
              </p>
              <p className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/60">গাড়ির ধরন:</span> 
                <span className="font-semibold text-white">{vehicleType === 'Auto' ? 'Auto (অটো)' : 'Rickshaw (রিক্সা)'}</span>
              </p>
              <p className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/60">রেজিস্ট্রেশন নাম্বার:</span> 
                <span className="font-semibold text-white">{newRegNo}</span>
              </p>
              <p className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/60">ক্রয় মূল্য:</span> 
                <span className="font-semibold text-white">৳{purchasePrice ? Number(purchasePrice).toLocaleString('bn-BD') : '0'}</span>
              </p>
              <p className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/60">অবস্থা:</span> 
                <span className="font-semibold text-white">{condition === 'New' ? 'নতুন (New)' : 'পুরাতন (Old)'}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-white/60">বর্তমান স্ট্যাটাস:</span> 
                <span className="font-semibold text-white">
                  {status === 'active' ? 'Active (সচল)' : status === 'maintenance' ? 'Maintenance (মেরামত)' : 'Inactive (বন্ধ)'}
                </span>
              </p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowPreview(false)} className="btn btn-secondary flex-1">বাতিল</button>
              <button onClick={addRickshaw} className="btn btn-primary flex-1">সাবমিট করুন</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
