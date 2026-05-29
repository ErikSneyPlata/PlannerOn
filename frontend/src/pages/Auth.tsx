// frontend/src/pages/Auth.tsx
import  { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail, Lock, User, ArrowRight,
  GitBranch, Layers, DollarSign, CalendarCheck,
  Terminal, CheckCircle2, Zap, RefreshCw, ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '../store/useStore';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// TYPING ANIMATION HOOK
// ─────────────────────────────────────────────────────────────────────────────

const TAGLINES = [
  'Ship faster. Stay focused.',
  'Plan sprints. Track habits.',
  'Own your finances. Own your time.',
  'Built for builders.',
];

function useTypingEffect(strings: string[], speed = 55, pause = 1800) {
  const [display, setDisplay] = useState('');
  const [strIdx, setStrIdx]   = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = strings[strIdx];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && charIdx <= current.length) {
      timeout = setTimeout(() => {
        setDisplay(current.slice(0, charIdx));
        setCharIdx(c => c + 1);
      }, speed);
    } else if (!deleting && charIdx > current.length) {
      timeout = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && charIdx > 0) {
      timeout = setTimeout(() => {
        setDisplay(current.slice(0, charIdx - 1));
        setCharIdx(c => c - 1);
      }, speed / 2);
    } else {
      setDeleting(false);
      setStrIdx(i => (i + 1) % strings.length);
    }
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, strIdx, strings, speed, pause]);

  return display;
}

// ─────────────────────────────────────────────────────────────────────────────
// TERMINAL BLOCK  (left panel)
// ─────────────────────────────────────────────────────────────────────────────

const TERMINAL_LINES = [
  { prefix: '→',  text: 'planneron init --workspace',     color: 'text-primary'     },
  { prefix: '✓',  text: 'Sprints configured',             color: 'text-emerald-400' },
  { prefix: '✓',  text: 'Finance tracker enabled',        color: 'text-emerald-400' },
  { prefix: '✓',  text: 'Habit engine loaded',            color: 'text-emerald-400' },
  { prefix: '✓',  text: 'Agenda synced',                  color: 'text-emerald-400' },
  { prefix: '›',  text: 'Ready. Ship something great.',   color: 'text-amber-400'   },
];

function TerminalBlock() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= TERMINAL_LINES.length) return;
    const t = setTimeout(() => setVisible(v => v + 1), 320);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div className="bg-background/60 border border-outline-variant/25 rounded-2xl p-5 font-mono text-xs space-y-2">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 mb-4">
        <div className="w-3 h-3 rounded-full bg-error/60" />
        <div className="w-3 h-3 rounded-full bg-amber-400/60" />
        <div className="w-3 h-3 rounded-full bg-emerald-400/60" />
        <span className="ml-3 text-[10px] text-on-surface-variant opacity-30 tracking-widest">
          planneron — bash
        </span>
      </div>
      {TERMINAL_LINES.map((line, i) => (
        <AnimatePresence key={i}>
          {visible > i && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2"
            >
              <span className={cn('shrink-0 font-black', line.color)}>{line.prefix}</span>
              <span className="text-on-surface-variant opacity-70">{line.text}</span>
            </motion.div>
          )}
        </AnimatePresence>
      ))}
      {visible >= TERMINAL_LINES.length && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="inline-block w-2 h-4 bg-primary"
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLE BADGES
// ─────────────────────────────────────────────────────────────────────────────

const ROLES = [
  { label: 'Developer',      icon: Terminal      },
  { label: 'Scrum Master',   icon: GitBranch     },
  { label: 'Product Manager',icon: Layers        },
  { label: 'Freelancer',     icon: DollarSign    },
  { label: 'Tech Lead',      icon: Zap           },
  { label: 'Consultant',     icon: CalendarCheck },
];

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE ROW
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: GitBranch,     label: 'Sprint & project tracking' },
  { icon: CalendarCheck, label: 'Daily agenda & calendar'   },
  { icon: DollarSign,    label: 'Income & expense control'  },
  { icon: CheckCircle2,  label: 'Task manager with status'  },
];

// ─────────────────────────────────────────────────────────────────────────────
// INPUT FIELD
// ─────────────────────────────────────────────────────────────────────────────

