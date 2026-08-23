import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CarFront, Plus, Trash2 } from 'lucide-react';

export default function Rickshaws() {
  const [rickshaws, setRickshaws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRegNo, setNewRegNo] = useState('');
  const [status, setStatus] = useState('active');
  const [vehicleType, setVehicleType] = useState('Auto');
  const [condition, setCondition] = useState('New');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [showPreview, setShowPreview] = useState(false);

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
      setRickshaws(data || []);
    } catch (error) {
      alert('Error fetching rickshaws: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function handlePreview(e) {
    e.preventDefault();
    if (!newRegNo.trim()) return;
    setShowPreview(true);
  }

  async function addRickshaw() {
    try {
      const { data, error } = await supabase
        .from('rickshaws')
        .insert([{ 
          registration_number: newRegNo, 
          status,
          vehicle_type: vehicleType,
          condition,
          purchase_price: purchasePrice ? parseFloat(purchasePrice) : null
        }])
        .select();

      if (error) throw error;
      
      setRickshaws([data[0], ...rickshaws]);
      setNewRegNo('');
      setStatus('active');
      setVehicleType('Auto');
      setCondition('New');
      setPurchasePrice('');
      setShowPreview(false);
    } catch (error) {
      alert('Error adding rickshaw: ' + error.message);
    }
  }

  async function deleteRickshaw(id) {
    if (!window.confirm('Are you sure you want to delete this rickshaw?')) return;
    
    try {
      const { error } = await supabase
        .from('rickshaws')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setRickshaws(rickshaws.filter(r => r.id !== id));
    } catch (error) {
      alert('Error deleting rickshaw: ' + error.message);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Add New Rickshaw Form */}
      <div className="glass-panel p-8 lg:col-span-1 self-start">
        <h3 className="flex items-center gap-2 mb-6 text-[#00f2fe] text-xl font-bold">
          <Plus size={24} /> নতুন রিক্সা/অটো যুক্ত করুন
        </h3>
        
        <form onSubmit={handlePreview}>
          <div className="form-group">
            <label className="form-label">ধরন (Type)</label>
            <select className="form-input" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
              <option value="Auto">Auto (অটো)</option>
              <option value="Rickshaw">Rickshaw (রিক্সা)</option>
            </select>
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
          
          <button type="submit" className="btn btn-primary w-full mt-4">
            যুক্ত করুন
          </button>
        </form>
      </div>

      {/* Rickshaw List */}
      <div className="glass-panel p-8 lg:col-span-2">
        <h3 className="flex items-center gap-2 mb-6 text-[#00f2fe] text-xl font-bold">
          <CarFront size={24} /> সকল রিক্সা/অটো তালিকা
        </h3>
        
        {loading ? (
          <p className="text-white/60 animate-pulse">লোড হচ্ছে...</p>
        ) : rickshaws.length === 0 ? (
          <p className="text-white/60">কোনো রিক্সা/অটো পাওয়া যায়নি।</p>
        ) : (
          <div className="flex flex-col gap-4">
            {rickshaws.map(rickshaw => (
              <div 
                key={rickshaw.id} 
                className="flex justify-between items-center p-5 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 transition-colors duration-200"
              >
                <div>
                  <h4 className="m-0 text-lg font-bold text-white">
                    {rickshaw.registration_number} 
                    <span className="text-xs text-white/50 ml-2 font-normal">
                      ({rickshaw.vehicle_type || 'N/A'})
                    </span>
                  </h4>
                  <div className="text-sm text-white/70 mt-1">
                    ক্রয় মূল্য: ৳{rickshaw.purchase_price || '0'} | অবস্থা: {rickshaw.condition || 'N/A'}
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full inline-block mt-3 font-semibold ${
                    rickshaw.status === 'active' ? 'bg-[#00f2fe]/20 text-[#00f2fe]' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {rickshaw.status.toUpperCase()}
                  </span>
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
            <h3 className="mb-6 text-[#00f2fe] text-xl font-bold">তথ্য প্রিভিউ (Preview)</h3>
            <div className="flex flex-col gap-4 mb-8 text-white/80">
              <p><strong className="text-white">ধরন:</strong> {vehicleType === 'Auto' ? 'Auto (অটো)' : 'Rickshaw (রিক্সা)'}</p>
              <p><strong className="text-white">রেজিস্ট্রেশন নাম্বার:</strong> {newRegNo}</p>
              <p><strong className="text-white">ক্রয় মূল্য:</strong> ৳{purchasePrice || '0'}</p>
              <p><strong className="text-white">অবস্থা:</strong> {condition === 'New' ? 'নতুন (New)' : 'পুরাতন (Old)'}</p>
              <p><strong className="text-white">বর্তমান অবস্থা (Status):</strong> {status === 'active' ? 'Active (সচল)' : status === 'maintenance' ? 'Maintenance (মেরামত)' : 'Inactive (বন্ধ)'}</p>
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
