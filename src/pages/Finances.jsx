import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowUpCircle, ArrowDownCircle, Trash2, CarFront } from 'lucide-react';

export default function Finances() {
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [rickshaws, setRickshaws] = useState([]);
  const [depositRates, setDepositRates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tab State
  const [activeTab, setActiveTab] = useState('deposit');

  // States for Income Form
  const [incomeRickshawId, setIncomeRickshawId] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [incomeParticulars, setIncomeParticulars] = useState('দৈনিক ভাড়ার জমা');

  // States for Expense Form
  const [expenseRickshawId, setExpenseRickshawId] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseParticulars, setExpenseParticulars] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: rData, error: rError } = await supabase.from('rickshaws').select('id, registration_number, identity_no');
      if (rError) throw rError;
      setRickshaws(rData || []);

      const { data: iData, error: iError } = await supabase
        .from('daily_incomes')
        .select(`*, rickshaws(registration_number, identity_no)`)
        .order('date', { ascending: false });
      if (iError) throw iError;
      setIncomes(iData || []);

      const { data: eData, error: eError } = await supabase
        .from('daily_expenses')
        .select(`*, rickshaws(registration_number, identity_no)`)
        .order('date', { ascending: false });
      if (eError) throw eError;
      setExpenses(eData || []);

      // Fetch active daily deposit settings
      const { data: depData } = await supabase
        .from('daily_deposit_settings')
        .select('rickshaw_id, daily_joma_amount')
        .eq('status', 'active');
      setDepositRates(depData || []);

    } catch (error) {
      alert('Error fetching finance data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function addIncome(e) {
    e.preventDefault();
    if (!incomeAmount) return;

    try {
      const { data, error } = await supabase
        .from('daily_incomes')
        .insert([{ rickshaw_id: incomeRickshawId || null, amount: parseFloat(incomeAmount), date: incomeDate, income_particulars: incomeParticulars }])
        .select(`*, rickshaws(registration_number, identity_no)`);

      if (error) throw error;
      setIncomes([data[0], ...incomes]);
      setIncomeAmount('');
    } catch (error) {
      alert('Error adding income: ' + error.message);
    }
  }

  async function addExpense(e) {
    e.preventDefault();
    if (!expenseAmount) return;

    try {
      const { data, error } = await supabase
        .from('daily_expenses')
        .insert([{ rickshaw_id: expenseRickshawId || null, amount: parseFloat(expenseAmount), date: expenseDate, expense_particulars: expenseParticulars }])
        .select(`*, rickshaws(registration_number, identity_no)`);

      if (error) throw error;
      setExpenses([data[0], ...expenses]);
      setExpenseAmount('');
      setExpenseParticulars('');
    } catch (error) {
      alert('Error adding expense: ' + error.message);
    }
  }

  async function deleteRecord(table, id) {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      
      if (table === 'daily_incomes') {
        setIncomes(incomes.filter(i => i.id !== id));
      } else {
        setExpenses(expenses.filter(e => e.id !== id));
      }
    } catch (error) {
      alert('Error deleting record: ' + error.message);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      
      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 pb-4">
        <button 
          onClick={() => setActiveTab('deposit')}
          className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 ${activeTab === 'deposit' ? 'bg-[#10B981] text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
        >
          <ArrowUpCircle size={20} /> জমা এন্ট্রি (Deposit)
        </button>
        <button 
          onClick={() => setActiveTab('expense')}
          className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 ${activeTab === 'expense' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
        >
          <ArrowDownCircle size={20} /> খরচ এন্ট্রি (Expense)
        </button>
      </div>

      {/* DEPOSIT SECTION */}
      {activeTab === 'deposit' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Income Form */}
          <div className="glass-panel p-8 border-t-4 border-t-[#10B981] lg:col-span-1 self-start">
            <h3 className="flex items-center gap-2 mb-6 text-[#10B981] text-xl font-bold">
              <ArrowUpCircle size={24} /> নতুন জমা যুক্ত করুন
            </h3>
            <form onSubmit={addIncome} className="flex flex-col gap-4">
              <div>
                <label className="form-label">রিক্সা/অটো নির্বাচন করুন</label>
                <select 
                  className="form-input" 
                  value={incomeRickshawId} 
                  onChange={(e) => {
                    const rId = e.target.value;
                    setIncomeRickshawId(rId);
                    const rate = depositRates.find(d => d.rickshaw_id === rId);
                    if (rate?.daily_joma_amount) {
                      setIncomeAmount(String(rate.daily_joma_amount));
                    }
                  }}
                >
                  <option value="">-- রিক্সা/অটো সিলেক্ট করুন --</option>
                  {rickshaws.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.identity_no ? `[ID: ${r.identity_no}] ` : ''}{r.registration_number}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">জমার ধরণ (Particulars)</label>
                <select className="form-input" value={incomeParticulars} onChange={(e) => setIncomeParticulars(e.target.value)} required>
                  <option value="দৈনিক ভাড়ার জমা">দৈনিক ভাড়ার জমা</option>
                  <option value="বাকী আদায়">বাকী আদায়</option>
                  <option value="পুরাতন পার্টস বিক্রির অর্থ জমা">পুরাতন পার্টস বিক্রির অর্থ জমা</option>
                  <option value="বিবিধ">বিবিধ</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">টাকার পরিমাণ</label>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" className="form-input" value={incomeAmount} onChange={(e) => setIncomeAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" required />
                </div>
                <div>
                  <label className="form-label">তারিখ</label>
                  <input type="date" className="form-input" value={incomeDate} onChange={(e) => setIncomeDate(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="btn bg-[#10B981] hover:bg-[#059669] text-white shadow-[#10B981]/30 w-full mt-2">সংরক্ষণ করুন</button>
            </form>
          </div>

          {/* Income List */}
          <div className="glass-panel p-8 lg:col-span-2">
            <h4 className="flex items-center gap-2 text-xl font-bold text-[#10B981] mb-6">সাম্প্রতিক জমা সমূহ</h4>
            {loading ? (
              <p className="text-white/60 animate-pulse text-center py-8">লোড হচ্ছে...</p>
            ) : incomes.length === 0 ? (
              <p className="text-white/60 text-center py-8">কোনো জমা নেই।</p>
            ) : (
              <div className="flex flex-col gap-4">
                {incomes.map(income => (
                  <div key={income.id} className="flex justify-between items-start p-5 bg-white/5 hover:bg-white/10 transition-colors border border-white/10 border-l-4 border-l-[#10B981] rounded-xl">
                    <div>
                      <div className="font-bold text-[#10B981] text-lg">৳ {income.amount}</div>
                      <div className="text-sm text-white/80 mt-1 font-medium">{income.income_particulars}</div>
                      <div className="text-sm text-white/60 flex items-center gap-2 mt-2">
                        {income.rickshaws?.registration_number && <><CarFront size={14} className="text-[#00f2fe]" /> {income.rickshaws.identity_no ? `[ID: ${income.rickshaws.identity_no}] ` : ''}{income.rickshaws.registration_number} <span className="opacity-50">|</span></>} 
                        {income.date}
                      </div>
                    </div>
                    <button onClick={() => deleteRecord('daily_incomes', income.id)} className="bg-transparent border-none text-red-400 hover:text-red-300 p-2 cursor-pointer transition-colors"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXPENSE SECTION */}
      {activeTab === 'expense' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Expense Form */}
          <div className="glass-panel p-8 border-t-4 border-t-red-500 lg:col-span-1 self-start">
            <h3 className="flex items-center gap-2 mb-6 text-red-400 text-xl font-bold">
              <ArrowDownCircle size={24} /> নতুন খরচ যুক্ত করুন
            </h3>
            <form onSubmit={addExpense} className="flex flex-col gap-4">
              <div>
                <label className="form-label">রিক্সা/অটো নির্বাচন করুন</label>
                <select className="form-input" value={expenseRickshawId} onChange={(e) => setExpenseRickshawId(e.target.value)}>
                  <option value="">-- রিক্সা/অটো সিলেক্ট করুন --</option>
                  {rickshaws.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.identity_no ? `[ID: ${r.identity_no}] ` : ''}{r.registration_number}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">টাকার পরিমাণ</label>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" className="form-input" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" required />
                </div>
                <div>
                  <label className="form-label">তারিখ</label>
                  <input type="date" className="form-input" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="form-label">খরচের বিবরণ (Particulars)</label>
                <input type="text" className="form-input" value={expenseParticulars} onChange={(e) => setExpenseParticulars(e.target.value)} placeholder="e.g. টায়ার বদলানো" required />
              </div>
              <button type="submit" className="btn bg-red-500 hover:bg-red-600 text-white shadow-red-500/30 w-full mt-2">সংরক্ষণ করুন</button>
            </form>
          </div>

          {/* Expense List */}
          <div className="glass-panel p-8 lg:col-span-2">
            <h4 className="flex items-center gap-2 text-xl font-bold text-red-400 mb-6">সাম্প্রতিক খরচ সমূহ</h4>
            {loading ? (
              <p className="text-white/60 animate-pulse text-center py-8">লোড হচ্ছে...</p>
            ) : expenses.length === 0 ? (
              <p className="text-white/60 text-center py-8">কোনো খরচ নেই।</p>
            ) : (
              <div className="flex flex-col gap-4">
                {expenses.map(expense => (
                  <div key={expense.id} className="flex justify-between items-start p-5 bg-white/5 hover:bg-white/10 transition-colors border border-white/10 border-l-4 border-l-red-500 rounded-xl">
                    <div>
                      <div className="font-bold text-red-400 text-lg">৳ {expense.amount}</div>
                      <div className="text-sm text-white/80 mt-1 font-medium">{expense.expense_particulars}</div>
                      <div className="text-sm text-white/50 flex items-center gap-2 mt-2">
                        {expense.rickshaws?.registration_number && <><CarFront size={14} className="text-[#00f2fe]" /> {expense.rickshaws.identity_no ? `[ID: ${expense.rickshaws.identity_no}] ` : ''}{expense.rickshaws.registration_number} <span className="opacity-50">|</span></>} 
                        {expense.date}
                      </div>
                    </div>
                    <button onClick={() => deleteRecord('daily_expenses', expense.id)} className="bg-transparent border-none text-red-400 hover:text-red-300 p-2 cursor-pointer transition-colors"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
