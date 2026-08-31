import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Wrench, ShoppingCart, Tag, Trash2, CarFront, MessageSquare } from 'lucide-react';
import { today, formatDate, bn } from '../lib/date';

// যন্ত্রাংশের তালিকা — ক্রয় ও বিক্রয় দুই ট্যাবেই একই
const PART_NAMES = [
  'মোটর (Motor)',
  'ব্যাটারি (Battery)',
  'কন্ট্রোলার (Controller)',
  'চার্জার (Charger)',
  'এক্সিলারেটর (Throttle)',
  'ব্রেক (Brake)',
  'ব্রেক শু (Brake Shoe)',
  'ওয়্যারিং (Wiring)',
  'টায়ার (Tyre)',
  'টিউব (Tube)',
  'রিম (Rim)',
  'ফর্ক (Fork)',
  'হ্যান্ডেল (Handle)',
  'সুইচ (Switch)',
  'হর্ন (Horn)',
  'হেডলাইট (Headlight)',
  'ইন্ডিকেটর (Indicator)',
  'স্প্রিং (Spring)',
  'শক অবজাবার (Shock Absorber)',
  'ডিফারেন্জিয়াল (Differential)',
  'চেচিস (Chassis)',
  'সিট (Seat)',
  'বিবিধ',
];

const MISC_PART = 'বিবিধ';