function InputField({
  icon: Icon, label, type, placeholder, value, onChange, required,
}: {
  icon: React.ElementType; label: string; type: string;
  placeholder: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-bold uppercase tracking-[0.22em] text-on-surface-variant opacity-45">
        {label}
      </label>
      <div className="relative group">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/35 group-focus-within:text-primary transition-all duration-200" />
        <input
          type={type} placeholder={placeholder}
          value={value} onChange={onChange} required={required}
          className="w-full bg-surface-container-low border border-outline-variant/40 hover:border-outline-variant/70 focus:border-primary/60 text-on-surface text-sm px-4 pl-11 py-3 rounded-xl focus:outline-none transition-all duration-200 placeholder:text-on-surface-variant/20"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERACTIVE SLIDER VERIFICATION FOR HUMANS (ANTI-BOT)
// ─────────────────────────────────────────────────────────────────────────────

interface SliderVerifyProps {
  onVerified: (verified: boolean) => void;
  isVerified: boolean;
  sliderVal: number;
  setSliderVal: React.Dispatch<React.SetStateAction<number>>;
}

function SliderVerify({ onVerified, isVerified, sliderVal, setSliderVal }: SliderVerifyProps) {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isVerified) return; // Locked when completed
    
    setSliderVal(val);
    if (val >= 100) {
      onVerified(true);
      setSliderVal(100);
    }
  };

  const resetSlider = () => {
    setSliderVal(0);
    onVerified(false);
  };

  return (
    <div className="space-y-2 mt-4 mb-2">
      <div className="flex justify-between items-center">
        <label className="text-[9px] font-bold uppercase tracking-[0.22em] text-on-surface-variant opacity-45 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          Verificación Humana (Deslizar)
        </label>
        {isVerified && (
          <button
            type="button"
            onClick={resetSlider}
            className="text-[8px] font-mono uppercase tracking-widest text-[#adcdff] opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1"
          >
            <RefreshCw className="w-2.5 h-2.5" /> reiniciar
          </button>
        )}
      </div>

      <div
        className={cn(
          "w-full h-11 rounded-xl relative overflow-hidden transition-all duration-300 flex items-center",
          isVerified
            ? "bg-emerald-500/10 border border-emerald-500/35 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
            : "bg-surface-container-low border border-outline-variant/35 hover:border-outline-variant/50"
        )}
      >
        {/* Dynamic active track layout (green or primary fill) */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-100 ease-out",
            isVerified ? "bg-emerald-500/20" : "bg-primary/10"
          )}
          style={{ width: `${sliderVal}%` }}
        />

        {/* Informative text track */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-center select-none">
          <span
            className={cn(
              "text-[10px] font-mono font-black uppercase tracking-[0.16em] transition-all",
              isVerified ? "text-emerald-400 font-extrabold" : "text-on-surface-variant opacity-40 group-hover:opacity-65 animate-pulse"
            )}
          >
            {isVerified ? "✓ Verificación Exitosa" : "➔ Desliza para verificar"}
          </span>
        </div>

        {/* Transparent native range slider overlay that is touchable */}
        <input
          type="range"
          min="0"
          max="100"
          value={sliderVal}
          onChange={handleSliderChange}
          disabled={isVerified}
          className={cn(
            "w-full h-full opacity-100 bg-transparent appearance-none cursor-grab active:cursor-grabbing outline-none relative z-10",
            "[&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-runnable-track]:border-none",
            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:h-9",
            "[&::-webkit-slider-thumb]:rounded-lg [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-95",
            isVerified && "[&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:cursor-default [&::-webkit-slider-thumb]:active:scale-100"
          )}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Anti-bot security verification states
  const [honeypot, setHoneypot] = useState('');
  const [sliderVal, setSliderVal] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  const setAuth  = useAuthStore(s => s.setAuth);
  const tagline  = useTypingEffect(TAGLINES);

  // Reset verification indicator when toggling between signin/signup tabs
  useEffect(() => {
    setSliderVal(0);
    setIsVerified(false);
    setError('');
  }, [isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');

    // Pre-check verification before issuing API request
    if (!isLogin && !isVerified) {
      setError('Por favor complete la verificación interactiva deslizante para corroborar que es un humano.');
      setLoading(false);
      return;
    }

    try {
      const payload: any = {
        email,
        password,
        username: honeypot, // Honeypot field
      };

      if (isLogin) {
        const res = await api.auth.login(payload);
        setAuth(res.user, res.token);
      } else {
        payload.name = name;
        payload.botProof = "human-slider-verified"; // Proof token
        const res = await api.auth.register(payload);
        setAuth(res.user, res.token);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-hidden">

      {/* ── LEFT: Brand panel ── */}
      <div className="hidden lg:flex lg:w-[52%] bg-surface-container-low border-r border-outline-variant/20 relative overflow-hidden flex-col justify-between p-12 xl:p-16">

        {/* Ambient glows */}
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/6 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute -bottom-28 -left-28 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[110px] pointer-events-none" />

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.018] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Top: wordmark + tagline */}
        <div className="relative z-10 space-y-6">
          <div>
            <div className="flex items-baseline gap-0 leading-none mb-3">
              <span className="font-display text-[64px] xl:text-[76px] font-black text-on-surface tracking-[-0.04em] italic leading-none">
                Planner
              </span>
              <span className="font-display text-[64px] xl:text-[76px] font-black text-primary tracking-[-0.04em] not-italic leading-none">
                On
              </span>
            </div>
            {/* Typing tagline */}
            <div className="h-6 flex items-center gap-1">
              <span className="font-mono text-sm text-on-surface-variant opacity-50">{tagline}</span>
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ repeat: Infinity, duration: 0.9 }}
                className="inline-block w-0.5 h-4 bg-primary opacity-70"
              />
            </div>
          </div>

          {/* Role badges */}
          <div className="flex flex-wrap gap-2">
            {ROLES.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container/70 border border-outline-variant/20 rounded-lg text-[10px] font-bold text-on-surface-variant opacity-60 hover:opacity-90 transition-opacity"
              >
                <Icon className="w-3 h-3" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Middle: terminal block */}
        <div className="relative z-10">
          <TerminalBlock />
        </div>

        {/* Bottom: feature list */}
        <div className="relative z-10 space-y-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-on-surface-variant opacity-25">
            Everything in one workspace
          </p>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-xs font-semibold text-on-surface-variant opacity-50">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Auth form ── */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 relative">
        {/* Faint grid */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-sm"
        >
          {/* Mobile wordmark */}
          <div className="lg:hidden mb-8">
            <span className="font-display text-4xl font-black text-on-surface italic tracking-tighter">Planner</span>
            <span className="font-display text-4xl font-black text-primary tracking-tighter not-italic">On</span>
            <p className="text-xs text-on-surface-variant opacity-40 mt-1 font-mono">
              Built for builders.
            </p>
          </div>

          {/* Heading */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? 'in' : 'up'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="mb-7"
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-primary opacity-70 mb-2">
                {isLogin ? 'Welcome back' : 'Get started'}
              </p>
              <h2 className="font-display text-[28px] font-black text-on-surface tracking-tighter leading-tight">
                {isLogin ? 'Sign in to your\nworkspace' : 'Create your\naccount'}
              </h2>
              <p className="text-sm text-on-surface-variant opacity-35 mt-2">
                {isLogin
                  ? 'Enter your credentials to access your tools.'
                  : 'Join professionals who build and ship with clarity.'}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pb-0.5">
                    <InputField
                      icon={User} label="Full Name" type="text"
                      placeholder="Alex Rivera"
                      value={name} onChange={e => setName(e.target.value)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <InputField
              icon={Mail} label="Email" type="email"
              placeholder="alex@company.com"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
            <InputField
              icon={Lock} label="Password" type="password"
              placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required
            />

            {/* Invisible Honeypot field (anti-spam, anti-bot protection) */}
            <div className="hidden" aria-hidden="true">
              <input
                type="text"
                name="username"
                value={honeypot}
                onChange={e => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="new-password"
              />
            </div>

            {/* Interactive verification slider for signup */}
            {!isLogin && (
              <SliderVerify
                onVerified={setIsVerified}
                isVerified={isVerified}
                sliderVal={sliderVal}
                setSliderVal={setSliderVal}
              />
            )}

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <p className="text-xs text-error font-semibold py-2.5 px-3.5 bg-error/8 rounded-xl border border-error/15 font-mono">
                    ✗ {error}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || (!isLogin && !isVerified)}
              className={cn(
                "w-full mt-2 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] disabled:cursor-not-allowed",
                !isLogin && !isVerified
                  ? "bg-surface-container-high text-on-surface-variant/40 border border-outline-variant/15 shadow-none"
                  : "bg-primary text-on-primary hover:bg-primary/90 shadow-primary/20 disabled:opacity-50"
              )}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-on-primary/30 border-t-on-primary animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {!isLogin && !isVerified ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-on-surface-variant/40" />
                      Arrastra para Verificar
                    </>
                  ) : (
                    <>
                      {isLogin ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 pt-5 border-t border-outline-variant/15 text-center">
            <p className="text-sm text-on-surface-variant opacity-40">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-primary font-bold opacity-100 hover:underline underline-offset-4 transition-all"
              >
                {isLogin ? 'Get started →' : 'Sign in →'}
              </button>
            </p>
          </div>

          {/* Tech stack badge — social proof for devs */}
          <div className="mt-8 flex items-center justify-center gap-3 opacity-25">
            <div className="h-px flex-1 bg-outline-variant" />
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-on-surface-variant whitespace-nowrap">
              React · Node · PostgreSQL
            </span>
            <div className="h-px flex-1 bg-outline-variant" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}