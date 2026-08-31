import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Wrench, Menu, X, LogOut, Shield, PiggyBank, UserCheck, ArrowUpCircle, ArrowDownCircle, HandCoins, KeyRound, Building2 } from 'lucide-react';
import './index.css';

import Rickshaws from './pages/Rickshaws';
import Drivers from './pages/Drivers';
import DepositEntry from './pages/DepositEntry';
import DueRecovery from './pages/DueRecovery';
import ExpenseEntry from './pages/ExpenseEntry';
import Dashboard from './pages/Dashboard';
import Parts from './pages/Parts';
import Login from './pages/Login';
import UsersPage from './pages/Users';
import ChangePassword from './pages/ChangePassword';
import SetDailyDeposit from './pages/SetDailyDeposit';
import AssignDriverVehicle from './pages/AssignDriverVehicle';
import Branches from './pages/Branches';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BranchProvider, useBranch, ALL_BRANCHES } from './contexts/BranchContext';

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
      `group relative flex items-center gap-3 ml-2 pl-4 pr-3 py-2.5 rounded-xl text-[15px] font-medium overflow-hidden
       border border-transparent transition-all duration-300 ease-out
       hover:border-[#00f2fe]/30 hover:text-white
       hover:bg-gradient-to-r hover:from-[#00f2fe]/25 hover:via-[#4facfe]/10 hover:to-transparent ${
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
            shadow-[0_0_10px_rgba(0,242,254,0.8)] transition-all duration-300 ${isActive ? 'h-6' : 'h-0 group-hover:h-6'}`}
        />
        <Icon
          size={18}
          className={`shrink-0 transition-colors duration-300 group-hover:text-[#00f2fe] ${isActive ? 'text-[#00f2fe]' : ''}`}
        />
        <span>{label}</span>
      </>
    )}
  </NavLink>
);

