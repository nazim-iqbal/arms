import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      
      <div className="glass-panel w-full max-w-4xl p-0 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col md:flex-row overflow-hidden">
        
        {/* LEFT COLUMN: Logo & Info */}
        <div className="w-full md:w-3/5 p-10 lg:p-12 bg-white/5 border-b md:border-b-0 md:border-r border-white/10 flex flex-col items-center justify-center text-center relative">
          {/* Subtle background glow inside left column */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#00f2fe]/10 rounded-full blur-[80px]" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="text-8xl md:text-9xl mb-6 drop-shadow-[0_0_20px_rgba(0,242,254,0.6)] hover:scale-110 transition-transform duration-500 cursor-default">
              🛺
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-tight mb-2 font-['Oswald'] leading-tight">
              Auto Rickshaw<br/>Management System
            </h2>
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00f2fe] to-[#4facfe] mb-6 tracking-wider">
              ARMS
            </h1>
            <div className="w-16 h-1 bg-gradient-to-r from-[#00f2fe] to-transparent mb-6 rounded-full" />
            <p className="text-[#10B981] font-bold text-xl md:text-2xl italic tracking-wide font-['Noto_Sans_Bengali']">
              "হিসাব এখন হাতের মুঠোয়"
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Login Form */}
        <div className="w-full md:w-2/5 p-10 lg:p-12 flex flex-col justify-center">
          <h3 className="text-3xl font-bold text-white mb-2">Welcome to ARMS</h3>
          <p className="text-white/60 mb-8">Please enter your details to sign in.</p>

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
                  type={showPassword ? "text" : "password"} 
                  className="form-input pl-12 pr-12 bg-black/20" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary w-full py-4 text-lg mt-4 relative overflow-hidden group"
            >
              {loading ? (
                <span className="animate-pulse">Authenticating...</span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

      </div>

      {/* Footer */}
      <div className="absolute bottom-6 w-full text-center z-10">
        <p className="text-white/70 text-lg md:text-xl font-bold font-mono tracking-widest drop-shadow-[0_0_10px_rgba(0,242,254,0.3)]">
          &lt;/&gt; Developed By :: Nazim Iqbal ::
        </p>
      </div>
    </div>
  );
}
