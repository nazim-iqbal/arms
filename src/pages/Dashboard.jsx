import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CarFront, Users, DollarSign, TrendingUp, TrendingDown, Activity } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRickshaws: 0,
    activeRickshaws: 0,
    totalDrivers: 0,
    todayIncome: 0,
    todayExpense: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // 1. Rickshaws Count
      const { data: rickshaws, error: rError } = await supabase.from('rickshaws').select('status');
      if (rError) throw rError;
      const totalRickshaws = rickshaws.length;
      const activeRickshaws = rickshaws.filter(r => r.status === 'active').length;

      // 2. Drivers Count
      const { count: totalDrivers, error: dError } = await supabase.from('drivers').select('*', { count: 'exact', head: true });
      if (dError) throw dError;

      // 3. Today's Income
      const { data: incomes, error: iError } = await supabase.from('daily_incomes').select('amount').eq('date', today);
      if (iError) throw iError;
      const todayIncome = incomes.reduce((sum, item) => sum + Number(item.amount), 0);

      // 4. Today's Expense
      const { data: expenses, error: eError } = await supabase.from('daily_expenses').select('amount').eq('date', today);
      if (eError) throw eError;
      const todayExpense = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

      setStats({
        totalRickshaws,
        activeRickshaws,
        totalDrivers: totalDrivers || 0,
        todayIncome,
        todayExpense
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error.message);
    } finally {
      setLoading(false);
    }
  }

  const StatCard = ({ title, value, subValue, icon: Icon, colorClass, gradient }) => (
    <div 
      className="glass-panel p-6 flex items-center gap-6 text-white border-none shadow-lg transition-transform duration-300 hover:-translate-y-1" 
      style={{ background: gradient }}
    >
      <div className="p-4 bg-white/20 rounded-xl">
        <Icon size={32} />
      </div>
      <div>
        <p className="m-0 text-sm opacity-90 uppercase tracking-wider font-semibold">{title}</p>
        <h2 className="m-0 mt-1 text-3xl text-white font-bold">{value}</h2>
        {subValue && <p className="m-0 mt-1 text-sm opacity-80">{subValue}</p>}
      </div>
    </div>
  );

  if (loading) {
    return <div className="flex justify-center p-12 text-white/50 text-xl font-semibold animate-pulse">ড্যাশবোর্ড লোড হচ্ছে...</div>;
  }

  return (
    <div>
      <h2 className="flex items-center gap-3 mb-8 text-[#00f2fe] text-3xl font-bold tracking-tight">
        <Activity size={32} /> আজকের ওভারভিউ (Overview)
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
        <StatCard 
          title="মোট ইনকাম (আজ)" 
          value={`৳ ${stats.todayIncome.toLocaleString()}`} 
          icon={TrendingUp} 
          gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)" 
        />
        
        <StatCard 
          title="মোট খরচ (আজ)" 
          value={`৳ ${stats.todayExpense.toLocaleString()}`} 
          icon={TrendingDown} 
          gradient="linear-gradient(135deg, #EF4444 0%, #DC2626 100%)" 
        />
        
        <StatCard 
          title="নিট প্রফিট (আজ)" 
          value={`৳ ${(stats.todayIncome - stats.todayExpense).toLocaleString()}`} 
          icon={DollarSign} 
          gradient="linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)" 
        />

        <StatCard 
          title="মোট রিক্সা/অটো" 
          value={stats.totalRickshaws} 
          subValue={`${stats.activeRickshaws} টি বর্তমানে সচল আছে`}
          icon={CarFront} 
          gradient="linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)" 
        />
        
        <StatCard 
          title="মোট ড্রাইভার" 
          value={stats.totalDrivers} 
          icon={Users} 
          gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" 
        />
      </div>

      <div className="glass-panel mt-12 p-8 border-l-4 border-l-[#00f2fe]">
        <h3 className="mb-4 text-xl text-[#00f2fe]">দ্রুত নেভিগেশন (Quick Actions)</h3>
        <p className="text-white/60 text-lg">বামপাশের মেনু থেকে বিভিন্ন মডিউলে গিয়ে নতুন তথ্য যুক্ত করুন বা পুরাতন তথ্য দেখুন।</p>
      </div>
    </div>
  );
}
