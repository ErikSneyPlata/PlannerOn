// frontend/src/pages/Stats.tsx
import  { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, CheckCircle2, Wallet, Repeat, FolderOpen,
  ArrowUpRight, ArrowDownRight, Target, Zap, Clock,
  StickyNote, Calendar, AlertTriangle, Flame,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtMin(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl px-4 py-3 text-xs shadow-xl">
      {label && <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-40 mb-1.5">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold" style={{ color: p.color ?? p.fill }}>
          {p.name}: {typeof p.value === 'number' && p.value > 1000 ? `$${fmt(p.value)}` : p.value}
        </p>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK STATUS CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const TASK_STATUS_COLORS: Record<string, string> = {
  TODO:        'var(--color-on-surface-variant)',
  IN_PROGRESS: 'var(--color-primary)',
  REVIEW:      '#f59e0b',
  BLOCKED:     'var(--color-error)',
  COMPLETED:   '#34d399',
  BACKLOG:     '#64748b',
  ARCHIVED:    '#475569',
};

const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: 'Por hacer', IN_PROGRESS: 'En curso', REVIEW: 'Revisión',
  BLOCKED: 'Bloqueado', COMPLETED: 'Completado', BACKLOG: 'Backlog', ARCHIVED: 'Archivado',
};

const PRIORITY_CFG: Record<string, { color: string; bg: string; label: string }> = {
  CRITICAL: { color: 'text-error',     bg: 'bg-error/10',     label: 'Crítico'   },
  HIGH:     { color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Alto'      },
  NORMAL:   { color: 'text-primary',   bg: 'bg-primary/10',   label: 'Normal'    },
  LOW:      { color: 'text-secondary', bg: 'bg-secondary/10', label: 'Bajo'      },
  SOMEDAY:  { color: 'text-on-surface-variant', bg: 'bg-surface-container-high', label: 'Algún día' },
};

const CAT_LABEL: Record<string, string> = {
  WORK: 'Trabajo', STUDY: 'Estudio', REST: 'Descanso',
  MEETING: 'Reunión', EXERCISE: 'Ejercicio', PERSONAL: 'Personal',
};

// ─────────────────────────────────────────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({
  delay = 0, icon: Icon, iconClass, label, value, sub, trend, trendPositive,
}: {
  delay?: number;
  icon: React.ElementType;
  iconClass: string;
  label: string;
  value: React.ReactNode;
  sub?: string;
  trend?: string;
  trendPositive?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className="bg-surface-container border border-outline-variant/35 rounded-2xl p-5 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', iconClass)}>
          <Icon className="w-4 h-4" />
        </div>
        {trend !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest',
            trendPositive ? 'text-emerald-400' : 'text-rose-400'
          )}>
            {trendPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-40 mb-1">
          {label}
        </p>
        <p className="font-display text-2xl font-black text-on-surface tracking-tighter">{value}</p>
        {sub && <p className="text-[10px] text-on-surface-variant opacity-35 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTIVITY SCORE RING
// ─────────────────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r   = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * score) / 100;

  const color = score >= 70 ? '#34d399' : score >= 40 ? 'var(--color-primary)' : '#f59e0b';
  const label = score >= 70 ? 'Excelente' : score >= 40 ? 'Bueno' : 'Mejorable';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor"
            strokeWidth="6" className="text-surface-container-highest" />
          <circle cx="50" cy="50" r={r} fill="none"
            stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="flex flex-col items-center">
          <span className="font-display text-2xl font-black text-on-surface">{score}</span>
          <span className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant opacity-40">/ 100</span>
        </div>
      </div>
      <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export default function Stats() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.stats.dashboard()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-surface-container-highest border-t-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-center">
        <AlertTriangle className="w-6 h-6 text-error" />
        <p className="text-sm text-on-surface-variant opacity-50">Error al cargar estadísticas: {error}</p>
      </div>
    );
  }

  const {
    summary,
    topProjects       = [],
    recentTasks       = [],
    recentTransactions= [],
    upcomingEvents    = [],
  } = data ?? {};

  const s = summary ?? {};

  // ── Task pie data ──
  const taskStatuses: Record<string, number> = {};
  // Build from summary fields (no raw tasks array, only counts)
  if (s.tasksPending)   taskStatuses['Pendientes']  = s.tasksPending;
  if (s.tasksCompleted) taskStatuses['Completadas'] = s.tasksCompleted;
  const taskPieData = Object.entries(taskStatuses).map(([name, value], i) => ({
    name, value,
    color: i === 0 ? 'var(--color-primary)' : '#34d399',
  }));
  const completionPct = s.totalTasks > 0
    ? Math.round((s.tasksCompleted / s.totalTasks) * 100) : 0;

  // ── Finance area — last 5 transactions grouped roughly ──
  const financeAreaData = (() => {
    const days: Record<string, { income: number; expense: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('es-CO', { weekday: 'short' });
      days[key] = { income: 0, expense: 0 };
    }
    recentTransactions.forEach((t: any) => {
      const key = new Date(t.date).toLocaleDateString('es-CO', { weekday: 'short' });
      if (days[key]) {
        if (t.type === 'INCOME') days[key].income += t.amount;
        else                     days[key].expense += t.amount;
      }
    });
    return Object.entries(days).map(([name, v]) => ({ name, ...v }));
  })();

  // ── Projects bar ──
  const projectBarData = topProjects.map((p: any) => ({
    name:     p.title.length > 12 ? p.title.slice(0, 12) + '…' : p.title,
    progress: p.progress ?? 0,
    color:    p.color ?? 'var(--color-primary)',
  }));

  return (
    <div className="space-y-gutter pb-12">

      {/* ── Header ── */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-primary opacity-70 mb-1.5">Análisis</p>
        <h2 className="font-display text-4xl font-black text-on-surface tracking-tighter leading-none">Estadísticas</h2>
        <p className="text-sm text-on-surface-variant opacity-50 mt-2">
          Visión completa de tu productividad, finanzas y proyectos.
        </p>
      </div>

      {/* ── Row 1: Score + 4 KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-card-gap">

        {/* Productivity score — spans 2 cols */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-2 bg-surface-container-high border border-outline-variant/35 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6"
        >
          <ScoreRing score={s.productivityScore ?? 0} />
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-40 mb-1">
                Score de productividad
              </p>
              <p className="text-sm text-on-surface-variant opacity-50 leading-relaxed">
                Basado en tareas completadas esta semana y sesiones de enfoque.
              </p>
            </div>
            <div className="flex gap-4 justify-center sm:justify-start">
              <div className="text-center">
                <p className="font-display text-xl font-black text-on-surface">{s.tasksCompletedWeek ?? 0}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35">Esta semana</p>
              </div>
              <div className="w-px bg-outline-variant/20" />
              <div className="text-center">
                <p className="font-display text-xl font-black text-on-surface">{fmtMin(s.weekFocusMinutes ?? 0)}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35">Enfoque</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* KPI cards */}
        <KpiCard
          delay={0.06}
          icon={CheckCircle2} iconClass="bg-primary/10 text-primary"
          label="Tareas pendientes"
          value={s.tasksPending ?? 0}
          sub={`${s.tasksCompleted ?? 0} completadas en total`}
          trend={s.tasksOverdue > 0 ? `${s.tasksOverdue} vencidas` : undefined}
          trendPositive={false}
        />
        <KpiCard
          delay={0.10}
          icon={Wallet} iconClass="bg-emerald-400/10 text-emerald-400"
          label="Balance financiero"
          value={`$${fmt(Math.abs(s.totalBalance ?? 0))}`}
          sub={(s.totalBalance ?? 0) >= 0 ? 'Flujo positivo' : 'Flujo negativo'}
          trend={s.incomeChange !== 0 ? `${Math.abs(s.incomeChange)}% vs mes anterior` : undefined}
          trendPositive={(s.incomeChange ?? 0) >= 0}
        />
        <KpiCard
          delay={0.14}
          icon={Zap} iconClass="bg-amber-400/10 text-amber-400"
          label="Focus hoy"
          value={fmtMin(s.todayFocusMinutes ?? 0)}
          sub={`${fmtMin(s.totalFocusMinutes ?? 0)} total acumulado`}
        />
        <KpiCard
          delay={0.18}
          icon={FolderOpen} iconClass="bg-secondary/10 text-secondary"
          label="Proyectos activos"
          value={s.activeProjects ?? 0}
          sub={`Progreso promedio ${s.avgProjectProgress ?? 0}%`}
          trend={s.overdueProjects > 0 ? `${s.overdueProjects} vencidos` : undefined}
          trendPositive={false}
        />
      </div>

      {/* ── Row 2: Projects progress + Task completion ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-card-gap">

        {/* Projects bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-7 bg-surface-container border border-outline-variant/35 rounded-2xl p-7"
        >
          <div className="mb-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-35 mb-1">Top proyectos</p>
            <h3 className="font-display text-xl font-bold text-on-surface tracking-tight">Progreso activo</h3>
          </div>

          {projectBarData.length > 0 ? (
            <div className="space-y-3">
              {topProjects.map((p: any, i: number) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.07 }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: p.color ?? 'var(--color-primary)' }}
                      />
                      <span className="text-xs font-semibold text-on-surface truncate">{p.title}</span>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-30 shrink-0">
                        {p.taskCount} tareas
                      </span>
                    </div>
                    <span className="text-[9px] font-bold shrink-0 ml-2" style={{ color: p.color ?? 'var(--color-primary)' }}>
                      {p.progress}%
                    </span>
                  </div>
                  <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.progress}%` }}
                      transition={{ delay: 0.3 + i * 0.07, duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: p.color ?? 'var(--color-primary)' }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center gap-2 text-center">
              <FolderOpen className="w-7 h-7 text-on-surface-variant opacity-15" />
              <p className="text-sm text-on-surface-variant opacity-30">Sin proyectos activos.</p>
            </div>
          )}

          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-outline-variant/15">
            {[
              { label: 'Total',      value: s.totalProjects ?? 0      },
              { label: 'Activos',    value: s.activeProjects ?? 0     },
              { label: 'Completados',value: s.completedProjects ?? 0  },
            ].map(item => (
              <div key={item.label} className="text-center">
                <p className="font-display text-xl font-black text-on-surface">{item.value}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35">{item.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Task pie + pending list */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          className="lg:col-span-5 bg-surface-container border border-outline-variant/35 rounded-2xl p-7 flex flex-col gap-5"
        >
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-35 mb-1">Distribución</p>
            <h3 className="font-display text-xl font-bold text-on-surface tracking-tight">Estado de tareas</h3>
          </div>

          {/* Donut */}
          {s.totalTasks > 0 ? (
            <div className="relative h-36 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskPieData}
                    cx="50%" cy="50%"
                    innerRadius={44} outerRadius={60}
                    paddingAngle={4} dataKey="value" strokeWidth={0}
                  >
                    {taskPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-display text-2xl font-black text-on-surface">{completionPct}%</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35">completado</span>
              </div>
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center">
              <p className="text-sm text-on-surface-variant opacity-30">Sin tareas aún.</p>
            </div>
          )}

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Total',     value: s.totalTasks ?? 0,    color: 'text-on-surface'  },
              { label: 'Pendientes',value: s.tasksPending ?? 0,  color: 'text-primary'     },
              { label: 'Hoy',       value: s.tasksToday ?? 0,    color: 'text-amber-400'   },
              { label: 'Vencidas',  value: s.tasksOverdue ?? 0,  color: 'text-error'       },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between px-3 py-2 bg-surface-container-high rounded-xl">
                <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-40">{item.label}</span>
                <span className={cn('font-display text-base font-black', item.color)}>{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Row 3: Finance area + Upcoming events ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-card-gap">

        {/* Finance area chart */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="lg:col-span-8 bg-surface-container border border-outline-variant/35 rounded-2xl p-7"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-35 mb-1">Últimos 7 días</p>
              <h3 className="font-display text-xl font-bold text-on-surface tracking-tight">Flujo financiero</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-40">Ingresos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-rose-400" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-40">Gastos</span>
              </div>
            </div>
          </div>

          {financeAreaData.some(d => d.income > 0 || d.expense > 0) ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financeAreaData}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#34d399" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#fb7185" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#fb7185" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false}
                    tick={{ fill: 'currentColor', opacity: 0.35, fontSize: 10, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false}
                    tick={{ fill: 'currentColor', opacity: 0.35, fontSize: 10, fontWeight: 700 }}
                    tickFormatter={v => `$${fmt(v)}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="income"  name="Ingresos" stroke="#34d399" strokeWidth={2} fill="url(#gIncome)"  />
                  <Area type="monotone" dataKey="expense" name="Gastos"   stroke="#fb7185" strokeWidth={2} fill="url(#gExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center gap-2">
              <Wallet className="w-7 h-7 text-on-surface-variant opacity-15" />
              <p className="text-sm text-on-surface-variant opacity-30">Sin transacciones recientes.</p>
            </div>
          )}

          {/* Finance summary */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-outline-variant/15">
            {[
              { label: 'Ingresos totales', value: `+$${fmt(s.totalIncome ?? 0)}`,   color: 'text-emerald-400' },
              { label: 'Gastos totales',   value: `-$${fmt(s.totalExpense ?? 0)}`,   color: 'text-rose-400'   },
              { label: 'Balance',          value: `$${fmt(Math.abs(s.totalBalance ?? 0))}`,
                color: (s.totalBalance ?? 0) >= 0 ? 'text-on-surface' : 'text-rose-400' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <p className={cn('font-mono font-black text-base', item.color)}>{item.value}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Upcoming events */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
          className="lg:col-span-4 bg-surface-container border border-outline-variant/35 rounded-2xl p-7 flex flex-col gap-4"
        >
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-35 mb-1">Próximos 7 días</p>
            <h3 className="font-display text-xl font-bold text-on-surface tracking-tight">Agenda</h3>
          </div>

          {upcomingEvents.length > 0 ? (
            <div className="flex-1 space-y-2">
              {upcomingEvents.map((ev: any, i: number) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="flex items-start gap-3 p-3 bg-surface-container-high rounded-xl border border-outline-variant/15 hover:border-outline-variant/35 transition-all"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-on-surface truncate">{ev.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35">
                        {CAT_LABEL[ev.category] ?? ev.category}
                      </span>
                      <span className="text-on-surface-variant opacity-20 text-[9px]">·</span>
                      <span className="text-[9px] font-bold tabular-nums text-on-surface-variant opacity-35">
                        {new Date(ev.startDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                        {' '}
                        {new Date(ev.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
              <Calendar className="w-7 h-7 text-on-surface-variant opacity-15" />
              <p className="text-sm text-on-surface-variant opacity-30">Sin eventos próximos.</p>
            </div>
          )}

          {/* Notes mini stat */}
          <div className="pt-4 border-t border-outline-variant/15 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-container-high rounded-xl border border-outline-variant/15">
              <StickyNote className="w-3.5 h-3.5 text-secondary shrink-0" />
              <div>
                <p className="font-display text-base font-black text-on-surface leading-none">{s.totalNotes ?? 0}</p>
                <p className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35">Notas</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-container-high rounded-xl border border-outline-variant/15">
              <Repeat className="w-3.5 h-3.5 text-tertiary shrink-0" />
              <div>
                <p className="font-display text-base font-black text-on-surface leading-none">{s.activeHabits ?? 0}</p>
                <p className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35">Hábitos</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Row 4: Priority tasks + Recent transactions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-card-gap">

        {/* Priority tasks */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          className="lg:col-span-6 bg-surface-container border border-outline-variant/35 rounded-2xl p-7"
        >
          <div className="mb-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-35 mb-1">Por prioridad</p>
            <h3 className="font-display text-xl font-bold text-on-surface tracking-tight">Tareas urgentes</h3>
          </div>

          {recentTasks.length > 0 ? (
            <div className="space-y-2">
              {recentTasks.map((task: any, i: number) => {
                const pCfg   = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.NORMAL;
                const overdue = task.dueDate && new Date(task.dueDate) < new Date();
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.46 + i * 0.05 }}
                    className="flex items-center gap-3 px-4 py-3 bg-surface-container-high rounded-xl border border-outline-variant/15 hover:border-outline-variant/35 transition-all group"
                  >
                    <div className={cn('w-2 h-2 rounded-full shrink-0', pCfg.bg.replace('/10', ''))} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.projectTitle && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-30">
                            {task.projectTitle}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className={cn(
                            'text-[9px] font-bold uppercase tracking-widest flex items-center gap-1',
                            overdue ? 'text-error opacity-70' : 'text-on-surface-variant opacity-30'
                          )}>
                            {overdue && <AlertTriangle className="w-2.5 h-2.5" />}
                            {new Date(task.dueDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-md shrink-0', pCfg.color, pCfg.bg)}>
                      {pCfg.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center gap-2 text-center">
              <CheckCircle2 className="w-7 h-7 text-on-surface-variant opacity-15" />
              <p className="text-sm text-on-surface-variant opacity-30">Sin tareas pendientes. ¡Todo al día!</p>
            </div>
          )}
        </motion.div>

        {/* Recent transactions */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46 }}
          className="lg:col-span-6 bg-surface-container border border-outline-variant/35 rounded-2xl p-7"
        >
          <div className="mb-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-35 mb-1">Últimas 5</p>
            <h3 className="font-display text-xl font-bold text-on-surface tracking-tight">Transacciones</h3>
          </div>

          {recentTransactions.length > 0 ? (
            <div className="space-y-2">
              {recentTransactions.map((t: any, i: number) => {
                const isIncome = t.type === 'INCOME';
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    className="flex items-center gap-3 px-4 py-3 bg-surface-container-high rounded-xl border border-outline-variant/15 hover:border-outline-variant/35 transition-all"
                  >
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                      isIncome ? 'bg-emerald-400/10' : 'bg-rose-400/10'
                    )}>
                      {isIncome
                        ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                        : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{t.title}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-30 mt-0.5">
                        {t.category ?? t.type} · {new Date(t.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className={cn('font-mono text-sm font-bold tabular-nums shrink-0', isIncome ? 'text-emerald-400' : 'text-rose-400')}>
                      {isIncome ? '+' : '−'}${fmt(t.amount)}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center gap-2 text-center">
              <Wallet className="w-7 h-7 text-on-surface-variant opacity-15" />
              <p className="text-sm text-on-surface-variant opacity-30">Sin transacciones recientes.</p>
            </div>
          )}

          {/* Focus sessions summary */}
          <div className="mt-5 pt-5 border-t border-outline-variant/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-on-surface-variant opacity-50">Sesiones de enfoque</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-display text-sm font-black text-on-surface">{fmtMin(s.todayFocusMinutes ?? 0)}</p>
                <p className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant opacity-30">Hoy</p>
              </div>
              <div className="w-px h-6 bg-outline-variant/20" />
              <div className="text-right">
                <p className="font-display text-sm font-black text-on-surface">{fmtMin(s.weekFocusMinutes ?? 0)}</p>
                <p className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant opacity-30">Semana</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}