export default function Parts() {
  // Only an admin may delete; everyone else can add and edit
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  const [transactions, setTransactions] = useState([]);
  const [rickshaws, setRickshaws] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form States
  const [rickshawId, setRickshawId] = useState('');
  const [type, setType] = useState('purchase');
  const [partName, setPartName] = useState('');
  const [partNote, setPartNote] = useState('');   // "বিবিধ" হলে তার বিস্তারিত
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: rData, error: rError } = await supabase.from('rickshaws').select('id, registration_number, identity_no');
      if (rError) throw rError;
      setRickshaws(rData || []);

      const { data: tData, error: tError } = await supabase
        .from('parts_transactions')
        .select(`*, rickshaws(registration_number, identity_no)`)
        .order('transaction_date', { ascending: false });
      
      if (tError) throw tError;
      setTransactions(tData || []);
    } catch (error) {
      alert('Error fetching parts data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // যন্ত্রাংশ বদলালে — "বিবিধ" ছাড়া অন্য কিছু হলে বিস্তারিতের ঘরটি খালি হয়ে যায়
  function handlePartNameChange(value) {
    setPartName(value);
    if (value !== MISC_PART) setPartNote('');
  }

  async function addTransaction(e) {
    e.preventDefault();
    if (!partName || !amount) return;
    if (partName === MISC_PART && !partNote.trim()) {
      alert('বিবিধ যন্ত্রাংশের বিস্তারিত লিখুন।');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('parts_transactions')
        .insert([{ 
          rickshaw_id: rickshawId || null, 
          transaction_type: type, 
          part_name: partName === MISC_PART ? `বিবিধ — ${partNote.trim()}` : partName, 
          amount: parseFloat(amount), 
          transaction_date: date 
        }])
        .select(`*, rickshaws(registration_number, identity_no)`);

      if (error) throw error;
      setTransactions([data[0], ...transactions]);
      
      // Reset form
      setPartName('');
      setPartNote('');
      setAmount('');
    } catch (error) {
      alert('Error adding part transaction: ' + error.message);
    }
  }

  async function deleteTransaction(id) {
    if (!isAdmin) return;
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
    <div className="flex flex-col gap-3 md:gap-6">

      {/* Add Transaction Form */}
      <div className={`glass-panel panel-pad border-t-4 ${type === 'purchase' ? 'border-t-orange-500' : 'border-t-[#00f2fe]'}`}>
        <h3 className={`panel-title ${type === 'purchase' ? 'text-orange-400' : 'text-[#00f2fe]'}`}>
          {type === 'purchase' ? <ShoppingCart size={20} /> : <Tag size={20} />}
          যন্ত্রাংশ {type === 'purchase' ? 'ক্রয় (Purchase)' : 'বিক্রয় (Sale)'} এন্ট্রি
        </h3>
        
        <form onSubmit={addTransaction} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5 mb-1">
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
              {rickshaws.map(r => (
                <option key={r.id} value={r.id}>
                  {r.identity_no ? `[ID: ${r.identity_no}] ` : ''}{r.registration_number}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="form-label">যন্ত্রাংশের নাম</label>
            <select
              className="form-input"
              value={partName}
              onChange={(e) => handlePartNameChange(e.target.value)}
              required
            >
              <option value="">-- যন্ত্রাংশ নির্বাচন করুন --</option>
              {PART_NAMES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* "বিবিধ" বেছে নিলে বিস্তারিত লেখার ঘরটি নিজে থেকেই চলে আসে */}
          {partName === MISC_PART && (
            <div>
              <label className="form-label">বিবিধ যন্ত্রাংশের বিস্তারিত</label>
              <div className="relative">
                <textarea
                  className="form-input pl-11 resize-y min-h-[52px]"
                  rows={2}
                  value={partNote}
                  onChange={(e) => setPartNote(e.target.value)}
                  placeholder="যেমনঃ চাকার বেয়ারিং, স্পোক"
                  autoFocus
                  required
                />
                <MessageSquare size={18} className="absolute left-3.5 top-3.5 text-white/30 pointer-events-none" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">টাকার পরিমাণ</label>
              <input type="text" inputMode="numeric" pattern="[0-9]*" className="form-input" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" required />
            </div>
            <div>
              <label className="form-label">তারিখ</label>
              <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
          
          <button type="submit" className={`btn text-white w-full mt-2 ${type === 'purchase' ? 'bg-orange-500 hover:bg-orange-600 shadow-[0_4px_15px_rgba(249,115,22,0.3)]' : 'bg-[#00f2fe] hover:bg-[#0891b2] text-black shadow-[0_4px_15px_rgba(0,242,254,0.3)]'}`}>
            সংরক্ষণ করুন
          </button>
        </form>
      </div>

      {/* Transactions List */}
      <div className="glass-panel panel-pad">
        <h3 className="panel-title text-[#00f2fe]">
          <Wrench size={20} /> যন্ত্রাংশের তালিকা
        </h3>
        
        {loading ? (
          <p className="text-white/60 animate-pulse text-center py-8">লোড হচ্ছে...</p>
        ) : transactions.length === 0 ? (
          <p className="text-white/60 text-center py-8">কোনো রেকর্ড পাওয়া যায়নি।</p>
        ) : (
          <div className="flex flex-col gap-2.5 md:gap-4">
            {transactions.map(t => (
              <div 
                key={t.id} 
                className={`flex justify-between items-start gap-2 p-3 md:p-5 border border-white/10 border-l-4 rounded-xl bg-white/5 md:hover:bg-white/10 transition-colors duration-200 ${t.transaction_type === 'purchase' ? 'border-l-orange-500' : 'border-l-[#00f2fe]'}`}
              >
                <div className="flex flex-col gap-0.5 text-white/70 min-w-0">
                  <h4 className="m-0 text-base md:text-lg font-bold text-white break-words">{t.part_name}</h4>
                  
                  <div className={`font-semibold text-sm md:text-[15px] ${t.transaction_type === 'purchase' ? 'text-orange-400' : 'text-[#00f2fe]'}`}>
                    {t.transaction_type === 'purchase' ? 'ক্রয়' : 'বিক্রয়'}: ৳ {bn(t.amount)}
                  </div>
                  
                  {t.rickshaws?.registration_number && (
                    <div className="flex items-center gap-1.5 text-xs md:text-sm mt-0.5 flex-wrap">
                      <CarFront size={13} className="shrink-0" />
                      {t.rickshaws.identity_no && <span className="id-badge">{t.rickshaws.identity_no}</span>}
                      <span>{t.rickshaws.registration_number}</span>
                    </div>
                  )}
                  <div className="text-sm">তারিখ: {formatDate(t.transaction_date)}</div>
                </div>

                {isAdmin && (
                  <button
                  onClick={() => deleteTransaction(t.id)}
                  className="bg-transparent border-none text-red-400 md:hover:text-red-300 cursor-pointer p-2 transition-colors shrink-0"
                  aria-label="মুছে ফেলুন"
                >
                  <Trash2 size={18} />
                </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
