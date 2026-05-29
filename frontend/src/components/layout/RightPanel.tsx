// frontend/src/components/layout/RightPanel.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Timer, CheckSquare, Heart, RotateCcw, X, Settings2,
  Calendar, Play, Pause, CheckCircle2, Flame, Clock,
  TrendingUp, Layers, ChevronRight, Zap, Target,
  AlertCircle, StickyNote, FolderOpen,
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const TIMER_KEY = 'planneron_timer_v2';

const DURATIONS = [
  { label: '5m',  value: 300  },
  { label: '15m', value: 900  },
  { label: '25m', value: 1500 },
  { label: '45m', value: 2700 },
  { label: '60m', value: 3600 },
];

const EVENT_COLORS: Record<string, string> = {
  WORK:     'bg-primary/15 text-primary',
  STUDY:    'bg-secondary/15 text-secondary',
  REST:     'bg-emerald-400/15 text-emerald-400',
  MEETING:  'bg-amber-400/15 text-amber-400',
  EXERCISE: 'bg-rose-400/15 text-rose-400',
  PERSONAL: 'bg-sky-400/15 text-sky-400',
};

const EVENT_LABELS: Record<string, string> = {
  WORK: 'Trabajo', STUDY: 'Estudio', REST: 'Descanso',
  MEETING: 'Reunión', EXERCISE: 'Ejercicio', PERSONAL: 'Personal',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function fmtDuration(secs: number) {
  if (secs < 60)   return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}min`;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function relDate(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'ahora';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// Persist timer state to localStorage
function saveTimer(state: object) {
  try { localStorage.setItem(TIMER_KEY, JSON.stringify({ ...state, ts: Date.now() })); }
  catch {}
}
function loadTimer() {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      totalDuration: number; timeLeft: number; isActive: boolean;
      sessionId?: string | null; taskId?: string | null; ts: number;
    };
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label, count }: {
  icon: React.ElementType; label: string; count?: number;
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-primary opacity-85" />
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant opacity-60">
          {label}
        </span>
      </div>
      {count !== undefined && (
        <span className="text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/5">
          {count}
        </span>
      )}
    </div>
  );
}

function StatPill({ label, value, color = '' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-2.5 bg-surface-container-high/45 rounded-xl border border-outline-variant/10 min-w-0 transition-colors hover:bg-surface-container-high/70">
      <span className={cn('font-display text-sm sm:text-base font-black tabular-nums leading-none tracking-tight', color || 'text-on-surface')}>
        {value}
      </span>
      <span className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant opacity-40 text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FOCUS TIMER
// ─────────────────────────────────────────────────────────────────────────────

interface TimerState {
  totalDuration: number;
  timeLeft: number;
  isActive: boolean;
  sessionId: string | null;
  taskId: string | null;
}

function FocusTimer({ tasks, onSessionSaved }: {
  tasks: any[];
  onSessionSaved: () => void;
}) {
  // Restore from localStorage on mount
  const saved = loadTimer();

  const [state, setState] = useState<TimerState>(() => {
    if (saved) {
      let tl = saved.timeLeft;
      if (saved.isActive && saved.ts) {
        const elapsed = Math.floor((Date.now() - saved.ts) / 1000);
        tl = Math.max(0, tl - elapsed);
      }
      return {
        totalDuration: saved.totalDuration ?? 1500,
        timeLeft:      tl,
        isActive:      saved.isActive && tl > 0,
        sessionId:     saved.sessionId ?? null,
        taskId:        saved.taskId    ?? null,
      };
    }
    return { totalDuration: 1500, timeLeft: 1500, isActive: false, sessionId: null, taskId: null };
  });

  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeFocusTaskId = useAppStore(state => state.activeFocusTaskId);
  const setActiveFocusTaskId = useAppStore(state => state.setActiveFocusTaskId);

  // Sync with global focused task triggers
  useEffect(() => {
    if (activeFocusTaskId) {
      setState(prev => ({
        ...prev,
        taskId: activeFocusTaskId,
        ...(prev.sessionId && prev.taskId !== activeFocusTaskId ? { sessionId: null, timeLeft: prev.totalDuration, isActive: false } : {})
      }));
      setActiveFocusTaskId(null);
    }
  }, [activeFocusTaskId, setActiveFocusTaskId]);

  // Persist on every state change
  useEffect(() => { saveTimer(state); }, [state]);

  // Tick
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (state.isActive && state.timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setState(prev => {
          if (prev.timeLeft <= 1) {
            clearInterval(intervalRef.current!);
            handleComplete({ ...prev, timeLeft: 0, isActive: false });
            return { ...prev, timeLeft: 0, isActive: false };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.isActive]);

  // ── Actions ──

  const handleStart = async () => {
    if (state.isActive) {
      // Pause — just stop the timer locally, session stays open
      setState(prev => {
        const nextState = { ...prev, isActive: false };
        try {
          localStorage.setItem(TIMER_KEY, JSON.stringify({ ...nextState, ts: Date.now() }));
        } catch {}
        return nextState;
      });
      return;
    }

    if (!state.sessionId) {
      // Create a new session in DB
      try {
        const session = await api.focus.create({
          duration:  state.totalDuration,
          completed: false,
          taskId:    state.taskId || null,
        });
        setState(prev => {
          const nextState = { ...prev, isActive: true, sessionId: session.id };
          try {
            localStorage.setItem(TIMER_KEY, JSON.stringify({ ...nextState, ts: Date.now() }));
          } catch {}
          return nextState;
        });
      } catch {
        // Fallback: run locally without DB record
        setState(prev => {
          const nextState = { ...prev, isActive: true };
          try {
            localStorage.setItem(TIMER_KEY, JSON.stringify({ ...nextState, ts: Date.now() }));
          } catch {}
          return nextState;
        });
      }
    } else {
      setState(prev => {
        const nextState = { ...prev, isActive: true };
        try {
          localStorage.setItem(TIMER_KEY, JSON.stringify({ ...nextState, ts: Date.now() }));
        } catch {}
        return nextState;
      });
    }
  };

  const handleComplete = async (finalState?: TimerState) => {
    const s = finalState ?? state;
    if (!s.sessionId) return;
    setSaving(true);
    const elapsed = s.totalDuration - s.timeLeft;

    // Immediately stop the timer interface & persist so it feels instant
    const completedState = {
      ...s,
      timeLeft:      0,
      isActive:      false,
      sessionId:     null,
    };
    try {
      localStorage.setItem(TIMER_KEY, JSON.stringify({ ...completedState, ts: Date.now() }));
    } catch {}
    setState(completedState);

    try {
      await api.focus.complete(s.sessionId, { duration: Math.max(elapsed, 1) });

      // Update the task actualTime if a task is linked!
      if (s.taskId) {
        const currentTask = tasks.find(t => t.id === s.taskId);
        if (currentTask) {
          const minutesToAdd = Math.max(1, Math.round(elapsed / 60));
          const newActualTime = (currentTask.actualTime ?? 0) + minutesToAdd;
          await api.tasks.update(s.taskId, {
            actualTime: newActualTime,
          });
          // Notify active pages to refresh tasks list
          useAppStore.getState().triggerTasksRefresh();
        }
      }

      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 3000);
      onSessionSaved();
    } catch (err) {
      console.error('Failed to complete session', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    // Capture state values before resetting
    const activeSessionId = state.sessionId;
    const elapsed = state.totalDuration - state.timeLeft;
    const activeTaskId = state.taskId;

    // Reset state and persist immediately so UI changes are visual and crisp instantly
    const resetState = {
      totalDuration: state.totalDuration,
      timeLeft:      state.totalDuration,
      isActive:      false,
      sessionId:     null,
      taskId:        state.taskId,
    };

    try {
      localStorage.setItem(TIMER_KEY, JSON.stringify({ ...resetState, ts: Date.now() }));
    } catch {}
    
    setState(resetState);

    // If there's an open session, we either complete it (if elapsed > 30s) or delete it (if elapsed < 30s) in the background
    if (activeSessionId) {
      if (elapsed > 30) {
        try {
          await api.focus.complete(activeSessionId, { duration: elapsed });

          // Also update the task actualTime if a task is linked
          if (activeTaskId) {
            const currentTask = tasks.find(t => t.id === activeTaskId);
            if (currentTask) {
              const minutesToAdd = Math.max(1, Math.round(elapsed / 60));
              const newActualTime = (currentTask.actualTime ?? 0) + minutesToAdd;
              await api.tasks.update(activeTaskId, {
                actualTime: newActualTime,
              });
              useAppStore.getState().triggerTasksRefresh();
            }
          }

          onSessionSaved();
        } catch (err) {
          console.error('Failed to complete session during reset', err);
        }
      } else {
        try {
          await api.focus.delete(activeSessionId);
          onSessionSaved();
        } catch (err) {
          console.error('Failed to delete session during reset', err);
        }
      }
    }
  };

  const handleSetDuration = (val: number) => {
    if (state.sessionId) handleReset();
    setState(prev => {
      const nextState = { ...prev, totalDuration: val, timeLeft: val, isActive: false, sessionId: null };
      try {
        localStorage.setItem(TIMER_KEY, JSON.stringify({ ...nextState, ts: Date.now() }));
      } catch {}
      return nextState;
    });
    setShowSettings(false);
  };

  const handleTaskSelect = (taskId: string | null) => {
    setState(prev => ({ ...prev, taskId }));
  };

  const progress = ((state.totalDuration - state.timeLeft) / state.totalDuration) * 100;
  const circumference = 2 * Math.PI * 42;

  return (
    <div className={cn(
      "bg-surface-container/40 rounded-2xl border transition-all duration-300 overflow-hidden",
      state.isActive 
        ? "border-primary/40 shadow-[0_0_15px_rgba(173,198,255,0.06)]" 
        : "border-outline-variant/15"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/10">
        <div className="flex items-center gap-1.5">
          <Timer className={cn("w-3.5 h-3.5 transition-colors", state.isActive ? "text-primary" : "text-on-surface-variant")} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">
            Temporizador
          </span>
          {state.sessionId && (
            <span className="flex items-center gap-1 text-[8px] font-black text-emerald-400 ml-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ACTIVO
            </span>
          )}
        </div>
        <button
          onClick={() => setShowSettings(s => !s)}
          className={cn(
            'p-1.5 rounded-lg transition-all',
            showSettings ? 'bg-primary/15 text-primary' : 'text-on-surface-variant/40 hover:bg-surface-container-high hover:text-on-surface-variant',
          )}
          title="Ajustes de Sesión"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-4 py-4 flex flex-col items-center gap-4">
        <AnimatePresence mode="wait">
          {showSettings ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="w-full space-y-3"
            >
              {/* Duration picker */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-40 mb-2">Duración de foco</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {DURATIONS.map(d => (
                    <button
                      key={d.value}
                      onClick={() => handleSetDuration(d.value)}
                      className={cn(
                        'py-1.5 rounded-lg text-[10px] font-black tracking-wider transition-all border',
                        state.totalDuration === d.value
                          ? 'bg-primary border-primary text-on-primary shadow-sm shadow-primary/20'
                          : 'border-outline-variant/30 hover:bg-surface-container-high text-on-surface-variant',
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Task selector */}
              {tasks.length > 0 && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-40 mb-1.5">
                    Vincular a Tarea
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar pr-0.5">
                    <button
                      onClick={() => handleTaskSelect(null)}
                      className={cn(
                        'w-full text-left text-[11px] font-bold px-3 py-2 rounded-lg transition-all border block shrink-0',
                        !state.taskId
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high',
                      )}
                    >
                      Ninguna tarea (Genérico)
                    </button>
                    {tasks.slice(0, 5).map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleTaskSelect(t.id)}
                        className={cn(
                          'w-full text-left text-[11px] font-bold px-3 py-2 rounded-lg transition-all border truncate block shrink-0',
                          state.taskId === t.id
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high',
                        )}
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="timer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center gap-3.5 w-full"
            >
              {/* Ring */}
              <div className="relative w-28 h-28">
                <svg className="absolute inset-0 -rotate-90 w-28 h-28" viewBox="0 0 100 100">
                  {/* Track with soft translucent container color */}
                  <circle cx="50" cy="50" r="42" fill="none"
                    stroke="currentColor" strokeWidth="4.5"
                    className="text-surface-container-highest/20" />
                  {/* Progress with ambient primary glow if active */}
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke={progress === 100 ? '#10b981' : 'var(--color-primary)'}
                    strokeWidth="4.5" strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (circumference * progress) / 100}
                    className="transition-all duration-1000"
                    style={{
                      filter: state.isActive && progress < 100 
                        ? 'drop-shadow(0 0 4px var(--color-primary))' 
                        : 'none'
                    }}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <AnimatePresence mode="wait">
                    {justCompleted ? (
                      <motion.div
                        key="done"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="flex flex-col items-center gap-0.5"
                      >
                        <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest leading-none">¡Foco!</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="time"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center"
                      >
                        <span className="font-display text-2xl font-black text-on-surface tracking-tighter tabular-nums leading-none">
                          {fmtTime(state.timeLeft)}
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant opacity-30 mt-0.5">
                          {fmtDuration(state.totalDuration)}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Selected task badge */}
              {state.taskId && tasks.find(t => t.id === state.taskId) && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 rounded-xl border border-primary/10 max-w-full">
                  <Target className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-[10px] font-extrabold text-primary truncate">
                    {tasks.find(t => t.id === state.taskId)?.title}
                  </span>
                </div>
              )}

              {/* Controls */}
              <div className="flex gap-1.5 w-full">
                <button
                  onClick={handleStart}
                  disabled={state.timeLeft === 0}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-black text-xs tracking-wide transition-all active:scale-95 shadow-sm disabled:opacity-45',
                    state.isActive
                      ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
                      : 'bg-primary text-on-primary hover:bg-primary/95',
                  )}
                >
                  {state.isActive
                    ? <><Pause className="w-3.5 h-3.5" /> Pausar</>
                    : <><Play className="w-3.5 h-3.5" strokeWidth={2.5} /> {state.sessionId ? 'Reanudar' : 'Iniciar'}</>
                  }
                </button>

                {/* Complete button — only when session is open and some progress */}
                {state.sessionId && !state.isActive && state.timeLeft < state.totalDuration && (
                  <button
                    onClick={() => handleComplete()}
                    disabled={saving}
                    className="flex items-center justify-center p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black transition-all active:scale-95 hover:bg-emerald-500/20"
                    title="Terminar y guardar foco"
                  >
                    {saving
                      ? <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
                      : <CheckCircle2 className="w-4 h-4" />
                    }
                  </button>
                )}

                <button
                  onClick={handleReset}
                  className="p-2.5 rounded-xl border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
                  title="Reiniciar temporizador"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FOCUS HISTORY MINI-LIST
// ─────────────────────────────────────────────────────────────────────────────

function FocusHistory({ sessions }: { sessions: any[] }) {
  if (sessions.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {sessions.slice(0, 4).map((s, i) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="flex items-center gap-2 px-2.5 py-2 bg-surface-container-high/20 rounded-xl border border-outline-variant/10"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />
          <span className="font-display text-xs font-bold text-on-surface tabular-nums">
            {fmtDuration(s.duration)}
          </span>
          {s.task && (
            <span className="flex-1 text-[10px] font-bold text-on-surface-variant opacity-60 truncate ml-0.5">
              {s.task.title}
            </span>
          )}
          <span className="text-[9px] font-bold text-on-surface-variant opacity-30 shrink-0">
            {relDate(s.createdAt)}
          </span>
         </motion.div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RIGHT PANEL
// ─────────────────────────────────────────────────────────────────────────────

export default function RightPanel() {
  const { isRightPanelOpen, setRightPanelOpen, activeFocusTaskId } = useAppStore();

  const [events,       setEvents]      = useState<any[]>([]);
  const [tasks,        setTasks]       = useState<any[]>([]);
  const [focusStats,   setFocusStats]  = useState<any>(null);
  const [focusSessions,setFocusSessions] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState<any>(null);
  const [loading,      setLoading]     = useState(true);
  const [activeTab,    setActiveTab]   = useState<'timer' | 'history'>('timer');

  // Automatically transition to timer tab if a task focus is initiated
  useEffect(() => {
    if (activeFocusTaskId) {
      setActiveTab('timer');
    }
  }, [activeFocusTaskId]);

  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [eventsData, tasksData, focusData, statsData] = await Promise.all([
        api.agenda.list(),
        api.tasks.list(),
        api.focus.list(),
        api.stats.dashboard(),
      ]);

      const now = new Date();
      const upcoming = eventsData
        .filter((e: any) => new Date(e.endDate) > now)
        .sort((a: any, b: any) => +new Date(a.startDate) - +new Date(b.startDate))
        .slice(0, 3); // 3 elements optimized

      setEvents(upcoming);
      setTasks(tasksData.filter((t: any) => !['COMPLETED', 'ARCHIVED'].includes(t.status)));
      setFocusStats(focusData.stats);
      setFocusSessions(focusData.sessions.slice(0, 4));
      setSummaryStats(statsData.summary);
    } catch (err) {
      console.error('RightPanel fetch error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isRightPanelOpen) fetchData();
  }, [isRightPanelOpen, fetchData]);

  // Computed
  const todayTasks   = tasks.filter(t => {
    const d = t.dueDate ? new Date(t.dueDate).toDateString() : null;
    return d === new Date().toDateString();
  });
  const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date());

  // ─── Render ───────────────────────────────────────────────────────────────

  const panel = (
    <aside
      className={cn(
        'fixed right-0 top-0 h-full w-right-panel-width flex flex-col z-[60] 2xl:z-50',
        'bg-surface-container-low border-l border-outline-variant/30',
        'transition-transform duration-300 ease-in-out',
        !isRightPanelOpen && 'translate-x-full',
      )}
    >
      {/* Left gradient accent */}
      <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent pointer-events-none" />

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-[18px] border-b border-outline-variant/15 shrink-0">
        <div>
          <h3 className="font-display text-sm font-black text-on-surface tracking-tight">Panel rápido</h3>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary opacity-80 mt-0.5">
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
        </div>
        <button
          onClick={() => setRightPanelOpen(false)}
          className="2xl:hidden p-1.5 rounded-lg text-on-surface-variant/40 hover:bg-surface-container-high hover:text-on-surface transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">

        {loading ? (
          <div className="space-y-3 pt-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-surface-container/60 rounded-xl animate-pulse border border-outline-variant/10"
                style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        ) : (
          <>
            {/* ── DAILY PULSE ─────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-1.5">
              <StatPill
                label="Foco hoy"
                value={fmtDuration(focusStats?.todaySeconds ?? 0)}
                color="text-primary"
              />
              <StatPill
                label="Tareas hoy"
                value={String(todayTasks.length)}
                color={todayTasks.length > 0 ? 'text-amber-350' : 'text-on-surface'}
              />
              <StatPill
                label="Vencidas"
                value={String(overdueTasks.length)}
                color={overdueTasks.length > 0 ? 'text-error' : 'text-on-surface'}
              />
            </div>

            {/* Overdue alert banner */}
            <AnimatePresence>
              {overdueTasks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2.5 px-3 py-2 bg-error/5 border border-error/15 rounded-xl overflow-hidden"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-error shrink-0" />
                  <p className="text-[10px] font-bold text-error leading-none">
                    {overdueTasks.length} tarea{overdueTasks.length > 1 ? 's' : ''} fuera de plazo
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── FOCUS TIMER & HISTORY TABS ──────────────────────────── */}
            <div className="bg-surface-container/15 rounded-2xl p-0.5 border border-outline-variant/10">
              {/* Timer / History switcher */}
              <div className="flex items-center gap-1 mb-2 bg-surface-container/40 rounded-xl p-1">
                {(['timer', 'history'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'flex-1 py-1 px-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-150',
                      activeTab === tab
                        ? 'bg-surface-container text-on-surface font-extrabold border border-outline-variant/15 shadow-sm'
                        : 'text-on-surface-variant opacity-40 hover:opacity-75',
                    )}
                  >
                    {tab === 'timer' ? 'Foco' : 'Recientes'}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'timer' ? (
                  <motion.div
                    key="timer"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                  >
                    <FocusTimer tasks={tasks} onSessionSaved={() => fetchData(true)} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="space-y-4 px-2 py-1"
                  >
                    {/* Focus statistics list */}
                    {focusStats && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="bg-surface-container-high/30 rounded-xl p-2.5 border border-outline-variant/10">
                          <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant opacity-40 block mb-0.5">Esta semana</span>
                          <span className="font-display text-sm font-black text-on-surface leading-none block">{fmtDuration(focusStats.weekSeconds)}</span>
                          <span className="text-[8px] font-bold text-on-surface-variant opacity-30 mt-0.5 block">{focusStats.weekSessions} sesiones</span>
                        </div>
                        <div className="bg-surface-container-high/30 rounded-xl p-2.5 border border-outline-variant/10">
                          <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant opacity-40 block mb-0.5">Este mes</span>
                          <span className="font-display text-sm font-black text-on-surface leading-none block">{fmtDuration(focusStats.monthSeconds)}</span>
                          <span className="text-[8px] font-bold text-on-surface-variant opacity-30 mt-0.5 block">{focusStats.monthSessions} sesiones</span>
                        </div>
                      </div>
                    )}

                    <div>
                      <SectionLabel icon={Clock} label="Últimos intervalos" />
                      {focusSessions.length > 0
                        ? <FocusHistory sessions={focusSessions} />
                        : (
                          <div className="py-5 text-center bg-surface-container-high/15 rounded-xl border border-dashed border-outline-variant/10">
                            <p className="text-[10px] text-on-surface-variant opacity-40 font-bold">Aún no registras foco.</p>
                          </div>
                        )
                      }
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── AGENDA PRÓXIMA (Optimized Timeline Style) ───────────────── */}
            <div>
              <SectionLabel icon={Calendar} label="Próximos Eventos" count={events.length} />
              {events.length > 0 ? (
                <div className="relative border-l border-outline-variant/20 ml-2.5 pl-3.5 py-1 space-y-3">
                  {events.map((event, i) => {
                    const start   = new Date(event.startDate);
                    const isToday = start.toDateString() === new Date().toDateString();
                    const isNow   = start < new Date() && new Date(event.endDate) > new Date();
                    const colorCls = EVENT_COLORS[event.category] ?? 'bg-surface-container text-on-surface-variant';

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="relative group"
                      >
                        {/* Timeline Bullet */}
                        <span className={cn(
                          "absolute -left-[20.5px] top-[5px] w-2 h-2 rounded-full border-2 border-surface-container-low transition-colors duration-200",
                          isNow ? "bg-emerald-400" : isToday ? "bg-primary" : "bg-outline-variant"
                        )} />

                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 justify-between">
                            <span className={cn(
                              'text-[8px] font-extrabold uppercase tracking-wide',
                              isNow ? 'text-emerald-400' : isToday ? 'text-primary' : 'text-on-surface-variant/40',
                            )}>
                              {isNow ? 'En curso' : isToday ? 'Hoy' : start.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                              {' '}{start.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className={cn('text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest block scale-90 origin-right', colorCls)}>
                              {EVENT_LABELS[event.category] ?? event.category}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                            {event.title}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 flex flex-col items-center gap-1.5 text-center border border-dashed border-outline-variant/10 rounded-xl bg-surface-container-high/5">
                  <Calendar className="w-5 h-5 text-on-surface-variant opacity-20" />
                  <p className="text-[10px] font-bold text-on-surface-variant opacity-35 leading-tight">Agenda despejada</p>
                </div>
              )}
            </div>

            {/* ── DAILY SUMMARY & PRODUCTIVITY SCORE ──────────────────────── */}
            {summaryStats && (
              <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-primary">
                      Productividad diaria
                    </span>
                  </div>
                  <span className={cn(
                    'text-[10px] font-black px-2 py-0.5 bg-background/50 rounded-full border',
                    (summaryStats.productivityScore ?? 0) >= 70 ? 'text-emerald-400 border-emerald-500/10' :
                    (summaryStats.productivityScore ?? 0) >= 40 ? 'text-amber-400 border-amber-500/10' : 'text-error border-error/10'
                  )}>
                    {summaryStats.productivityScore ?? 0}%
                  </span>
                </div>

                <div className="space-y-1.5">
                  {/* Productivity score custom loading bar */}
                  <div className="h-1.5 w-full bg-surface-container-highest/40 rounded-full overflow-hidden mb-3">
                    <div
                      style={{ width: `${summaryStats.productivityScore ?? 0}%` }}
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        (summaryStats.productivityScore ?? 0) >= 70 ? 'bg-emerald-400' :
                        (summaryStats.productivityScore ?? 0) >= 40 ? 'bg-amber-400' : 'bg-rose-400'
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px] text-on-surface-variant/70">
                    <div className="bg-background/25 p-1.5 rounded-lg border border-outline-variant/5">
                      <span className="opacity-50 block text-[8px] uppercase tracking-wider font-bold">Por Hacer</span>
                      <span className="font-bold text-on-surface mt-0.5 block">{summaryStats.tasksPending ?? 0}</span>
                    </div>
                    <div className="bg-background/25 p-1.5 rounded-lg border border-outline-variant/5">
                      <span className="opacity-50 block text-[8px] uppercase tracking-wider font-bold">Proyectos</span>
                      <span className="font-bold text-on-surface mt-0.5 block">{summaryStats.activeProjects ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-3.5 border-t border-outline-variant/15 shrink-0 bg-surface-container/10">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant opacity-45">
            Meta semanal de foco
          </span>
          <span className="text-[10px] font-black text-primary">
            {fmtDuration(focusStats?.weekSeconds ?? 0)}
          </span>
        </div>
        <div className="h-1 w-full bg-surface-container-highest/60 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, ((focusStats?.weekSeconds ?? 0) / (25 * 3600)) * 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-primary rounded-full relative"
          >
            {/* Gloss shine bar overlay */}
            <span className="absolute inset-x-0 top-0 h-1/2 bg-white/10" />
          </motion.div>
        </div>
        <div className="flex justify-between items-center mt-1.5">
          <p className="text-[8px] text-on-surface-variant opacity-30 leading-none">Sugerido: 25 horas semanales</p>
          <span className="text-[8px] font-bold text-primary/70 block leading-none">
            {Math.round(((focusStats?.weekSeconds ?? 0) / (25 * 3600)) * 100)}% de meta
          </span>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <AnimatePresence>
        {isRightPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRightPanelOpen(false)}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[55] 2xl:hidden"
          />
        )}
      </AnimatePresence>
      {panel}
    </>
  );
}