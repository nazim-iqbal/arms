import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CarFront, Lock, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Login failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090e] p-4 relative overflow-hidden">
      
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#00f2fe]/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#4facfe]/20 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />
      
      <div className="glass-panel w-full max-w-md p-10 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="text-6xl mb-4 drop-shadow-[0_0_15px_rgba(0,242,254,0.5)]">
            🛺
          </div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00f2fe] to-[#4facfe] mb-1 tracking-wider">ARMS</h1>
          <h2 className="text-sm font-semibold text-white/80 uppercase tracking-widest mb-3">Auto Rickshaw Management System</h2>
          <p className="text-[#10B981] font-bold text-lg italic mb-6">"হিসাব এখন হাতের মুঠোয়"</p>
          
          <h3 className="text-2xl font-bold text-white mb-2">Login</h3>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
              <input 
                type="email" 
                className="form-input pl-12 bg-black/20" 
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
              <input 
                type="password" 
                className="form-input pl-12 bg-black/20" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary w-full py-4 text-lg mt-2 relative overflow-hidden group"
          >
            {loading ? (
              <span className="animate-pulse">Authenticating...</span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 w-full text-center z-10">
        <p className="text-white/40 text-sm font-mono tracking-widest">
          &lt;/&gt; Developed By :: Nazim Iqbal ::
        </p>
      </div>
    </div>
  );
}
