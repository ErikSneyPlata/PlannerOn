// frontend/src/pages/Calendar.tsx
import  { useState, useEffect, useCallback } from 'react';
import {
  Plus, ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store/useStore';
import { api } from '../lib/api';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';

import { useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — matches Agenda's CATEGORY_CONFIG exactly
// ─────────────────────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, { dot: string; pill: string; text: string }> = {
  WORK:     { dot: 'bg-primary',     pill: 'bg-primary/15 text-primary',         text: 'Trabajo'   },
  STUDY:    { dot: 'bg-secondary',   pill: 'bg-secondary/15 text-secondary',     text: 'Estudio'   },
  REST:     { dot: 'bg-tertiary',    pill: 'bg-tertiary/15 text-tertiary',       text: 'Descanso'  },
  MEETING:  { dot: 'bg-amber-400',   pill: 'bg-amber-400/15 text-amber-400',    text: 'Reunión'   },
  EXERCISE: { dot: 'bg-emerald-400', pill: 'bg-emerald-400/15 text-emerald-400',text: 'Ejercicio' },
  PERSONAL: { dot: 'bg-rose-400',    pill: 'bg-rose-400/15 text-rose-400',      text: 'Personal'  },
};
const getCat = (c: string) => CAT_COLORS[c] ?? { dot: 'bg-on-surface-variant', pill: 'bg-surface-container text-on-surface-variant', text: c };

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDuration(start: string, end: string) {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export default function Calendar() {
  const { setCurrentPage } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [events, setEvents]           = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);

  const navigate = useNavigate();

  const fetchEvents = useCallback(async () => {
    try {
      const data = await api.agenda.list();
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch agenda events', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, []);

  // ── Calendar grid ──
  const monthStart = startOfMonth(currentDate);
  const monthEnd   = endOfMonth(monthStart);
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd    = endOfWeek(monthEnd,   { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsOnDay = (d: Date) =>
    events.filter(e => isSameDay(new Date(e.startDate), d))
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const selectedEvents = eventsOnDay(selectedDay);
  const todayEvents    = eventsOnDay(new Date());

  // Navigate to Agenda with selected date
  const openInAgenda = (d: Date) => {
    localStorage.setItem('agenda-selected-date', d.toISOString());
    navigate('/agenda');
  };

  const handleDayClick = (d: Date) => {
    setSelectedDay(d);
    if (!isSameMonth(d, currentDate)) setCurrentDate(d);
  };

  return (
    <div className="space-y-gutter pb-12">

      {/* ── Header ── */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-primary opacity-70 mb-1.5">
            Plano temporal
          </p>
          <h2 className="font-display text-4xl font-black text-on-surface tracking-tighter leading-none">
            Calendario
          </h2>
          <p className="text-sm text-on-surface-variant opacity-50 mt-2">
            Vista mensual de todos tus eventos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month navigator */}
          <div className="flex items-center bg-surface-container border border-outline-variant/30 rounded-xl p-1">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-4 min-w-[148px] flex items-center justify-center">
              <span className="text-[11px] font-black uppercase tracking-widest capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </span>
            </div>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => openInAgenda(selectedDay)}
            className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-primary/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Evento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-card-gap items-start">

        {/* ── Main calendar grid ── */}
        <div className="lg:col-span-5 bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-outline-variant/10">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
              <div key={d} className="py-3.5 text-center">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-35">{d}</span>
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayEvs    = eventsOnDay(day);
              const isToday   = isSameDay(day, new Date());
              const isSel     = isSameDay(day, selectedDay);
              const inMonth   = isSameMonth(day, monthStart);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;

              return (
                <div
                    key={i}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleDayClick(day)}
                  className={cn(
                    'relative flex flex-col items-start p-2.5 border-r border-b border-outline-variant/8',
                    'transition-all duration-150 text-left min-h-[88px] group',
                    !inMonth && 'opacity-25',
                    isSel ? 'bg-primary/6 border-primary/10' : 'hover:bg-surface-container-high',
                    isWeekend && inMonth && !isSel && 'bg-surface-container-highest/20',
                  )}
                >
                  {/* Day number */}
                  <span className={cn(
                    'w-7 h-7 flex items-center justify-center rounded-lg font-display text-sm font-black mb-1.5 transition-all',
                    isToday  ? 'bg-primary text-on-primary shadow-md shadow-primary/30'
                    : isSel  ? 'bg-primary/15 text-primary'
                    :          'text-on-surface group-hover:bg-surface-container-highest'
                  )}>
                    {format(day, 'd')}
                  </span>

                  {/* Event pills */}
                  <div className="space-y-0.5 w-full overflow-hidden">
                    {dayEvs.slice(0, 2).map(ev => {
                      const cat = getCat(ev.category);
                      return (
                        <div key={ev.id} className={cn('text-[8px] font-bold px-1.5 py-0.5 rounded-md truncate w-full', cat.pill)}>
                          {ev.title}
                        </div>
                      );
                    })}
                    {dayEvs.length > 2 && (
                      <div className="text-[8px] font-bold text-on-surface-variant opacity-40 pl-1">
                        +{dayEvs.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Day detail sidebar ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Selected day header */}
          <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className={cn(
                'w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0',
                isSameDay(selectedDay, new Date()) ? 'bg-primary text-on-primary shadow-md shadow-primary/25' : 'bg-surface-container-high text-on-surface'
              )}>
                <span className="text-[9px] font-black uppercase leading-none opacity-70 capitalize">
                  {format(selectedDay, 'EEE', { locale: es })}
                </span>
                <span className="font-display text-xl font-black leading-tight">
                  {format(selectedDay, 'd')}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-on-surface tracking-tight capitalize leading-snug">
                  {format(selectedDay, "d 'de' MMMM", { locale: es })}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-40 mt-0.5">
                  {selectedEvents.length === 0 ? 'Sin eventos' : `${selectedEvents.length} evento${selectedEvents.length > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>

            {/* Events list */}
            <AnimatePresence mode="popLayout">
              {selectedEvents.length > 0 ? (
                <div className="space-y-2">
                  {selectedEvents.map((ev, i) => {
                    const cat = getCat(ev.category);
                    return (
                      <motion.div
                        key={ev.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group p-3 bg-surface-container-high rounded-xl border border-outline-variant/15 hover:border-outline-variant/40 transition-all cursor-pointer"
                        onClick={() => openInAgenda(selectedDay)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className={cn('text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md', cat.pill)}>
                            {cat.text}
                          </span>
                          <span className="text-[9px] font-bold tabular-nums text-on-surface-variant opacity-40 shrink-0">
                            {fmtTime(ev.startDate)}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-on-surface leading-snug truncate">{ev.title}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {fmtDuration(ev.startDate, ev.endDate)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                  <button
                    onClick={() => openInAgenda(selectedDay)}
                    className="w-full py-2.5 text-[9px] font-black uppercase tracking-widest text-primary opacity-60 hover:opacity-100 transition-opacity border border-outline-variant/20 rounded-xl hover:border-primary/20 hover:bg-primary/5"
                  >
                    Abrir en Agenda →
                  </button>
                </div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-8 border-2 border-dashed border-outline-variant/15 rounded-xl flex flex-col items-center justify-center gap-2 text-center"
                >
                  <p className="text-xs font-bold text-on-surface-variant opacity-25 uppercase tracking-widest">
                    Día libre
                  </p>
                  <button
                    onClick={() => openInAgenda(selectedDay)}
                    className="text-[9px] font-black text-primary opacity-50 hover:opacity-100 transition-opacity"
                  >
                    + Programar evento
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Month summary */}
          <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5 space-y-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-35">
              Resumen del mes
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 rounded-full border-2 border-surface-container-highest border-t-primary animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-end gap-3">
                  <span className="font-display text-3xl font-black text-on-surface">
                    {events.filter(e => isSameMonth(new Date(e.startDate), currentDate)).length}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-40 mb-1.5">
                    eventos este mes
                  </span>
                </div>

                {/* Category breakdown */}
                <div className="space-y-1.5">
                  {Object.entries(CAT_COLORS).map(([key, cfg]) => {
                    const count = events.filter(e =>
                      e.category === key && isSameMonth(new Date(e.startDate), currentDate)
                    ).length;
                    if (count === 0) return null;
                    const total = events.filter(e => isSameMonth(new Date(e.startDate), currentDate)).length;
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-[9px] font-bold">
                          <span className="text-on-surface-variant opacity-40 uppercase tracking-widest">{cfg.text}</span>
                          <span className="text-on-surface-variant opacity-40">{count}</span>
                        </div>
                        <div className="h-0.5 bg-surface-container-highest rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className={cn('h-full rounded-full', cfg.dot)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Today quick view — only shown if today has events */}
          {!isSameDay(selectedDay, new Date()) && todayEvents.length > 0 && (
            <div
              className="bg-primary/5 border border-primary/15 rounded-2xl p-5 cursor-pointer hover:bg-primary/8 transition-all"
              onClick={() => { setSelectedDay(new Date()); setCurrentDate(new Date()); }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-primary opacity-80">Hoy</p>
                <span className="text-[9px] font-black text-primary opacity-60">{todayEvents.length} eventos</span>
              </div>
              <p className="text-xs text-on-surface-variant opacity-50 leading-relaxed">
                Tienes <span className="text-on-surface font-bold">{todayEvents[0]?.title}</span>
                {todayEvents.length > 1 ? ` y ${todayEvents.length - 1} más.` : '.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}