// frontend/src/pages/Dashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap, TrendingUp, CheckCircle2, Wallet, ArrowUpRight,
  FolderOpen, Repeat, CalendarRange, BarChart3, StickyNote,
  CheckSquare, ChevronRight, Clock, Target, Activity,
  TrendingDown, Flame, Timer, Star, AlertTriangle,
  ArrowRight, Plus, DollarSign, BookOpen, Calendar,
  Layers, Play, PauseCircle, Archive, ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence, useSpring, useTransform } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useStore';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return 'Madrugada';
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function fmt(n: number) {
  return Math.abs(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

function fmtMins(mins: number) {
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function relativeDate(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1)  return 'ahora mismo';
  if (diff < 60) return `hace ${diff}min`;
  const h = Math.floor(diff / 60);
  if (h < 24)   return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1)  return 'ayer';
  if (d < 7)    return `hace ${d}d`;
  return new Date(dateStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function isOverdue(dateStr?: string | null) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

const PRIORITY_CFG: Record<string, { color: string; bg: string; dot: string }> = {
  CRITICAL: { color: 'text-error',       bg: 'bg-error/10',             dot: 'bg-error'       },
  HIGH:     { color: 'text-amber-400',   bg: 'bg-amber-400/10',         dot: 'bg-amber-400'   },
  NORMAL:   { color: 'text-primary',     bg: 'bg-primary/10',           dot: 'bg-primary'     },
  LOW:      { color: 'text-secondary',   bg: 'bg-secondary/10',         dot: 'bg-secondary'   },
  SOMEDAY:  { color: 'text-on-surface-variant', bg: 'bg-surface-container-high', dot: 'bg-on-surface-variant/30' },
};

const TX_CFG: Record<string, { color: string; icon: React.ElementType; sign: string }> = {
  INCOME:       { color: 'text-emerald-400', icon: TrendingUp,   sign: '+' },
  EXPENSE:      { color: 'text-error',       icon: TrendingDown, sign: '-' },
  INVESTMENT:   { color: 'text-primary',     icon: Target,       sign: '-' },
  SUBSCRIPTION: { color: 'text-amber-400',   icon: Repeat,       sign: '-' },
};

const EVENT_CFG: Record<string, { color: string; bg: string }> = {
  WORK:     { color: 'text-primary',     bg: 'bg-primary/10'     },
  STUDY:    { color: 'text-secondary',   bg: 'bg-secondary/10'   },
  REST:     { color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  MEETING:  { color: 'text-amber-400',   bg: 'bg-amber-400/10'   },
  EXERCISE: { color: 'text-rose-400',    bg: 'bg-rose-400/10'    },
  PERSONAL: { color: 'text-sky-400',     bg: 'bg-sky-400/10'     },
};

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED NUMBER
// ─────────────────────────────────────────────────────────────────────────────

function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }: {
  value: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const spring  = useSpring(0, { stiffness: 80, damping: 18 });
  const display = useTransform(spring, v =>
    `${prefix}${v.toLocaleString('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`
  );
  useEffect(() => { spring.set(value); }, [value]);
  return <motion.span>{display}</motion.span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ label, title, action, onAction }: {
  label: string; title: string; action?: string; onAction?: () => void;
}) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-on-surface-variant opacity-35 mb-0.5">{label}</p>
        <h3 className="font-display text-lg font-bold text-on-surface tracking-tight">{title}</h3>
      </div>
      {action && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary opacity-50 hover:opacity-100 transition-opacity"
        >
          {action} <ArrowUpRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// METRIC TILE  (compact stat block)
// ─────────────────────────────────────────────────────────────────────────────

function MetricTile({ label, value, prefix = '', suffix = '', icon: Icon, color, bg, delay = 0, onClick, formatFn }: {
  label: string; value: number; prefix?: string; suffix?: string;
  icon: React.ElementType; color: string; bg: string;
  delay?: number; onClick?: () => void; formatFn?: (v: number) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      onClick={onClick}
      className={cn(
        'relative bg-surface-container border border-outline-variant/30 rounded-2xl p-4 sm:p-5 overflow-hidden group transition-all duration-300',
        onClick && 'cursor-pointer hover:border-outline-variant/60 hover:shadow-md hover:shadow-black/5',
      )}
    >
      <div
        className="absolute -right-3 -top-3 w-16 h-16 rounded-full opacity-[0.07] transition-opacity group-hover:opacity-[0.12]"
        style={{ background: color.replace('text-', '') }}
      />
      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-3', bg)}>
        <Icon className={cn('w-4 h-4', color)} />
      </div>
      <p className="font-display text-xl sm:text-2xl font-black text-on-surface tracking-tight tabular-nums truncate">
        {formatFn
          ? <motion.span>{formatFn(value)}</motion.span>
          : <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
        }
      </p>
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.16em] text-on-surface-variant opacity-35 mt-1 line-clamp-2 leading-tight">
        {label}
      </p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT STRIP CARD
// ─────────────────────────────────────────────────────────────────────────────

function ProjectStripCard({ project, delay }: { project: any; delay: number }) {
  const navigate  = useNavigate();
  const color     = project.color ?? '#4d8eff';
  const overdue   = isOverdue(project.dueDate);
  const priCfg    = PRIORITY_CFG[project.priority] ?? PRIORITY_CFG.NORMAL;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.28 }}
      onClick={() => navigate('/projects')}
      className="group flex items-center gap-4 p-4 bg-surface-container-high/50 hover:bg-surface-container-high border border-outline-variant/20 hover:border-outline-variant/50 rounded-xl cursor-pointer transition-all duration-200"
    >
      {/* Color dot */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
        <FolderOpen className="w-4 h-4" style={{ color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <p className="text-sm font-bold text-on-surface truncate min-w-[80px] flex-1">{project.title}</p>
          <div className="flex items-center gap-1 shrink-0">
            {overdue && (
              <span className="text-[8px] font-black text-error bg-error/10 px-1.5 py-0.5 rounded-md uppercase tracking-widest shrink-0">
                Vencido
              </span>
            )}
            <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md shrink-0 border border-current/10', priCfg.color, priCfg.bg)}>
              {project.priority === 'CRITICAL' ? 'Crítico' :
               project.priority === 'HIGH'     ? 'Alto'    :
               project.priority === 'NORMAL'   ? 'Normal'  :
               project.priority === 'LOW'      ? 'Bajo'    : 'Algún día'}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-surface-container-highest rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${project.progress}%` }}
              transition={{ delay: delay + 0.2, duration: 0.7, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: color }}
            />
          </div>
          <span className="text-[9px] font-black tabular-nums shrink-0" style={{ color }}>
            {project.progress}%
          </span>
          <span className="text-[9px] font-bold text-on-surface-variant opacity-30 shrink-0">
            <Layers className="w-3 h-3 inline mr-0.5" />{project.taskCount}
          </span>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-on-surface-variant opacity-20 group-hover:opacity-60 transition-opacity shrink-0" />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK ITEM
// ─────────────────────────────────────────────────────────────────────────────

function TaskItem({ task, delay }: { task: any; delay: number }) {
  const navigate  = useNavigate();
  const priCfg    = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.NORMAL;
  const overdue   = isOverdue(task.dueDate);

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.24 }}
      onClick={() => navigate('/tasks')}
      className="group flex items-center gap-3 py-2.5 border-b border-outline-variant/10 last:border-0 cursor-pointer hover:bg-surface-container-high/30 -mx-1 px-1 rounded-lg transition-colors"
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', priCfg.dot)} />
      <p className="flex-1 text-sm text-on-surface truncate">{task.title}</p>
      {task.projectTitle && (
        <span className="hidden sm:block text-[9px] font-bold text-on-surface-variant opacity-30 truncate max-w-[80px]">
          {task.projectTitle}
        </span>
      )}
      {overdue ? (
        <span className="text-[8px] font-black text-error bg-error/10 px-1.5 py-0.5 rounded-md uppercase tracking-widest shrink-0">
          Vencido
        </span>
      ) : task.dueDate ? (
        <span className="text-[9px] font-bold text-on-surface-variant opacity-35 shrink-0">
          {new Date(task.dueDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
        </span>
      ) : null}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION ITEM
// ─────────────────────────────────────────────────────────────────────────────

function TransactionItem({ tx, delay }: { tx: any; delay: number }) {
  const cfg = TX_CFG[tx.type] ?? TX_CFG.EXPENSE;
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.22 }}
      className="flex items-center gap-3 py-2.5 border-b border-outline-variant/10 last:border-0"
    >
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
        tx.type === 'INCOME' ? 'bg-emerald-400/10' :
        tx.type === 'INVESTMENT' ? 'bg-primary/10' :
        tx.type === 'SUBSCRIPTION' ? 'bg-amber-400/10' : 'bg-error/10'
      )}>
        <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-on-surface truncate leading-snug">{tx.title}</p>
        {tx.category && (
          <p className="text-[9px] font-bold text-on-surface-variant opacity-30 uppercase tracking-widest">{tx.category}</p>
        )}
      </div>
      <span className={cn('text-sm font-black tabular-nums shrink-0', cfg.color)}>
        {cfg.sign}${fmt(tx.amount)}
      </span>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENDA EVENT ITEM
// ─────────────────────────────────────────────────────────────────────────────

function AgendaItem({ event, delay }: { event: any; delay: number }) {
  const cfg  = EVENT_CFG[event.category] ?? EVENT_CFG.PERSONAL;
  const start = new Date(event.startDate);
  const isToday = start.toDateString() === new Date().toDateString();

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.24 }}
      className="flex items-center gap-3 py-2.5 border-b border-outline-variant/10 last:border-0"
    >
      <div className="text-center w-10 shrink-0">
        <p className={cn('text-[9px] font-black uppercase tracking-widest', isToday ? 'text-primary' : 'text-on-surface-variant opacity-35')}>
          {isToday ? 'Hoy' : start.toLocaleDateString('es-CO', { weekday: 'short' })}
        </p>
        <p className={cn('font-display text-lg font-black leading-none', isToday ? 'text-primary' : 'text-on-surface opacity-60')}>
          {start.getDate()}
        </p>
      </div>
      <div className={cn('w-0.5 h-8 rounded-full shrink-0', cfg.bg.replace('bg-', 'bg-').replace('/10', '/60'))} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-on-surface truncate">{event.title}</p>
        <p className="text-[9px] font-bold text-on-surface-variant opacity-35">
          {start.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <span className={cn('hidden xs:inline-block text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md shrink-0', cfg.color, cfg.bg)}>
        {event.category === 'WORK' ? 'Trabajo' :
         event.category === 'STUDY' ? 'Estudio' :
         event.category === 'REST' ? 'Descanso' :
         event.category === 'MEETING' ? 'Reunión' :
         event.category === 'EXERCISE' ? 'Ejercicio' : 'Personal'}
      </span>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTIVITY RING
// ─────────────────────────────────────────────────────────────────────────────

function ProductivityRing({ score }: { score: number }) {
  const radius     = 36;
  const circumference = 2 * Math.PI * radius;
  const dash       = (score / 100) * circumference;

  const color = score >= 70 ? '#36c27a' : score >= 40 ? '#f9a03f' : '#f25c54';

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
          {/* Track */}
          <circle cx="44" cy="44" r={radius} fill="none" stroke="currentColor"
            className="text-surface-container-highest" strokeWidth="6" />
          {/* Progress */}
          <motion.circle
            cx="44" cy="44" r={radius} fill="none"
            stroke={color} strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - dash }}
            transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-black text-on-surface tabular-nums leading-none">{score}</span>
          <span className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35">score</span>
        </div>
      </div>
      <p className="text-[9px] font-black uppercase tracking-widest"
        style={{ color }}>
        {score >= 70 ? '🔥 Excelente' : score >= 40 ? '⚡ Regular' : '💤 Bajo'}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY PLACEHOLDER
// ─────────────────────────────────────────────────────────────────────────────

function EmptyPlaceholder({ icon: Icon, text, action, onAction }: {
  icon: React.ElementType; text: string; action?: string; onAction?: () => void;
}) {
  return (
    <div className="py-8 flex flex-col items-center gap-3 text-center">
      <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center">
        <Icon className="w-5 h-5 text-on-surface-variant opacity-20" />
      </div>
      <p className="text-xs text-on-surface-variant opacity-35">{text}</p>
      {action && onAction && (
        <button onClick={onAction} className="text-[10px] font-black uppercase tracking-widest text-primary opacity-50 hover:opacity-100 transition-opacity">
          + {action}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user }            = useAuthStore();
  const navigate            = useNavigate();

  const fetchStats = useCallback(async () => {
    try {
      const result = await api.stats.dashboard();
      setData(result);
    } catch (err) {
      console.error('Dashboard stats error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const firstName = (user?.name || user?.email?.split('@')[0] || 'Usuario').split(' ')[0];

  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        {/* Skeleton */}
        <div className="bg-surface-container border border-outline-variant/20 rounded-2xl h-28 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface-container border border-outline-variant/20 rounded-2xl h-28 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-surface-container border border-outline-variant/20 rounded-2xl h-64 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  const s  = data?.summary     ?? {};
  const tp = data?.topProjects  ?? [];
  const rt = data?.recentTasks  ?? [];
  const tx = data?.recentTransactions ?? [];
  const ev = data?.upcomingEvents     ?? [];
  const ra = data?.recentActivity     ?? [];

  return (
    <div className="space-y-6 pb-12">

      {/* ─────────────────────────────────────────────────────────────────────
          WELCOME BANNER
      ───────────────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative bg-surface-container border border-outline-variant/30 rounded-2xl px-5 py-5 sm:px-7 sm:py-6 overflow-hidden"
      >
        {/* Ambient glows */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-6 left-20 w-32 h-32 bg-secondary/4 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col xl:flex-row xl:items-end justify-between gap-5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary opacity-60 mb-1">
              {getGreeting()}
            </p>
            <h2 className="font-display text-3xl font-black text-on-surface tracking-tighter leading-none">
              {firstName} 👋
            </h2>
            <p className="text-sm text-on-surface-variant opacity-45 mt-1.5 capitalize">
              {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Quick micro-stats and productivity ring */}
          <div className="w-full xl:w-auto flex flex-col md:flex-row md:items-center gap-5 mt-3 xl:mt-0 border-t border-outline-variant/10 xl:border-t-0 pt-4 xl:pt-0">
            <div className="grid grid-cols-3 gap-3 md:flex md:items-center md:gap-5 w-full">
              {[
                { label: 'Proyectos activos',  value: s.activeProjects  ?? 0, onClick: () => navigate('/projects') },
                { label: 'Tareas pendientes',  value: s.tasksPending    ?? 0, onClick: () => navigate('/tasks')    },
                { label: 'Hábitos',            value: s.activeHabits    ?? 0, onClick: () => navigate('/habits')   },
              ].map((item, i) => (
                <div key={item.label} className="flex items-center">
                  {i > 0 && <div className="hidden md:block w-px h-9 bg-outline-variant/25 mr-5 shrink-0" />}
                  <div className="text-left md:text-right cursor-pointer group flex-1" onClick={item.onClick}>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35 group-hover:opacity-60 transition-opacity whitespace-nowrap">
                      {item.label}
                    </p>
                    <p className="font-display text-xl sm:text-2xl font-black text-on-surface leading-tight tabular-nums">
                      <AnimatedNumber value={item.value} />
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Productivity Ring with vertical separation bar on desktop / label on mobile */}
            <div className="flex items-center gap-4.5 border-t border-outline-variant/10 pt-4 md:border-t-0 md:pt-0 md:pl-5 md:border-l md:border-outline-variant/25">
              <ProductivityRing score={s.productivityScore ?? 0} />
              <div className="md:hidden flex-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35 leading-none">Puntaje de productividad</p>
                <p className="text-[11px] text-on-surface-variant opacity-50 mt-1 line-clamp-2">Refleja la proporción horaria de foco y cumplimiento de tus hábitos semanales.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alert bar: overdue items */}
        {((s.overdueProjects ?? 0) > 0 || (s.tasksOverdue ?? 0) > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ delay: 0.5 }}
            className="mt-4 pt-4 border-t border-outline-variant/15 flex flex-col xs:flex-row xs:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-xs text-on-surface-variant opacity-60 leading-tight">
                {s.tasksOverdue > 0 && (
                  <span className="text-amber-400 font-bold">{s.tasksOverdue} tarea{s.tasksOverdue !== 1 ? 's' : ''} vencida{s.tasksOverdue !== 1 ? 's' : ''}</span>
                )}
                {s.tasksOverdue > 0 && s.overdueProjects > 0 && <span className="opacity-50"> · </span>}
                {s.overdueProjects > 0 && (
                  <span className="text-amber-400 font-bold">{s.overdueProjects} proyecto{s.overdueProjects !== 1 ? 's' : ''} vencido{s.overdueProjects !== 1 ? 's' : ''}</span>
                )}
                <span className="hidden sm:inline ml-1">— revisa tus prioridades</span>
              </p>
            </div>
            <button
              onClick={() => navigate('/tasks')}
              className="text-[9px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1 opacity-75 hover:opacity-100 transition-opacity self-end xs:self-auto shrink-0"
            >
              Revisar <ArrowRight className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────────────
          METRIC TILES ROW
      ───────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricTile
          label="Tareas completadas semana"
          value={s.tasksCompletedWeek ?? 0}
          icon={CheckCircle2}
          color="text-emerald-400"
          bg="bg-emerald-400/10"
          delay={0}
          onClick={() => navigate('/tasks')}
        />
        <MetricTile
          label="Balance financiero"
          value={Math.abs(s.totalBalance ?? 0)}
          prefix={(s.totalBalance ?? 0) >= 0 ? '$' : '-$'}
          icon={(s.totalBalance ?? 0) >= 0 ? TrendingUp : TrendingDown}
          color={(s.totalBalance ?? 0) >= 0 ? 'text-emerald-400' : 'text-error'}
          bg={(s.totalBalance ?? 0) >= 0 ? 'bg-emerald-400/10' : 'bg-error/10'}
          delay={0.06}
          onClick={() => navigate('/finance')}
        />
        <MetricTile
          label="Foco hoy"
          value={s.todayFocusMinutes ?? 0}
          icon={Timer}
          color="text-primary"
          bg="bg-primary/10"
          delay={0.12}
          formatFn={fmtMins}
        />
        <MetricTile
          label="Notas creadas"
          value={s.totalNotes ?? 0}
          icon={StickyNote}
          color="text-secondary"
          bg="bg-secondary/10"
          delay={0.18}
          onClick={() => navigate('/notes')}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          MAIN CONTENT GRID
      ───────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── LEFT COL (8) ─────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-5">

          {/* ── Active Projects ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.4 }}
            className="bg-surface-container border border-outline-variant/30 rounded-2xl p-6"
          >
            <SectionHeader
              label="Workspace"
              title="Proyectos activos"
              action={`Ver todos (${s.totalProjects ?? 0})`}
              onAction={() => navigate('/projects')}
            />

            {/* Progress summary row */}
            {s.totalProjects > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5 p-4 bg-surface-container-high/60 rounded-xl border border-outline-variant/15 gap-y-4">
                <div className="flex-1 w-full">
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-40">
                      Progreso promedio
                    </span>
                    <span className="text-[9px] font-black text-primary">{s.avgProjectProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.avgProjectProgress}%` }}
                      transition={{ delay: 0.6, duration: 0.9, ease: 'easeOut' }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:gap-3 text-left sm:text-right sm:shrink-0 justify-between sm:justify-end w-full sm:w-auto border-t border-outline-variant/10 sm:border-t-0 pt-3 sm:pt-0">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35">Activos</p>
                    <p className="font-display text-base sm:text-xl font-black text-emerald-400 leading-none mt-0.5">{s.activeProjects}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35">Completos</p>
                    <p className="font-display text-base sm:text-xl font-black text-primary leading-none mt-0.5">{s.completedProjects}</p>
                  </div>
                  {s.overdueProjects > 0 && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35">Vencidos</p>
                      <p className="font-display text-base sm:text-xl font-black text-error leading-none mt-0.5">{s.overdueProjects}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tp.length > 0 ? (
              <div className="space-y-2">
                {tp.map((p: any, i: number) => (
                  <ProjectStripCard key={p.id} project={p} delay={0.28 + i * 0.05} />
                ))}
              </div>
            ) : (
              <EmptyPlaceholder
                icon={FolderOpen}
                text="Sin proyectos activos."
                action="Crear primer proyecto"
                onAction={() => navigate('/projects')}
              />
            )}
          </motion.div>

          {/* ── Pending Tasks ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="bg-surface-container border border-outline-variant/30 rounded-2xl p-6"
          >
            <SectionHeader
              label="Productividad"
              title="Tareas prioritarias"
              action={`Ver todas (${s.tasksPending ?? 0})`}
              onAction={() => navigate('/tasks')}
            />

            {/* Task stats mini-row */}
            {s.totalTasks > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Pendientes', value: s.tasksPending ?? 0, color: 'text-on-surface' },
                  { label: 'Hoy',        value: s.tasksToday   ?? 0, color: 'text-amber-400'  },
                  { label: 'Semana',     value: s.tasksCompletedWeek ?? 0, color: 'text-emerald-400' },
                ].map(item => (
                  <div key={item.label} className="bg-surface-container-high/60 rounded-xl p-3 border border-outline-variant/15 text-center">
                    <p className={cn('font-display text-xl font-black tabular-nums', item.color)}>
                      <AnimatedNumber value={item.value} />
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            )}

            {rt.length > 0 ? (
              <div>
                {rt.map((task: any, i: number) => (
                  <TaskItem key={task.id} task={task} delay={0.35 + i * 0.04} />
                ))}
              </div>
            ) : (
              <EmptyPlaceholder
                icon={CheckSquare}
                text="Sin tareas pendientes. ¡Todo al día!"
                action="Crear tarea"
                onAction={() => navigate('/tasks')}
              />
            )}
          </motion.div>

          {/* ── Finance ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.4 }}
            className="bg-surface-container border border-outline-variant/30 rounded-2xl p-6"
          >
            <SectionHeader
              label="Finanzas"
              title="Resumen financiero"
              action="Ver finanzas"
              onAction={() => navigate('/finance')}
            />

            {/* Finance overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Ingresos',    value: s.totalIncome  ?? 0, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                { label: 'Gastos',      value: s.totalExpense ?? 0, color: 'text-error',        bg: 'bg-error/10'       },
                { label: 'Invertido',   value: s.totalInvested?? 0, color: 'text-primary',      bg: 'bg-primary/10'     },
                { label: 'Balance',     value: Math.abs(s.totalBalance ?? 0),
                  color: (s.totalBalance ?? 0) >= 0 ? 'text-emerald-400' : 'text-error',
                  bg:    (s.totalBalance ?? 0) >= 0 ? 'bg-emerald-400/10' : 'bg-error/10',
                  prefix: (s.totalBalance ?? 0) < 0 ? '-' : '' },
              ].map(item => (
                <div key={item.label} className={cn('rounded-xl p-3 border border-outline-variant/15 overflow-hidden', item.bg)}>
                  <p className={cn('font-display text-base xs:text-lg sm:text-xl font-black tabular-nums truncate leading-none', item.color)}>
                    {item.prefix ?? ''}$<AnimatedNumber value={item.value} />
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-40 mt-1 truncate">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Income change indicator */}
            {s.lastMonthIncome > 0 && (
              <div className="flex items-center gap-2 mb-4 text-xs text-on-surface-variant opacity-50">
                {s.incomeChange >= 0
                  ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  : <TrendingDown className="w-3.5 h-3.5 text-error" />
                }
                <span>
                  Ingresos este mes{' '}
                  <span className={cn('font-bold', s.incomeChange >= 0 ? 'text-emerald-400' : 'text-error')}>
                    {s.incomeChange >= 0 ? '+' : ''}{s.incomeChange}%
                  </span>{' '}
                  vs mes anterior
                </span>
              </div>
            )}

            {tx.length > 0 ? (
              <div>
                {tx.map((t: any, i: number) => (
                  <TransactionItem key={t.id} tx={t} delay={0.42 + i * 0.04} />
                ))}
              </div>
            ) : (
              <EmptyPlaceholder
                icon={Wallet}
                text="Sin transacciones registradas."
                action="Registrar transacción"
                onAction={() => navigate('/finance')}
              />
            )}
          </motion.div>
        </div>

        {/* ── RIGHT COL (4) ─────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-5">

          {/* ── Quick access ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, duration: 0.4 }}
            className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-on-surface-variant opacity-35 mb-4">
              Acceso rápido
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'tasks',    label: 'Tareas',    icon: CheckSquare,  color: 'text-primary',     bg: 'bg-primary/10'     },
                { id: 'projects', label: 'Proyectos', icon: FolderOpen,   color: 'text-secondary',   bg: 'bg-secondary/10'   },
                { id: 'habits',   label: 'Hábitos',   icon: Repeat,       color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                { id: 'finance',  label: 'Finanzas',  icon: Wallet,       color: 'text-amber-400',   bg: 'bg-amber-400/10'   },
                { id: 'agenda',   label: 'Agenda',    icon: CalendarRange,color: 'text-sky-400',     bg: 'bg-sky-400/10'     },
                { id: 'notes',    label: 'Notas',     icon: StickyNote,   color: 'text-rose-400',    bg: 'bg-rose-400/10'    },
              ].map((link, i) => {
                const Icon = link.icon;
                return (
                  <motion.button
                    key={link.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.04 }}
                    onClick={() => navigate(`/${link.id}`)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-outline-variant/15 hover:border-outline-variant/45 hover:bg-surface-container-high transition-all group"
                  >
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', link.bg)}>
                      <Icon className={cn('w-4 h-4', link.color)} />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-50 group-hover:opacity-80 transition-opacity">
                      {link.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* ── Upcoming Agenda ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.4 }}
            className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5"
          >
            <SectionHeader
              label="Próximos 7 días"
              title="Agenda"
              action="Ver agenda"
              onAction={() => navigate('/agenda')}
            />

            {ev.length > 0 ? (
              <div>
                {ev.map((event: any, i: number) => (
                  <AgendaItem key={event.id} event={event} delay={0.36 + i * 0.05} />
                ))}
              </div>
            ) : (
              <EmptyPlaceholder
                icon={CalendarRange}
                text="Sin eventos próximos."
                action="Añadir evento"
                onAction={() => navigate('/agenda')}
              />
            )}
          </motion.div>

          {/* ── Focus + Habits ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.4 }}
            className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5"
          >
            <SectionHeader
              label="Bienestar"
              title="Foco y hábitos"
              action="Ver hábitos"
              onAction={() => navigate('/habits')}
            />

            <div className="space-y-3">
              {/* Focus stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-surface-container-high/60 rounded-xl p-3 border border-outline-variant/15">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Timer className="w-3 h-3 text-primary" />
                    <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35">Hoy</p>
                  </div>
                  <p className="font-display text-lg font-black text-on-surface">
                    {fmtMins(s.todayFocusMinutes ?? 0)}
                  </p>
                </div>
                <div className="bg-surface-container-high/60 rounded-xl p-3 border border-outline-variant/15">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Flame className="w-3 h-3 text-amber-400" />
                    <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35">Semana</p>
                  </div>
                  <p className="font-display text-lg font-black text-on-surface">
                    {fmtMins(s.weekFocusMinutes ?? 0)}
                  </p>
                </div>
              </div>

              {/* Habits count */}
              <div className="flex items-center justify-between p-3 bg-surface-container-high/60 rounded-xl border border-outline-variant/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-400/10 flex items-center justify-center">
                    <Repeat className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35">Hábitos activos</p>
                    <p className="font-display text-lg font-black text-on-surface leading-tight">
                      {s.activeHabits ?? 0}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/habits')}
                  className="p-2 rounded-lg text-on-surface-variant opacity-30 hover:opacity-70 hover:bg-surface-container-highest transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* ── Recent activity log ── */}
          {ra.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.44, duration: 0.4 }}
              className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5"
            >
              <SectionHeader label="Historial" title="Actividad reciente" />
              <div className="space-y-px">
                {ra.map((log: any, i: number) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.48 + i * 0.04 }}
                    className="flex items-start gap-3 py-2.5 border-b border-outline-variant/10 last:border-0"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-on-surface leading-snug">{log.action}</p>
                      {log.details && (
                        <p className="text-[10px] text-on-surface-variant opacity-35 mt-0.5 truncate">{log.details}</p>
                      )}
                    </div>
                    <span className="text-[9px] text-on-surface-variant opacity-25 font-bold shrink-0">
                      {relativeDate(log.createdAt)}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}