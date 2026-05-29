// frontend/src/pages/Habits.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Repeat, CalendarCheck, Pencil, Trash2,
  X, Check, AlertCircle, Flame, Zap, Moon,
  Sun, Coffee, Dumbbell, BookOpen, Heart, Target,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const FREQ_CFG: Record<string, {
  label: string; color: string; bg: string; border: string; dot: string;
}> = {
  daily:   { label: 'Diario',   color: 'text-primary',     bg: 'bg-primary/10',     border: 'border-primary/20',     dot: 'bg-primary'     },
  weekly:  { label: 'Semanal',  color: 'text-secondary',   bg: 'bg-secondary/10',   border: 'border-secondary/20',   dot: 'bg-secondary'   },
  monthly: { label: 'Mensual',  color: 'text-tertiary',    bg: 'bg-tertiary/10',    border: 'border-tertiary/20',    dot: 'bg-tertiary'    },
};

// Suggested icons the user can pick for the habit card accent
const HABIT_ICONS = [
  { id: 'repeat',   icon: Repeat,    label: 'General'    },
  { id: 'sun',      icon: Sun,       label: 'Mañana'     },
  { id: 'moon',     icon: Moon,      label: 'Noche'      },
  { id: 'dumbbell', icon: Dumbbell,  label: 'Ejercicio'  },
  { id: 'book',     icon: BookOpen,  label: 'Lectura'    },
  { id: 'heart',    icon: Heart,     label: 'Salud'      },
  { id: 'coffee',   icon: Coffee,    label: 'Rutina'     },
  { id: 'target',   icon: Target,    label: 'Meta'       },
  { id: 'zap',      icon: Zap,       label: 'Energía'    },
  { id: 'flame',    icon: Flame,     label: 'Racha'      },
];

const getIcon = (id?: string) =>
  HABIT_ICONS.find(h => h.id === id)?.icon ?? Repeat;

// Generar las fechas para los últimos 7 días en zona horaria local
export function getPastNDates(n: number = 7): { dateString: string; label: string; dayNum: number }[] {
  const dates = [];
  const daysOfWeek = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    dates.push({
      dateString,
      label: daysOfWeek[d.getDay()],
      dayNum: d.getDate(),
    });
  }
  return dates;
}

