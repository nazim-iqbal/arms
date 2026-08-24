import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Wrench, Menu, X, LogOut, Shield, PiggyBank, UserCheck, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import './index.css';

import Rickshaws from './pages/Rickshaws';
import Drivers from './pages/Drivers';
import DepositEntry from './pages/DepositEntry';
import ExpenseEntry from './pages/ExpenseEntry';
import Dashboard from './pages/Dashboard';
import Parts from './pages/Parts';
import Login from './pages/Login';
import UsersPage from './pages/Users';
import SetDailyDeposit from './pages/SetDailyDeposit';
import AssignDriverVehicle from './pages/AssignDriverVehicle';
import { AuthProvider, useAuth } from './contexts/AuthContext';

/* Side view of a three-wheeler auto rickshaw (CNG / tuk-tuk) */
const AutoRickshawIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Canopy roof + body silhouette */}
    <path d="M3.5 15.5V11c0-4 2.6-7 6.5-7h8.5A1.5 1.5 0 0 1 20 5.5v10Z" />
    {/* Window sill line */}
    <path d="M3.7 10.8H20" />
    {/* Windshield pillar between driver and passenger cabin */}
    <path d="M9.6 4.2v6.6" />
    {/* Headlight */}
    <circle cx="5.6" cy="13.1" r="1" />
    {/* Front wheel (single) and rear wheel */}
    <circle cx="6" cy="17.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
);

const NavItem = ({ to, icon: Icon, label, onNavigate }) => (
  <NavLink
    to={to}
    end={to === '/'}
    onClick={onNavigate}
    className={({ isActive }) =>
      `group relative flex items-center gap-3 ml-6 pl-5 pr-3 py-3 rounded-xl text-[15px] font-medium overflow-hidden
       border border-transparent transition-all duration-300 ease-out
       hover:translate-x-1.5 hover:border-[#00f2fe]/30 hover:text-white
       hover:bg-gradient-to-r hover:from-[#00f2fe]/25 hover:via-[#4facfe]/10 hover:to-transparent
       hover:shadow-[0_6px_20px_-6px_rgba(0,242,254,0.45)] ${
        isActive
          ? 'text-white border-[#00f2fe]/40 bg-gradient-to-r from-[#00f2fe]/20 to-transparent'
          : 'text-slate-300/75'
      }`
    }
  >
    {({ isActive }) => (
      <>
        {/* Left accent indicator */}
        <span
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full bg-gradient-to-b from-[#4facfe] to-[#00f2fe]
            shadow-[0_0_10px_rgba(0,242,254,0.8)] transition-all duration-300 ${isActive ? 'h-7' : 'h-0 group-hover:h-7'}`}
        />
        <Icon
          size={18}
          className={`shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:text-[#00f2fe]
            group-hover:drop-shadow-[0_0_6px_rgba(0,242,254,0.7)] ${isActive ? 'text-[#00f2fe]' : ''}`}
        />
        <span className="transition-transform duration-300 group-hover:translate-x-0.5">{label}</span>
      </>
    )}
  </NavLink>
);

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { userRole } = useAuth();
  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`fixed lg:sticky flex flex-col top-0 left-0 h-screen w-[280px] px-5 py-8 z-50 transition-transform duration-300
        bg-gradient-to-b from-[#0b1e4b] via-[#0a1738] to-[#071026] border-r border-[#1e3a8a]/50 shadow-[4px_0_24px_-8px_rgba(0,0,0,0.7)]
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex justify-between items-center mb-12 pl-3">
          <h2 className="flex items-center gap-3 text-white text-2xl font-bold">
            <AutoRickshawIcon size={32} className="text-[#00f2fe]" /> ARMS
          </h2>
          <button onClick={closeSidebar} className="lg:hidden text-white/70 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex flex-col gap-1.5 flex-1">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" onNavigate={closeSidebar} />
          <NavItem to="/rickshaws" icon={AutoRickshawIcon} label="New Vehicle Entry" onNavigate={closeSidebar} />
          <NavItem to="/daily-deposits" icon={PiggyBank} label="Set Daily Deposit" onNavigate={closeSidebar} />
          <NavItem to="/drivers" icon={Users} label="Drivers" onNavigate={closeSidebar} />
          <NavItem to="/assign-driver-vehicle" icon={UserCheck} label="Assign Driver" onNavigate={closeSidebar} />
          <NavItem to="/deposits" icon={ArrowUpCircle} label="Deposit Entry" onNavigate={closeSidebar} />
          <NavItem to="/expenses" icon={ArrowDownCircle} label="Expense Entry" onNavigate={closeSidebar} />
          <NavItem to="/parts" icon={Wrench} label="Parts" onNavigate={closeSidebar} />

          {userRole === 'admin' && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <NavItem to="/users" icon={Shield} label="User Management" onNavigate={closeSidebar} />
            </div>
          )}
        </nav>
      </aside>
    </>
  );
};

const Header = ({ setIsSidebarOpen }) => {
  const { user, logout } = useAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-[#141419]/80 backdrop-blur-md border-b border-white/10 text-white flex items-center justify-between p-4 md:px-8 shadow-md sticky top-0 z-30 shrink-0">
      <div className="flex items-center lg:hidden">
        <h2 className="flex items-center gap-2 text-white text-xl font-bold mr-4">
          <AutoRickshawIcon size={24} className="text-[#00f2fe]" /> ARMS
        </h2>
        <button onClick={() => setIsSidebarOpen(true)} className="text-white/70 hover:text-white p-2">
          <Menu size={24} />
        </button>
      </div>

      <div className="hidden lg:block flex-1"></div>

      <div className="flex items-center justify-end gap-4 md:gap-6 w-full lg:w-auto">
        <div className="font-bold text-sm md:text-lg text-[#00f2fe]">
          {time.toLocaleTimeString()}
        </div>
        <div className="hidden sm:flex items-center gap-2 font-medium text-gray-300">
          <UserCheck size={20} className="text-[#00f2fe]" />
          <span>{user?.email?.split('@')[0] || 'User'}</span>
        </div>
        <button 
          onClick={() => logout()} 
          className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all duration-300 text-sm font-semibold"
        >
          <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </div>
  );
};

const ProtectedLayout = () => {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="flex-1 w-full flex flex-col relative">
        <Header setIsSidebarOpen={setIsSidebarOpen} />

        <div className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/rickshaws" element={<Rickshaws />} />
            <Route path="/daily-deposits" element={<SetDailyDeposit />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/assign-driver-vehicle" element={<AssignDriverVehicle />} />
            <Route path="/deposits" element={<DepositEntry />} />
            <Route path="/expenses" element={<ExpenseEntry />} />
            {/* Old Finances page has been split into the two entry screens above */}
            <Route path="/finances" element={<Navigate to="/deposits" replace />} />
            <Route path="/parts" element={<Parts />} />
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
