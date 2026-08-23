import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, UserPlus, Trash2, Phone, MapPin, Calendar, CarFront, Plus } from 'lucide-react';

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [rickshaws, setRickshaws] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [rickshawId, setRickshawId] = useState('');
  const [joinedDate, setJoinedDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      // Fetch Rickshaws for the dropdown
      const { data: rickshawData, error: rickshawError } = await supabase
        .from('rickshaws')
        .select('id, registration_number');
      if (rickshawError) throw rickshawError;
      setRickshaws(rickshawData || []);

      // Fetch Drivers with their assigned rickshaw details
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select(`
          *,
          rickshaws (registration_number)
        `)
        .order('created_at', { ascending: false });
      if (driverError) throw driverError;
      setDrivers(driverData || []);
    } catch (error) {
      alert('Error fetching data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function addDriver(e) {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const { data, error } = await supabase
        .from('drivers')
        .insert([{ 
          name, 
          phone, 
          address, 
          rickshaw_id: rickshawId || null,
          joined_date: joinedDate || null
        }])
        .select(`*, rickshaws (registration_number)`);

      if (error) throw error;
      
      setDrivers([data[0], ...drivers]);
      // Reset form
      setName(''); setPhone(''); setAddress(''); setRickshawId(''); setJoinedDate('');
    } catch (error) {
      alert('Error adding driver: ' + error.message);
    }
  }

  async function deleteDriver(id) {
    if (!window.confirm('Are you sure you want to delete this driver?')) return;
    try {
      const { error } = await supabase.from('drivers').delete().eq('id', id);
      if (error) throw error;
      setDrivers(drivers.filter(d => d.id !== id));
    } catch (error) {
      alert('Error deleting driver: ' + error.message);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Add New Driver Form */}
      <div className="glass-panel p-8 lg:col-span-1 self-start">
        <h3 className="flex items-center gap-2 mb-6 text-[#00f2fe] text-xl font-bold">
          <UserPlus size={24} /> নতুন ড্রাইভার যুক্ত করুন
        </h3>
        
        <form onSubmit={addDriver} className="flex flex-col gap-4">
          <div>
            <label className="form-label">ড্রাইভারের নাম</label>
            <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. রহিম মিয়া" required />
          </div>
          
          <div>
            <label className="form-label">ফোন নম্বর</label>
            <input type="text" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 017xxxxxxxx" />
          </div>

          <div>
            <label className="form-label">ঠিকানা</label>
            <input type="text" className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. মিরপুর, ঢাকা" />
          </div>

          <div>
            <label className="form-label">অ্যাসাইন করা রিক্সা/অটো</label>
            <select className="form-input" value={rickshawId} onChange={(e) => setRickshawId(e.target.value)}>
              <option value="">-- কোনো রিক্সা/অটো নেই --</option>
              {rickshaws.map(r => (
                <option key={r.id} value={r.id}>{r.registration_number}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">যোগদানের তারিখ</label>
            <input type="date" className="form-input" value={joinedDate} onChange={(e) => setJoinedDate(e.target.value)} />
          </div>
          
          <button type="submit" className="btn btn-primary w-full mt-4">
            সংরক্ষণ করুন
          </button>
        </form>
      </div>

      {/* Driver List */}
      <div className="glass-panel p-8 lg:col-span-2">
        <h3 className="flex items-center gap-2 mb-6 text-[#00f2fe] text-xl font-bold">
          <Users size={24} /> ড্রাইভারদের তালিকা
        </h3>
        
        {loading ? (
          <p className="text-white/60 animate-pulse text-center py-8">লোড হচ্ছে...</p>
        ) : drivers.length === 0 ? (
          <p className="text-white/60 text-center py-8">কোনো ড্রাইভার পাওয়া যায়নি।</p>
        ) : (
          <div className="flex flex-col gap-4">
            {drivers.map(driver => (
              <div 
                key={driver.id} 
                className="flex justify-between items-start p-5 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 transition-colors duration-200"
              >
                <div className="flex flex-col gap-2 text-white/70">
                  <h4 className="m-0 text-lg font-bold text-white mb-1">{driver.name}</h4>
                  
                  {driver.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone size={14} className="text-[#00f2fe]" /> {driver.phone}
                    </div>
                  )}
                  {driver.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin size={14} className="text-red-400" /> {driver.address}
                    </div>
                  )}
                  {driver.rickshaws?.registration_number && (
                    <div className="flex items-center gap-2 text-sm font-medium text-orange-400">
                      <CarFront size={14} /> অ্যাসাইন করা রিক্সা: {driver.rickshaws.registration_number}
                    </div>
                  )}
                  {driver.joined_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={14} /> জয়েন: {driver.joined_date}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => deleteDriver(driver.id)}
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

    </div>
  );
}
