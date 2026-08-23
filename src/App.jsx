import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { LayoutDashboard, Users, CarFront, DollarSign, Wrench } from 'lucide-react';
import './index.css';

import Rickshaws from './pages/Rickshaws';
import Drivers from './pages/Drivers';
import Finances from './pages/Finances';
import Dashboard from './pages/Dashboard';
import Parts from './pages/Parts';

const Sidebar = () => (
  <aside className="w-[280px] border-r border-white/10 p-8 h-screen sticky top-0">
    <h2 className="flex items-center gap-3 mb-12 text-white text-2xl font-bold">
      <CarFront size={32} className="text-[#00f2fe]" /> ARMS
    </h2>
    <nav className="flex flex-col gap-2">
      <Link to="/" className="btn btn-secondary !justify-start !border-none !bg-transparent opacity-70 hover:opacity-100 hover:!bg-gradient-to-r hover:from-white/10 hover:to-transparent hover:border-l-4 hover:border-l-[#00f2fe]"><LayoutDashboard size={18}/> Dashboard</Link>
      <Link to="/rickshaws" className="btn btn-secondary !justify-start !border-none !bg-transparent opacity-70 hover:opacity-100 hover:!bg-gradient-to-r hover:from-white/10 hover:to-transparent hover:border-l-4 hover:border-l-[#00f2fe]"><CarFront size={18}/> Rickshaws/Autos</Link>
      <Link to="/drivers" className="btn btn-secondary !justify-start !border-none !bg-transparent opacity-70 hover:opacity-100 hover:!bg-gradient-to-r hover:from-white/10 hover:to-transparent hover:border-l-4 hover:border-l-[#00f2fe]"><Users size={18}/> Drivers</Link>
      <Link to="/finances" className="btn btn-secondary !justify-start !border-none !bg-transparent opacity-70 hover:opacity-100 hover:!bg-gradient-to-r hover:from-white/10 hover:to-transparent hover:border-l-4 hover:border-l-[#00f2fe]"><DollarSign size={18}/> Finances</Link>
      <Link to="/parts" className="btn btn-secondary !justify-start !border-none !bg-transparent opacity-70 hover:opacity-100 hover:!bg-gradient-to-r hover:from-white/10 hover:to-transparent hover:border-l-4 hover:border-l-[#00f2fe]"><Wrench size={18}/> Parts</Link>
    </nav>
  </aside>
);

function App() {
  return (
    <Router>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-12 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/rickshaws" element={<Rickshaws />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/finances" element={<Finances />} />
            <Route path="/parts" element={<Parts />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