const Sidebar = ({ isOpen, setIsOpen }) => {
  // A plain 'user' sees the dashboard and the four entry screens; the
  // setup screens stay hidden. RequireRole blocks those routes as well,
  // so typing the URL by hand does not get around this.
  const { userRole, isAdmin, isSuperAdmin } = useAuth();
  const isEntryOnly = userRole === 'user';
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

      <aside className={`fixed lg:sticky flex flex-col top-0 left-0 h-screen w-[264px] px-3 py-5 lg:py-7 z-50 transition-transform duration-300
        overflow-y-auto overscroll-contain
        bg-gradient-to-b from-[#0b1e4b] via-[#0a1738] to-[#071026] border-r border-[#1e3a8a]/50 shadow-[4px_0_24px_-8px_rgba(0,0,0,0.7)]
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex justify-between items-center mb-6 pl-3">
          <h2 className="flex items-center gap-2.5 text-white text-xl font-bold">
            <AutoRickshawIcon size={28} className="text-[#00f2fe]" /> ARMS
          </h2>
          <button onClick={closeSidebar} className="lg:hidden text-white/70 hover:text-white p-1" aria-label="মেনু বন্ধ করুন">
            <X size={22} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {/* Dashboard — every role sees it */}
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" onNavigate={closeSidebar} />

          {!isEntryOnly && (
            <>
              <NavItem to="/rickshaws" icon={AutoRickshawIcon} label="New Vehicle Entry" onNavigate={closeSidebar} />
              <NavItem to="/daily-deposits" icon={PiggyBank} label="Set Daily Deposit" onNavigate={closeSidebar} />
              <NavItem to="/drivers" icon={Users} label="Drivers" onNavigate={closeSidebar} />
              <NavItem to="/assign-driver-vehicle" icon={UserCheck} label="Assign Driver" onNavigate={closeSidebar} />
            </>
          )}

          <NavItem to="/deposits" icon={ArrowUpCircle} label="Deposit Entry" onNavigate={closeSidebar} />
          <NavItem to="/due-recovery" icon={HandCoins} label="Due Recovery" onNavigate={closeSidebar} />
          <NavItem to="/expenses" icon={ArrowDownCircle} label="Expense Entry" onNavigate={closeSidebar} />
          <NavItem to="/parts" icon={Wrench} label="Parts" onNavigate={closeSidebar} />

          {isAdmin && (
            <div className="mt-3 pt-3 border-t border-white/10">
              {isSuperAdmin && (
                <NavItem to="/branches" icon={Building2} label="Branch Management" onNavigate={closeSidebar} />
              )}
              <NavItem to="/users" icon={Shield} label="User Management" onNavigate={closeSidebar} />
            </div>
          )}
        </nav>
      </aside>
    </>
  );
};

/**
 * Phone-only bottom bar. The dashboard plus the three money screens stay
 * within thumb reach, so an entry user never has to open the sidebar.
 * Hidden from lg upwards, where the sidebar is always on screen anyway.
 */
const BOTTOM_NAV = [
  { to: '/',             icon: LayoutDashboard,  label: 'ড্যাশবোর্ড' },
  { to: '/deposits',     icon: ArrowUpCircle,    label: 'জমা' },
  { to: '/expenses',     icon: ArrowDownCircle,  label: 'খরচ' },
  { to: '/due-recovery', icon: HandCoins,        label: 'বকেয়া' },
];

const BottomNav = () => (
  <nav
    className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex
               bg-[#0a1738]/95 backdrop-blur-md border-t border-[#1e3a8a]/60
               shadow-[0_-4px_20px_-6px_rgba(0,0,0,0.8)] pb-[env(safe-area-inset-bottom)]"
  >
    {BOTTOM_NAV.map(({ to, icon: Icon, label }) => (
      <NavLink
        key={to}
        to={to}
        end={to === '/'}
        className={({ isActive }) =>
          `flex-1 flex flex-col items-center gap-0.5 pt-1 pb-1.5 text-[11px] font-semibold
           transition-colors active:bg-white/5 ${isActive ? 'text-[#00f2fe]' : 'text-slate-400'}`
        }
      >
        {({ isActive }) => (
          <>
            {/* Thin cap that lights up on the screen you are standing on */}
            <span
              className={`h-[3px] w-8 rounded-full transition-all duration-300 ${
                isActive ? 'bg-[#00f2fe] shadow-[0_0_8px_rgba(0,242,254,0.8)]' : 'bg-transparent'
              }`}
            />
            <Icon size={21} className="shrink-0" />
            <span>{label}</span>
          </>
        )}
      </NavLink>
    ))}
  </nav>
);

/**
 * Which শাখা the whole app is looking at.
 * The super admin picks; everyone else just sees their own branch's name,
 * because that is the only branch RLS will hand them rows from.
 */
const BranchSwitcher = () => {
  const { activeBranches, activeBranchId, setActiveBranchId, canSwitchBranch, activeBranch } = useBranch();

  if (!canSwitchBranch) {
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs md:text-sm font-semibold text-white/80 max-w-[45vw] md:max-w-none">
        <Building2 size={15} className="text-violet-400 shrink-0" />
        <span className="truncate">{activeBranch ? activeBranch.name : 'শাখা নির্ধারিত নয়'}</span>
      </span>
    );
  }

  return (
    <div className="relative">
      <select
        value={activeBranchId}
        onChange={(e) => setActiveBranchId(e.target.value)}
        title="শাখা নির্বাচন"
        className="appearance-none cursor-pointer pl-8 pr-7 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30
                   text-xs md:text-sm font-semibold text-violet-200 max-w-[45vw] md:max-w-none
                   focus:outline-none focus:border-violet-400"
      >
        <option value={ALL_BRANCHES} className="bg-[#1a1a24] text-white">সকল শাখা</option>
        {activeBranches.map((b) => (
          <option key={b.id} value={b.id} className="bg-[#1a1a24] text-white">
            {b.name} ({b.code})
          </option>
        ))}
      </select>
      <Building2 size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none" />
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-violet-300/60 text-[10px] pointer-events-none">▼</span>
    </div>
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
    <div className="bg-[#141419]/85 backdrop-blur-md border-b border-white/10 text-white flex items-center justify-between gap-2 px-3 py-2.5 md:px-6 md:py-3 shadow-md sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-1 lg:hidden min-w-0">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="text-white/80 hover:text-white p-2 -ml-1 shrink-0"
          aria-label="মেনু খুলুন"
        >
          <Menu size={22} />
        </button>
        <h2 className="flex items-center gap-1.5 text-white text-base font-bold truncate">
          <AutoRickshawIcon size={20} className="text-[#00f2fe] shrink-0" /> ARMS
        </h2>
      </div>

      <div className="hidden lg:flex flex-1 items-center">
        <BranchSwitcher />
      </div>

      <div className="flex items-center justify-end gap-2.5 md:gap-5 shrink-0">
        <div className="lg:hidden">
          <BranchSwitcher />
        </div>
        <div className="hidden sm:block font-bold text-xs md:text-lg text-[#00f2fe] tabular-nums">
          {time.toLocaleTimeString()}
        </div>
        <Link
          to="/change-password"
          className="flex items-center gap-2 font-medium text-gray-300 px-2 py-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors"
          title="পাসওয়ার্ড পরিবর্তন"
        >
          <UserCheck size={20} className="text-[#00f2fe]" />
          <span className="hidden md:inline">{user?.email?.split('@')[0] || 'User'}</span>
          <KeyRound size={14} className="text-white/40" />
        </Link>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 px-2.5 py-1.5 md:px-4 md:py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all duration-300 text-sm font-semibold shrink-0"
          aria-label="লগআউট"
        >
          <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </div>
  );
};

/**
 * A route only some roles may open. Typing the URL by hand lands on the
 * first screen the account is actually allowed to see.
 */
const RequireRole = ({ allow, children }) => {
  const { userRole } = useAuth();
  if (!allow(userRole)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const notEntryOnly = (role) => role !== 'user';
const superAdminOnly = (role) => role === 'super_admin';
const adminOnly = (role) => role === 'admin' || role === 'super_admin';

const ProtectedLayout = () => {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="flex-1 min-w-0 flex flex-col relative">
        <Header setIsSidebarOpen={setIsSidebarOpen} />

        <div className="flex-1 min-w-0 p-3 pb-24 sm:p-4 sm:pb-24 md:p-6 md:pb-24 lg:p-8">
          <Outlet />
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BranchProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/rickshaws" element={<RequireRole allow={notEntryOnly}><Rickshaws /></RequireRole>} />
            <Route path="/daily-deposits" element={<RequireRole allow={notEntryOnly}><SetDailyDeposit /></RequireRole>} />
            <Route path="/drivers" element={<RequireRole allow={notEntryOnly}><Drivers /></RequireRole>} />
            <Route path="/assign-driver-vehicle" element={<RequireRole allow={notEntryOnly}><AssignDriverVehicle /></RequireRole>} />

            {/* The four entry screens — every role reaches these */}
            <Route path="/deposits" element={<DepositEntry />} />
            <Route path="/due-recovery" element={<DueRecovery />} />
            <Route path="/expenses" element={<ExpenseEntry />} />
            <Route path="/parts" element={<Parts />} />

            {/* Old Finances page has been split into the two entry screens above */}
            <Route path="/finances" element={<Navigate to="/deposits" replace />} />

            <Route path="/branches" element={<RequireRole allow={superAdminOnly}><Branches /></RequireRole>} />
            <Route path="/users" element={<RequireRole allow={adminOnly}><UsersPage /></RequireRole>} />
            <Route path="/change-password" element={<ChangePassword />} />
          </Route>
        </Routes>
      </Router>
      </BranchProvider>
    </AuthProvider>
  );
}

export default App;
