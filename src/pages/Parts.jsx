import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Wrench, ShoppingCart, Tag, Trash2, CarFront } from 'lucide-react';

export default function Parts() {
  const [transactions, setTransactions] = useState([]);
  const [rickshaws, setRickshaws] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form States
  const [rickshawId, setRickshawId] = useState('');
  const [type, setType] = useState('purchase');
  const [partName, setPartName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: rData, error: rError } = await supabase.from('rickshaws').select('id, registration_number');
      if (rError) throw rError;
      setRickshaws(rData || []);

      const { data: tData, error: tError } = await supabase
        .from('parts_transactions')
        .select(`*, rickshaws(registration_number)`)
        .order('transaction_date', { ascending: false });
      
      if (tError) throw tError;
      setTransactions(tData || []);
    } catch (error) {
      alert('Error fetching parts data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function addTransaction(e) {
    e.preventDefault();
    if (!partName || !amount) return;

    try {
      const { data, error } = await supabase
        .from('parts_transactions')
        .insert([{ 
          rickshaw_id: rickshawId || null, 
          transaction_type: type, 
          part_name: partName, 
          amount: parseFloat(amount), 
          transaction_date: date 
        }])
        .select(`*, rickshaws(registration_number)`);

      if (error) throw error;
      setTransactions([data[0], ...transactions]);
      
      // Reset form
      setPartName('');
      setAmount('');
    } catch (error) {
      alert('Error adding part transaction: ' + error.message);
    }
  }

  async function deleteTransaction(id) {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      const { error } = await supabase.from('parts_transactions').delete().eq('id', id);
      if (error) throw error;
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (error) {
      alert('Error deleting record: ' + error.message);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      {/* Add Transaction Form */}
      <div className={`glass-panel p-8 border-t-4 ${type === 'purchase' ? 'border-t-orange-500' : 'border-t-[#00f2fe]'}`}>
        <h3 className={`flex items-center gap-2 mb-6 text-xl font-bold ${type === 'purchase' ? 'text-orange-400' : 'text-[#00f2fe]'}`}>
          {type === 'purchase' ? <ShoppingCart size={24} /> : <Tag size={24} />} 
          যন্ত্রাংশ {type === 'purchase' ? 'ক্রয় (Purchase)' : 'বিক্রয় (Sale)'} এন্ট্রি
        </h3>
        
        <form onSubmit={addTransaction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 mb-2">
            <button 
              type="button" 
              onClick={() => setType('purchase')}
              className={`btn flex-1 py-3 text-sm rounded-xl transition-all ${type === 'purchase' ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
            >
              ক্রয় (Purchase)
            </button>
            <button 
              type="button" 
              onClick={() => setType('sale')}
              className={`btn flex-1 py-3 text-sm rounded-xl transition-all ${type === 'sale' ? 'bg-[#00f2fe] text-black shadow-[0_0_15px_rgba(0,242,254,0.4)]' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
            >
              পুরাতন বিক্রয় (Sale)
            </button>
          </div>

          <div>
            <label className="form-label">রিক্সা/অটো নির্বাচন করুন (যদি নির্দিষ্ট রিক্সা/অটোর জন্য হয়)</label>
            <select className="form-input" value={rickshawId} onChange={(e) => setRickshawId(e.target.value)}>
              <option value="">-- রিক্সা/অটো সিলেক্ট করুন --</option>
              {rickshaws.map(r => <option key={r.id} value={r.id}>{r.registration_number}</option>)}
            </select>
          </div>
          
          <div>
            <label className="form-label">যন্ত্রাংশের নাম</label>
            <input type="text" className="form-input" value={partName} onChange={(e) => setPartName(e.target.value)} placeholder="e.g. ব্যাটারি, চাকা" required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">টাকার পরিমাণ</label>
              <input type="text" inputMode="numeric" pattern="[0-9]*" className="form-input" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" required />
            </div>
            <div>
              <label className="form-label">তারিখ</label>
              <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
          
          <button type="submit" className={`btn text-white w-full mt-4 ${type === 'purchase' ? 'bg-orange-500 hover:bg-orange-600 shadow-[0_4px_15px_rgba(249,115,22,0.3)]' : 'bg-[#00f2fe] hover:bg-[#0891b2] text-black shadow-[0_4px_15px_rgba(0,242,254,0.3)]'}`}>
            সংরক্ষণ করুন
          </button>
        </form>
      </div>

      {/* Transactions List */}
      <div className="glass-panel p-8">
        <h3 className="flex items-center gap-2 mb-6 text-[#00f2fe] text-xl font-bold">
          <Wrench size={24} /> যন্ত্রাংশের তালিকা
        </h3>
        
        {loading ? (
          <p className="text-white/60 animate-pulse text-center py-8">লোড হচ্ছে...</p>
        ) : transactions.length === 0 ? (
          <p className="text-white/60 text-center py-8">কোনো রেকর্ড পাওয়া যায়নি।</p>
        ) : (
          <div className="flex flex-col gap-4">
            {transactions.map(t => (
              <div 
                key={t.id} 
                className={`flex justify-between items-start p-5 border border-white/10 border-l-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors duration-200 ${t.transaction_type === 'purchase' ? 'border-l-orange-500' : 'border-l-[#00f2fe]'}`}
              >
                <div className="flex flex-col gap-1 text-white/70">
                  <h4 className="m-0 text-lg font-bold text-white mb-1">{t.partName || t.part_name}</h4>
                  
                  <div className={`font-semibold text-[15px] ${t.transaction_type === 'purchase' ? 'text-orange-400' : 'text-[#00f2fe]'}`}>
                    {t.transaction_type === 'purchase' ? 'ক্রয়' : 'বিক্রয়'}: ৳{t.amount}
                  </div>
                  
                  {t.rickshaws?.registration_number && (
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <CarFront size={14} /> {t.rickshaws.registration_number}
                    </div>
                  )}
                  <div className="text-sm">তারিখ: {t.transaction_date}</div>
                </div>

                <button onClick={() => deleteTransaction(t.id)} className="bg-transparent border-none text-red-400 hover:text-red-300 cursor-pointer p-2 transition-colors">
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
