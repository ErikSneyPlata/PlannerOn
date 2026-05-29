// frontend/src/pages/Agenda.tsx
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Calendar as CalendarIcon, Clock, Video, Circle, 
  Briefcase, BookOpen, Coffee, Users, Dumbbell, User,
  ChevronLeft, ChevronRight, Trash2, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, {
  color: string; bg: string; border: string; icon: React.ElementType; label: string;
}> = {
  WORK:     { color: 'text-primary',     bg: 'bg-primary/10',     border: 'border-primary/20',     icon: Briefcase, label: 'Trabajo'    },
  STUDY:    { color: 'text-secondary',   bg: 'bg-secondary/10',   border: 'border-secondary/20',   icon: BookOpen,  label: 'Estudio'    },
  REST:     { color: 'text-tertiary',    bg: 'bg-tertiary/10',    border: 'border-tertiary/20',     icon: Coffee,    label: 'Descanso'   },
  MEETING:  { color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20',   icon: Users,     label: 'Reunión'    },
  EXERCISE: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: Dumbbell,  label: 'Ejercicio'  },
  PERSONAL: { color: 'text-rose-400',    bg: 'bg-rose-400/10',    border: 'border-rose-400/20',    icon: User,      label: 'Personal'   },
};

const getCfg = (cat: string) =>
  CATEGORY_CONFIG[cat] ?? {
    color: 'text-on-surface-variant', bg: 'bg-surface-container-high',
    border: 'border-outline-variant', icon: Circle, label: cat,
  };

