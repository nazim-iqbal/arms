import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, CarFront, DollarSign, Wrench, Menu, X, LogOut, Shield, PiggyBank, UserCheck } from 'lucide-react';
import './index.css';

import Rickshaws from './pages/Rickshaws';
import Drivers from './pages/Drivers';
import Finances from './pages/Finances';
import Dashboard from './pages/Dashboard';
import Parts from './pages/Parts';
import Login from './pages/Login';
import UsersPage from './pages/Users';
import SetDailyDeposit from './pages/SetDailyDeposit';
import AssignDriverVehicle from './pages/AssignDriverVehicle';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { userRole, logout } = useAuth();
  
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <aside className={`fixed lg:sticky flex flex-col top-0 left-0 h-screen w-[280px] bg-bg-dark border-r border-white/10 p-8 z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex justify-between items-center mb-12">
          <h2 className="flex items-center gap-3 text-white text-2xl font-bold">
            <CarFront size={32} className="text-[#00f2fe]" /> ARMS
          </h2>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-white/70 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex flex-col gap-2 flex-1">
          <Link onClick={() => setIsOpen(false)} to="/" className="btn btn-secondary !justify-start !border-none !bg-transparent opacity-70 hover:opacity-100 hover:!bg-gradient-to-r hover:from-white/10 hover:to-transparent hover:border-l-4 hover:border-l-[#00f2fe]"><LayoutDashboard size={18}/> Dashboard</Link>
          <Link onClick={() => setIsOpen(false)} to="/rickshaws" className="btn btn-secondary !justify-start !border-none !bg-transparent opacity-70 hover:opacity-100 hover:!bg-gradient-to-r hover:from-white/10 hover:to-transparent hover:border-l-4 hover:border-l-[#00f2fe]"><CarFront size={18}/> New Vehicle Entry</Link>
          <Link onClick={() => setIsOpen(false)} to="/daily-deposits" className="btn btn-secondary !justify-start !border-none !bg-transparent opacity-70 hover:opacity-100 hover:!bg-gradient-to-r hover:from-white/10 hover:to-transparent hover:border-l-4 hover:border-l-[#00f2fe]"><PiggyBank size={18}/> Set Daily Deposit</Link>
          <Link onClick={() => setIsOpen(false)} to="/drivers" className="btn btn-secondary !justify-start !border-none !bg-transparent opacity-70 hover:opacity-100 hover:!bg-gradient-to-r hover:from-white/10 hover:to-transparent hover:border-l-4 hover:border-l-[#00f2fe]"><Users size={18}/> Drivers</Link>
          <Link onClick={() => setIsOpen(false)} to="/assign-driver-vehicle" className="btn btn-secondary !justify-start !border-none !bg-transparent opacity-70 hover:opacity-100 hover:!bg-gradient-to-r hover:from-white/10 hover:to-transparent hover:border-l-4 hover:border-l-[#00f2fe]"><UserCheck size={18}/> Assign Driver with Vehicle</Link>
          <Link onClick={() => setIsOpen(false)} to="/finances" className="btn btn-secondary !justify-start !border-none !bg-transparent opacity-70 hover:opacity-100 hover:!bg-gradient-to-r hover:from-white/10 hover:to-transparent hover:border-l-4 hover:border-l-[#00f2fe]"><DollarSign size={18}/> Finances</Link>
          <Link onClick={() => setIsOpen(false)} to="/parts" className="btn btn-secondary !justify-start !border-none !bg-transparent opacity-70 hover:opacity-100 hover:!bg-gradient-to-r hover:from-white/10 hover:to-transparent hover:border-l-4 hover:border-l-[#00f2fe]"><Wrench size={18}/> Parts</Link>
          
          {userRole === 'admin' && (
            <Link onClick={() => setIsOpen(false)} to="/users" className="btn btn-secondary !justify-start !border-none !bg-transparent opacity-70 hover:opacity-100 hover:!bg-gradient-to-r hover:from-white/10 hover:to-transparent hover:border-l-4 hover:border-l-[#00f2fe] mt-4 border-t border-white/10 pt-4"><Shield size={18}/> User Management</Link>
          )}
        </nav>

        <button 
          onClick={() => logout()} 
          className="btn btn-secondary !justify-start !border-none !bg-red-500/10 !text-red-400 hover:!bg-red-500 hover:!text-white mt-auto"
        >
          <LogOut size={18} /> Logout
        </button>
      </aside>
    </>
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
      <main className="flex-1 w-full flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/10 bg-bg-dark sticky top-0 z-30 shadow-md">
          <h2 className="flex items-center gap-2 text-white text-xl font-bold">
            <CarFront size={24} className="text-[#00f2fe]" /> ARMS
          </h2>
          <button onClick={() => setIsSidebarOpen(true)} className="text-white/70 hover:text-white p-2">
            <Menu size={24} />
          </button>
        </div>
        
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
            <Route path="/finances" element={<Finances />} />
            <Route path="/parts" element={<Parts />} />
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
