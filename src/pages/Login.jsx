import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LOGIN_DOMAIN } from '../lib/authClient';
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

/* Side view of a three-wheeler auto rickshaw (CNG / tuk-tuk) */
const AutoRickshawIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3.5 15.5V11c0-4 2.6-7 6.5-7h8.5A1.5 1.5 0 0 1 20 5.5v10Z" />
    <path d="M3.7 10.8H20" />
    <path d="M9.6 4.2v6.6" />
    <circle cx="5.6" cy="13.1" r="1" />
    <circle cx="6" cy="17.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
);

// Users created from the User Management screen log in with just their 4-digit
// user number; Supabase Auth needs an email, so the domain is appended here.
const toAuthEmail = (value) => {
  const v = value.trim();
  return v.includes('@') ? v : `${v.toLowerCase()}@${LOGIN_DOMAIN}`;
};

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
      await login(toAuthEmail(email), password);
      navigate('/');
    } catch (err) {
      setError('Login failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 p-4 py-8 relative overflow-hidden bg-gradient-to-br from-[#0b1e4b] via-[#07112b] to-[#050a18]">

      {/* Aurora orbs */}
      <div className="absolute -top-24 -left-24 w-72 h-72 md:w-[28rem] md:h-[28rem] bg-[#00f2fe]/25 rounded-full blur-[110px] md:blur-[130px] animate-aurora" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 md:w-[28rem] md:h-[28rem] bg-[#4facfe]/25 rounded-full blur-[110px] md:blur-[130px] animate-aurora delay-300" />
      <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[22rem] h-[22rem] bg-[#10B981]/10 rounded-full blur-[140px] animate-aurora delay-500" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 72%)',
        }}
      />

      {/* Gradient border wrapper */}
      <div className="relative z-10 w-full max-w-md md:max-w-4xl rounded-[22px] md:rounded-[26px] p-[1.5px] bg-gradient-to-br from-[#00f2fe]/60 via-white/10 to-[#4facfe]/40 shadow-[0_30px_80px_-20px_rgba(0,0,0,.85)] animate-fade-up">
        <div className="rounded-[21px] md:rounded-[24px] bg-[#0a1330]/80 backdrop-blur-2xl overflow-hidden flex flex-col md:flex-row">

          {/* LEFT COLUMN: Brand */}
          <div className="w-full md:w-1/2 px-5 py-6 sm:py-8 md:p-10 lg:p-12 flex flex-col items-center justify-center text-center relative
            bg-gradient-to-b from-[#0b1e4b]/90 to-[#071026]/90 border-b md:border-b-0 md:border-r border-white/10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-72 md:h-72 bg-[#00f2fe]/15 rounded-full blur-[80px]" />

            <div className="relative z-10 flex flex-col items-center w-full">
              {/* Logo with glow ring */}
              <div className="relative mb-3 md:mb-5 animate-float">
                <div className="absolute inset-0 -m-4 rounded-full bg-[#00f2fe]/20 blur-2xl" />
                <img
                  src="/logo.png"
                  alt="Auto Rickshaw Logo"
                  className="relative w-20 sm:w-24 md:w-32 lg:w-36 h-auto drop-shadow-[0_0_25px_rgba(0,242,254,0.45)] transition-transform duration-500 md:hover:scale-110 cursor-default"
                />
              </div>

              <h2 className="text-[13px] sm:text-base md:text-xl font-bold text-white/90 uppercase tracking-[0.12em] mb-1 font-['Oswald'] leading-tight animate-fade-up delay-100">
                Auto Rickshaw<br className="hidden sm:block" /> Management System
              </h2>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text tracking-wider mb-3 md:mb-4 animate-gradient
                bg-gradient-to-r from-[#00f2fe] via-[#4facfe] to-[#10B981]">
                ARMS
              </h1>

              <div className="w-16 md:w-20 h-[3px] bg-gradient-to-r from-transparent via-[#00f2fe] to-transparent mb-3 md:mb-5 rounded-full" />

              <p className="text-[#34D399] font-bold text-base sm:text-lg md:text-xl italic tracking-wide font-['Noto_Sans_Bengali'] animate-fade-up delay-300">
                "হিসাব এখন হাতের মুঠোয়"
              </p>

              <div className="mt-4 md:mt-7 flex items-center gap-2 text-white/45 text-[10px] md:text-xs tracking-widest uppercase animate-fade-up delay-400">
                <AutoRickshawIcon size={14} className="text-[#00f2fe]" />
                <span>Fleet · Drivers · Finance</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Form */}
          <div className="w-full md:w-1/2 px-5 py-6 sm:p-8 md:p-10 lg:p-12 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 mb-3 md:mb-5 rounded-full text-[11px] font-semibold uppercase tracking-widest
              bg-[#00f2fe]/10 border border-[#00f2fe]/25 text-[#00f2fe] animate-fade-up">
              <ShieldCheck size={13} /> Secure Login
            </div>

            <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-1 animate-fade-up delay-100">Welcome back</h3>
            <p className="text-white/55 text-sm md:text-base mb-5 md:mb-7 animate-fade-up delay-100">Please enter your details to sign in.</p>

            {error && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/40 text-red-300 p-3.5 rounded-xl mb-4 text-sm animate-shake">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="group animate-fade-up delay-200">
                <label className="block text-sm font-medium text-white/70 mb-1.5 group-focus-within:text-[#00f2fe] transition-colors">
                  ইউজার নাম্বার বা ইমেইল
                </label>
                <div className="relative">
                  <Mail
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-[#10B981] transition-all duration-300
                      group-focus-within:text-[#00f2fe] group-focus-within:scale-110"
                  />
                  <input
                    type="text"
                    className="form-input pl-12 bg-black/30 hover:border-white/25"
                    placeholder="1001  অথবা  admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="group animate-fade-up delay-300">
                <label className="block text-sm font-medium text-white/70 mb-1.5 group-focus-within:text-[#00f2fe] transition-colors">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-[#10B981] transition-all duration-300
                      group-focus-within:text-[#00f2fe] group-focus-within:scale-110"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input pl-12 pr-12 bg-black/30 hover:border-white/25"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-lg text-[#10B981]
                      hover:text-[#00f2fe] hover:bg-white/5 transition-all duration-300 cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="relative overflow-hidden group w-full mt-2 py-3.5 rounded-xl text-base md:text-lg font-bold text-[#04122b]
                  bg-gradient-to-r from-[#00f2fe] via-[#4facfe] to-[#00f2fe] bg-[length:200%_100%] bg-left
                  shadow-[0_10px_30px_-10px_rgba(0,242,254,.8)] transition-all duration-500
                  hover:bg-right hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-10px_rgba(0,242,254,.9)]
                  active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {/* Shine sweep */}
                {!loading && (
                  <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-white/40 blur-md animate-shimmer pointer-events-none" />
                )}
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" /> Authenticating...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight size={20} className="transition-transform duration-300 group-hover:translate-x-1.5" />
                    </>
                  )}
                </span>
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* Footer — kept in flow so it never overlaps the card on short screens */}
      <div className="relative z-10 w-full text-center px-4">
        <p className="text-white/45 text-xs md:text-base font-bold font-mono tracking-[0.15em] md:tracking-[0.2em] hover:text-white/70 transition-colors duration-300">
          &lt;/&gt; Developed By :: Nazim Iqbal ::
        </p>
      </div>
    </div>
  );
}