function formatDuration(start: string, end: string) {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICK-ADD MODAL
// ─────────────────────────────────────────────────────────────────────────────

function EventModal({
  selectedDate, onClose, onSaved,
}: { selectedDate: Date; onClose: () => void; onSaved: () => void; }) {
  const [title, setTitle]       = useState('');
  const [category, setCategory] = useState('PERSONAL');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime]     = useState('10:00');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startTime || !endTime) return;
    setSaving(true); setError('');
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      await api.agenda.create({
        title, category,
        startDate: new Date(`${dateStr}T${startTime}`).toISOString(),
        endDate:   new Date(`${dateStr}T${endTime}`).toISOString(),
      });
      onSaved(); onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.22 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-surface-container border border-outline-variant/40 rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-outline-variant/20 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-on-surface-variant opacity-40">
              Nuevo evento
            </p>
            <p className="text-sm font-bold text-on-surface mt-0.5">
              {selectedDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-40">Título</label>
            <input
              type="text" placeholder="ej. Reunión de diseño, Gym..."
              value={title} onChange={e => setTitle(e.target.value)}
              required autoFocus
              className="w-full bg-surface-container-low border border-outline-variant/50 focus:border-primary/50 text-on-surface text-sm px-4 py-3 rounded-xl focus:outline-none transition-all placeholder:text-on-surface-variant/25"
            />
          </div>

          {/* Category pills */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-40">Categoría</label>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => {
                const Icon = v.icon;
                const sel = category === k;
                return (
                  <button
                    key={k} type="button" onClick={() => setCategory(k)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all',
                      sel
                        ? cn(v.color, v.bg, v.border)
                        : 'text-on-surface-variant opacity-40 border-outline-variant/20 hover:opacity-70 hover:bg-surface-container-high'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-40">Inicio</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required
                className="w-full bg-surface-container-low border border-outline-variant/50 focus:border-primary/50 text-on-surface text-sm px-4 py-3 rounded-xl focus:outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-40">Fin</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required
                className="w-full bg-surface-container-low border border-outline-variant/50 focus:border-primary/50 text-on-surface text-sm px-4 py-3 rounded-xl focus:outline-none transition-all"
              />
            </div>
          </div>

          {error && <p className="text-xs text-error bg-error/8 border border-error/15 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="submit" disabled={saving}
            className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold text-sm active:scale-[0.98] transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            {saving
              ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 block rounded-full border-2 border-on-primary/30 border-t-on-primary animate-spin" />Guardando...</span>
              : 'Programar evento'
            }
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export default function Agenda() {
  // Sync date with Calendar via localStorage
  const getInitialDate = () => {
    try {
      const stored = localStorage.getItem('agenda-selected-date');
      if (stored) { localStorage.removeItem('agenda-selected-date'); return new Date(stored); }
    } catch {}
    return new Date();
  };

  const [selectedDate, setSelectedDate] = useState<Date>(getInitialDate);
  const [weekOffset, setWeekOffset]     = useState(0);
  const [events, setEvents]             = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [deletingId, setDeletingId]     = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const data = await api.agenda.list();
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch events', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, []);

  // ── Week days ──
  const getWeekDays = () => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    const day = base.getDay();
    const diff = base.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(new Date(base).setDate(diff));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };
  const weekDays = getWeekDays();

  // Week label
  const weekLabel = () => {
    const first = weekDays[0], last = weekDays[6];
    if (first.getMonth() === last.getMonth())
      return `${first.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}`;
    return `${first.toLocaleDateString('es-CO', { month: 'short' })} – ${last.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}`;
  };

  // Count events per day for dots
  const eventsOnDay = (d: Date) =>
    events.filter(e => new Date(e.startDate).toDateString() === d.toDateString());

  const filteredEvents = events
    .filter(e => new Date(e.startDate).toDateString() === selectedDate.toDateString())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await (api.agenda as any).delete(id);
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-surface-container-highest border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-gutter pb-12">

      <AnimatePresence>
        {showModal && (
          <EventModal
            selectedDate={selectedDate}
            onClose={() => setShowModal(false)}
            onSaved={fetchEvents}
          />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-primary opacity-70 mb-1.5">Timeline</p>
          <h2 className="font-display text-4xl font-black text-on-surface tracking-tighter leading-none">Agenda</h2>
          <p className="text-sm text-on-surface-variant opacity-50 mt-2">Tu camino cronológico a través del día.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-primary text-on-primary shadow-md shadow-primary/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Programar
        </button>
      </div>

      {/* ── Week navigator ── */}
      <div className="bg-surface-container border border-outline-variant/20 rounded-2xl p-3">
        {/* Week header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-50 capitalize">
              {weekLabel()}
            </span>
            {weekOffset !== 0 && (
              <button
                onClick={() => { setWeekOffset(0); setSelectedDate(new Date()); }}
                className="text-[9px] font-bold text-primary opacity-60 hover:opacity-100 transition-opacity px-2 py-0.5 bg-primary/10 rounded-md"
              >
                Hoy
              </button>
            )}
          </div>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days row */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((date, idx) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday    = date.toDateString() === new Date().toDateString();
            const dayEvents  = eventsOnDay(date);

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  'flex flex-col items-center py-3 px-1 rounded-xl transition-all duration-200 relative',
                  isSelected
                    ? 'bg-primary text-on-primary shadow-md shadow-primary/25'
                    : isToday
                    ? 'bg-primary/8 text-primary'
                    : 'hover:bg-surface-container-high text-on-surface-variant'
                )}
              >
                <span className={cn(
                  'text-[9px] font-black uppercase tracking-widest mb-1',
                  isSelected ? 'text-on-primary/80' : 'opacity-40'
                )}>
                  {date.toLocaleDateString('es-CO', { weekday: 'short' })}
                </span>
                <span className={cn(
                  'font-display text-lg font-black tabular-nums leading-none',
                  isSelected ? 'text-on-primary' : isToday ? 'text-primary' : 'text-on-surface'
                )}>
                  {date.getDate()}
                </span>
                {/* Event dots */}
                <div className="flex gap-0.5 mt-1.5 h-1.5">
                  {dayEvents.slice(0, 3).map((ev, i) => {
                    const cfg = getCfg(ev.category);
                    return (
                      <span
                        key={i}
                        className={cn('w-1 h-1 rounded-full', isSelected ? 'bg-on-primary/60' : cfg.bg.replace('/10', ''))}
                      />
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Date header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-35 leading-none mb-1">
              Vista diaria
            </p>
            <p className="text-base font-black text-on-surface tracking-tight capitalize">
              {selectedDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        <span className={cn(
          'text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl',
          filteredEvents.length > 0
            ? 'text-primary bg-primary/10 border border-primary/20'
            : 'text-on-surface-variant opacity-30 bg-surface-container'
        )}>
          {filteredEvents.length} {filteredEvents.length === 1 ? 'evento' : 'eventos'}
        </span>
      </div>

      {/* ── Timeline ── */}
      <div className="relative">
        {filteredEvents.length > 0 && (
          <div className="absolute left-[76px] top-5 bottom-5 w-px hidden md:block">
            <div className="h-full bg-gradient-to-b from-primary/50 via-outline-variant/15 to-transparent" />
          </div>
        )}

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredEvents.map((item, i) => {
              const cfg = getCfg(item.category);
              const Icon = cfg.icon;
              const isDeleting = deletingId === item.id;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: isDeleting ? 0.4 : 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, height: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.28 }}
                  className="relative flex gap-5 md:gap-0 group"
                >
                  {/* Time column */}
                  <div className="hidden md:flex flex-col items-end justify-start w-[68px] shrink-0 pt-4 pr-4">
                    <span className="text-[10px] font-bold tabular-nums text-on-surface-variant opacity-60 leading-none">
                      {timeStr(item.startDate)}
                    </span>
                    <span className="text-[9px] font-bold tabular-nums text-on-surface-variant opacity-25 leading-none mt-0.5">
                      {timeStr(item.endDate)}
                    </span>
                  </div>

                  {/* Node */}
                  <div className="absolute left-[67px] top-[18px] z-10 hidden md:block">
                    <div className={cn('w-3.5 h-3.5 rounded-full border-2 border-background flex items-center justify-center', cfg.bg)}>
                      <div className={cn('w-1.5 h-1.5 rounded-full', cfg.bg.replace('/10', ''))} />
                    </div>
                  </div>

                  {/* Card */}
                  <div className={cn(
                    'flex-1 md:ml-7 bg-surface-container border rounded-2xl p-5 relative overflow-hidden',
                    'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5',
                    cfg.border.replace('/20', '/15')
                  )}>
                    {/* Left stripe */}
                    <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl', cfg.bg.replace('/10', '/50'))} />

                    <div className="flex items-start justify-between gap-4 pl-3">
                      <div className="space-y-2 flex-1 min-w-0">
                        {/* Category chip + mobile time */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-bold uppercase tracking-widest',
                            cfg.color, cfg.bg, cfg.border
                          )}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </div>
                          <span className="md:hidden text-[9px] font-bold text-on-surface-variant opacity-40 tabular-nums">
                            {timeStr(item.startDate)} – {timeStr(item.endDate)}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="font-display text-lg font-black text-on-surface tracking-tight leading-snug">
                          {item.title}
                        </h4>

                        {/* Meta row */}
                        <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-40">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {formatDuration(item.startDate, item.endDate)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={isDeleting}
                          className="p-2 rounded-xl text-on-surface-variant opacity-0 group-hover:opacity-25 hover:!opacity-80 hover:text-rose-400 hover:bg-rose-400/10 transition-all"
                        >
                          {isDeleting
                            ? <span className="w-4 h-4 block rounded-full border-2 border-rose-400/30 border-t-rose-400 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                        <button className={cn(
                          'w-9 h-9 rounded-full border flex items-center justify-center transition-all',
                          'border-outline-variant/30 text-on-surface-variant/25',
                          'hover:border-emerald-400 hover:text-emerald-400 hover:bg-emerald-400/8'
                        )}>
                          <Circle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredEvents.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 bg-surface-container/30 rounded-2xl border-2 border-dashed border-outline-variant/15 flex flex-col items-center justify-center gap-4 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-surface-container border border-outline-variant/20 flex items-center justify-center">
                <CalendarIcon className="w-7 h-7 text-on-surface-variant opacity-15" />
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface opacity-25 tracking-tight">Sin eventos para este día</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-20 mt-1">
                  Disfruta tu tiempo libre
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60 hover:opacity-100 transition-opacity"
              >
                + Programar algo
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}