// Calcular la racha consecutiva hacia atrás partiendo desde hoy o ayer
export function calculateCurrentStreak(logs: { date: string; completed: boolean }[]): number {
  if (!logs || logs.length === 0) return 0;

  // Filtrar logs completados y crear un Set para búsqueda rápida
  const completedSet = new Set(
    logs.filter(log => log.completed).map(log => log.date)
  );

  let streak = 0;
  const currentDate = new Date();

  const getFormatted = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getFormatted(currentDate);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getFormatted(yesterday);

  // Si no está registrado hoy ni ayer como completado, la racha consecutiva es 0
  if (!completedSet.has(todayStr) && !completedSet.has(yesterdayStr)) {
    return 0;
  }

  // Empezar desde hoy si está completo, sino desde ayer
  let testDate = completedSet.has(todayStr) ? currentDate : yesterday;

  while (true) {
    const testStr = getFormatted(testDate);
    if (completedSet.has(testStr)) {
      streak++;
      testDate = new Date(testDate);
      testDate.setDate(testDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// ─────────────────────────────────────────────────────────────────────────────
// HABIT MODAL  (Create + Edit)
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FORM = { title: '', description: '', frequency: 'daily', iconId: 'repeat' };

function HabitModal({
  habit, onClose, onSaved,
}: {
  habit?: any | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!habit;
  const [form, setForm] = useState(() =>
    habit
      ? {
          title:       habit.title ?? '',
          description: habit.description ?? '',
          frequency:   habit.frequency ?? 'daily',
          iconId:      habit.iconId ?? 'repeat',
        }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true); setError('');
    try {
      const payload = {
        title:       form.title.trim(),
        description: form.description || null,
        frequency:   form.frequency,
      };
      if (isEdit) await api.habits.update(habit.id, payload);
      else        await api.habits.create(payload);
      onSaved(); onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const inp = "w-full bg-surface-container-low border border-outline-variant/50 focus:border-primary/60 text-on-surface text-sm px-4 py-3 rounded-xl focus:outline-none transition-all placeholder:text-on-surface-variant/25";
  const lbl = "text-[9px] font-bold uppercase tracking-[0.22em] text-on-surface-variant opacity-40";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-surface-container border border-outline-variant/40 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-outline-variant/20 flex items-center justify-between">
          <div>
            <p className={cn(lbl, 'mb-0.5')}>{isEdit ? 'Editar hábito' : 'Nuevo hábito'}</p>
            <h3 className="font-display text-lg font-black text-on-surface tracking-tight">
              {isEdit ? habit.title : 'Crear hábito'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Title */}
          <div className="space-y-1.5">
            <label className={lbl}>Nombre del hábito *</label>
            <input
              type="text" placeholder="ej. Meditación matutina, Leer 20 minutos..."
              value={form.title} onChange={e => set('title', e.target.value)}
              required autoFocus className={inp}
            />
          </div>

          {/* Frequency pills */}
          <div className="space-y-1.5">
            <label className={lbl}>Frecuencia</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(FREQ_CFG).map(([k, v]) => (
                <button
                  key={k} type="button" onClick={() => set('frequency', k)}
                  className={cn(
                    'flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all',
                    form.frequency === k
                      ? cn(v.color, v.bg, v.border)
                      : 'text-on-surface-variant opacity-40 border-outline-variant/25 hover:opacity-70 hover:bg-surface-container-high'
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', form.frequency === k ? v.dot : 'bg-on-surface-variant/30')} />
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div className="space-y-1.5">
            <label className={lbl}>Ícono</label>
            <div className="grid grid-cols-5 gap-1.5">
              {HABIT_ICONS.map(({ id, icon: Icon, label }) => (
                <button
                  key={id} type="button" onClick={() => set('iconId', id)}
                  title={label}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all',
                    form.iconId === id
                      ? 'text-primary bg-primary/10 border-primary/20'
                      : 'text-on-surface-variant opacity-35 border-outline-variant/20 hover:opacity-60 hover:bg-surface-container-high'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[8px] font-bold leading-none">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className={lbl}>¿Por qué es importante? (opcional)</label>
            <textarea
              placeholder="Tu motivación, contexto o meta detrás de este hábito..."
              value={form.description} onChange={e => set('description', e.target.value)}
              className={cn(inp, 'resize-none min-h-[72px]')}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-error bg-error/8 border border-error/15 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-container-high transition-all border border-outline-variant/30"
            >
              Cancelar
            </button>
            <button type="submit" disabled={saving || !form.title.trim()}
              className="flex items-center gap-2 bg-primary text-on-primary px-7 py-2.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all shadow-md shadow-primary/20 disabled:opacity-50"
            >
              {saving
                ? <><span className="w-4 h-4 rounded-full border-2 border-on-primary/30 border-t-on-primary animate-spin" />Guardando...</>
                : isEdit
                  ? <><Check className="w-4 h-4" />Guardar cambios</>
                  : <><Plus className="w-4 h-4" />Crear hábito</>
              }
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HABIT CARD
// ─────────────────────────────────────────────────────────────────────────────

function HabitCard({
  habit, index, onEdit, onDelete, onLogToggle,
}: {
  habit: any;
  index: number;
  onEdit: (h: any) => void;
  onDelete: (id: string) => void;
  onLogToggle: (habitId: string, dateStr: string, completed: boolean) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const freqCfg  = FREQ_CFG[habit.frequency] ?? FREQ_CFG.daily;
  const HabitIcon = getIcon(habit.iconId);
  const streak   = calculateCurrentStreak(habit.logs ?? []);
  const pastDates = getPastNDates(7);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.habits.delete(habit.id);
      onDelete(habit.id);
    } catch (err) {
      console.error('Delete failed', err);
      setDeleting(false);
      setConfirming(false);
    }
  };

  const handleToggleDate = async (dateStr: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    // Optimistic state transition
    onLogToggle(habit.id, dateStr, newStatus);
    
    try {
      await api.habits.log(habit.id, { date: dateStr, completed: newStatus });
    } catch (err) {
      console.error('Failed to log habit:', err);
      // Rollback on failure
      onLogToggle(habit.id, dateStr, currentStatus);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.06, duration: 0.3, ease: 'easeOut' }}
      className="group relative bg-surface-container border border-outline-variant/35 hover:border-outline-variant/70 rounded-2xl p-5 flex flex-col gap-4 min-h-[200px] transition-all duration-300 overflow-hidden"
    >
      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/4 via-transparent to-transparent pointer-events-none rounded-2xl" />

      {/* Delete confirm overlay */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 bg-surface-container-high/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-4 p-6 text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-error" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface leading-snug">¿Eliminar "{habit.title}"?</p>
              <p className="text-[10px] text-on-surface-variant opacity-40 mt-1">Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant/40 text-xs font-bold text-on-surface-variant hover:bg-surface-container-highest transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-error text-white text-xs font-bold active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {deleting
                  ? <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : <><Trash2 className="w-3.5 h-3.5" />Eliminar</>
                }
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOP ROW ── */}
      <div className="flex items-start justify-between gap-2">
        {/* Icon + frequency */}
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', freqCfg.bg)}>
            <HabitIcon className={cn('w-5 h-5', freqCfg.color)} />
          </div>
          <div>
            <h3 className="font-display text-base font-black text-on-surface tracking-tight group-hover:text-primary transition-colors leading-tight">
              {habit.title}
            </h3>
            <span className={cn(
              'text-[9px] font-bold uppercase tracking-widest',
              freqCfg.color, 'opacity-70'
            )}>
              {freqCfg.label}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => onEdit(habit)}
            className="p-1.5 rounded-lg text-on-surface-variant opacity-0 group-hover:opacity-25 hover:!opacity-80 hover:bg-surface-container-high transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setConfirming(true)}
            className="p-1.5 rounded-lg text-on-surface-variant opacity-0 group-hover:opacity-25 hover:!opacity-80 hover:text-error hover:bg-error/8 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Description */}
      {habit.description && (
        <p className="text-xs text-on-surface-variant opacity-45 leading-relaxed line-clamp-2 -mt-1">
          {habit.description}
        </p>
      )}

      {/* ── INTERACTIVE PAST 7 DAYS TRACKER ── */}
      <div className="flex-1 flex flex-col justify-end gap-3 mt-1">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant opacity-30">
              Últimos 7 días (clic para marcar)
            </span>
            <span className={cn('text-[9px] font-bold flex items-center gap-1', streak > 0 ? freqCfg.color : 'text-on-surface-variant opacity-30')}>
              <Flame className={cn("w-2.5 h-2.5", streak > 0 && "animate-bounce")} />
              {streak}d de racha
            </span>
          </div>
          <div className="flex gap-1.5">
            {pastDates.map(({ dateString, label, dayNum }) => {
              const logEntry = (habit.logs ?? []).find((l: any) => l.date === dateString);
              const isCompleted = logEntry ? logEntry.completed : false;

              return (
                <button
                  key={dateString}
                  type="button"
                  onClick={() => handleToggleDate(dateString, isCompleted)}
                  className={cn(
                    'flex-1 flex flex-col items-center justify-center py-2 rounded-xl border transition-all duration-200 relative select-none cursor-pointer',
                    isCompleted
                      ? cn(freqCfg.bg, freqCfg.border, 'border-current scale-102')
                      : 'bg-surface-container-highest/60 border-outline-variant/15 hover:border-outline-variant/40 hover:bg-surface-container-highest'
                  )}
                  title={`${label} ${dayNum}`}
                >
                  <span className={cn(
                    'text-[8px] font-bold uppercase tracking-wider',
                    isCompleted ? freqCfg.color : 'text-on-surface-variant/40'
                  )}>
                    {label}
                  </span>
                  <span className={cn(
                    'text-xs font-black mt-0.5',
                    isCompleted ? freqCfg.color : 'text-on-surface-variant/70'
                  )}>
                    {dayNum}
                  </span>
                  {isCompleted && (
                    <span className={cn("absolute bottom-1 w-1.5 h-1.5 rounded-full", freqCfg.dot)} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-outline-variant/15">
          <div className="flex items-center gap-1.5 text-on-surface-variant opacity-30">
            <CalendarCheck className="w-3 h-3" />
            <span className="text-[9px] font-bold uppercase tracking-widest">
              Desde {new Date(habit.createdAt).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}
            </span>
          </div>
          <span className="text-[9px] font-bold text-on-surface-variant opacity-40">
            { (habit.logs ?? []).filter((l: any) => l.completed).length } completados
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS STRIP
// ─────────────────────────────────────────────────────────────────────────────

function StatsStrip({ habits }: { habits: any[] }) {
  const daily   = habits.filter(h => h.frequency === 'daily').length;
  const maxStreak = habits.length > 0
    ? Math.max(...habits.map(h => calculateCurrentStreak(h.logs ?? [])))
    : 0;

  const todayStr = new Date().getFullYear() + '-' + 
    String(new Date().getMonth() + 1).padStart(2, '0') + '-' + 
    String(new Date().getDate()).padStart(2, '0');
    
  const completedToday = habits.filter(h => 
    (h.logs ?? []).some((l: any) => l.date === todayStr && l.completed)
  ).length;

  if (habits.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: 'Total hábitos', value: habits.length,  color: 'text-on-surface'    },
        { label: 'Diarios',       value: daily,           color: 'text-primary'       },
        { label: 'Racha más alta', value: `${maxStreak}d`,  color: 'text-emerald-400' },
        { label: 'Completados hoy', value: completedToday,  color: 'text-purple-400' },
      ].map(stat => (
        <div key={stat.label} className="bg-surface-container border border-outline-variant/25 rounded-xl px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant opacity-35 mb-1">
            {stat.label}
          </p>
          <p className={cn('font-display text-2xl font-black tracking-tighter', stat.color)}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

type FilterKey = 'ALL' | 'daily' | 'weekly' | 'monthly';

export default function Habits() {
  const [habits, setHabits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState<'create' | any | null>(null);
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const fetchHabits = useCallback(async () => {
    try {
      const data = await api.habits.list();
      setHabits(data);
    } catch (err) {
      console.error('Failed to fetch habits', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHabits(); }, []);

  const handleDelete = (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  const handleLogToggle = (habitId: string, dateStr: string, completed: boolean) => {
    setHabits(prev => prev.map(h => {
      if (h.id !== habitId) return h;
      
      const logs = [...(h.logs ?? [])];
      const existingIdx = logs.findIndex(l => l.date === dateStr);
      if (existingIdx >= 0) {
        logs[existingIdx] = { ...logs[existingIdx], completed };
      } else {
        logs.push({ date: dateStr, completed, id: 'temp_' + Date.now() });
      }
      return { ...h, logs };
    }));
  };

  const filtered = filter === 'ALL'
    ? habits
    : habits.filter(h => h.frequency === filter);

  const filterTabs: { id: FilterKey; label: string }[] = [
    { id: 'ALL',     label: 'Todos'    },
    { id: 'daily',   label: 'Diarios'  },
    { id: 'weekly',  label: 'Semanales'},
    { id: 'monthly', label: 'Mensuales'},
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-surface-container-highest border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-gutter pb-12">

      {/* ── Modal ── */}
      <AnimatePresence>
        {modal !== null && (
          <HabitModal
            habit={modal === 'create' ? null : modal}
            onClose={() => setModal(null)}
            onSaved={() => { fetchHabits(); setModal(null); }}
          />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-primary opacity-70 mb-1.5">
            Consistency Engine
          </p>
          <h2 className="font-display text-4xl font-black text-on-surface tracking-tighter leading-none">
            Hábitos
          </h2>
          <p className="text-sm text-on-surface-variant opacity-50 mt-2">
            El éxito es la suma de pequeños esfuerzos repetidos día tras día.
          </p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-primary text-on-primary shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Nuevo hábito
        </button>
      </div>

      {/* ── Stats strip ── */}
      <StatsStrip habits={habits} />

      {/* ── Filter tabs ── */}
      {habits.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterTabs.map(tab => {
            const count = tab.id === 'ALL'
              ? habits.length
              : habits.filter(h => h.frequency === tab.id).length;
            if (tab.id !== 'ALL' && count === 0) return null;
            const isActive = filter === tab.id;
            const freqCfg  = tab.id !== 'ALL' ? FREQ_CFG[tab.id] : null;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all',
                  isActive
                    ? freqCfg
                      ? cn(freqCfg.color, freqCfg.bg, freqCfg.border)
                      : 'bg-primary/10 text-primary border-primary/20'
                    : 'text-on-surface-variant opacity-40 border-transparent hover:opacity-70 hover:bg-surface-container-high'
                )}
              >
                {freqCfg && isActive && (
                  <span className={cn('w-1.5 h-1.5 rounded-full', freqCfg.dot)} />
                )}
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    'text-[9px] font-black px-1.5 rounded-md',
                    isActive
                      ? freqCfg ? cn(freqCfg.bg.replace('/10', '/20'), freqCfg.color) : 'bg-primary/20 text-primary'
                      : 'bg-surface-container-high text-on-surface-variant'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-card-gap">
        <AnimatePresence mode="popLayout">
          {filtered.map((habit, i) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              index={i}
              onEdit={h => setModal(h)}
              onDelete={handleDelete}
              onLogToggle={handleLogToggle}
            />
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full py-20 bg-surface-container rounded-2xl border border-dashed border-outline-variant/30 flex flex-col items-center justify-center gap-4 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center">
              <Repeat className="w-6 h-6 text-on-surface-variant opacity-20" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface-variant opacity-30">
                {filter === 'ALL' ? 'Sin hábitos aún.' : `Sin hábitos ${FREQ_CFG[filter]?.label.toLowerCase()}.`}
              </p>
            </div>
            {filter === 'ALL' && (
              <button
                onClick={() => setModal('create')}
                className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60 hover:opacity-100 transition-opacity"
              >
                + Crear el primero
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}