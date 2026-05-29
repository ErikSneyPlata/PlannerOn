// frontend/src/pages/Projects.tsx
import  { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Plus, FolderOpen, Layers, Clock, Pencil, X, Check, Trash2,
  ChevronDown, Calendar, Archive, AlertCircle,
  Play, PauseCircle, CheckCircle2, Search,
  TrendingUp, LayoutGrid, List, ArrowDownUp,
  ChevronUp, Sparkles, Target, Activity, Wallet, BookOpen,
} from 'lucide-react';
import { AnimatePresence, motion, useSpring, useTransform } from 'motion/react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  title: string;
  description?: string | null;
  color?: string | null;
  priority: string;
  status: string;
  progress: number;
  budget?: number | null;
  revenue?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  createdAt: string;
  _count?: { tasks: number };
  tasks?: any[];
}

type ViewMode   = 'grid' | 'list';
type SortKey    = 'createdAt' | 'title' | 'progress' | 'dueDate' | 'priority';
type SortDir    = 'asc' | 'desc';
type FilterKey  = 'ALL' | 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  PLANNING:  { label: 'Planificando', color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/25',   dot: 'bg-amber-400',   icon: Clock         },
  ACTIVE:    { label: 'Activo',       color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/25', dot: 'bg-emerald-400', icon: Play          },
  ON_HOLD:   { label: 'En pausa',     color: 'text-sky-400',     bg: 'bg-sky-400/10',     border: 'border-sky-400/25',     dot: 'bg-sky-400',     icon: PauseCircle   },
  COMPLETED: { label: 'Completado',   color: 'text-primary',     bg: 'bg-primary/10',     border: 'border-primary/25',     dot: 'bg-primary',     icon: CheckCircle2  },
  ARCHIVED:  { label: 'Archivado',    color: 'text-on-surface-variant', bg: 'bg-surface-container', border: 'border-outline-variant/20', dot: 'bg-on-surface-variant/30', icon: Archive },
} as const;

const PRIORITY_CFG = {
  CRITICAL: { label: 'Crítico',   color: 'text-error',             bg: 'bg-error/10',              order: 0 },
  HIGH:     { label: 'Alto',      color: 'text-amber-400',         bg: 'bg-amber-400/10',          order: 1 },
  NORMAL:   { label: 'Normal',    color: 'text-primary',           bg: 'bg-primary/10',            order: 2 },
  LOW:      { label: 'Bajo',      color: 'text-secondary',         bg: 'bg-secondary/10',          order: 3 },
  SOMEDAY:  { label: 'Algún día', color: 'text-on-surface-variant',bg: 'bg-surface-container-high',order: 4 },
} as const;

const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3, SOMEDAY: 4 };

const getCfg   = (s: string) => STATUS_CFG[s as keyof typeof STATUS_CFG]   ?? STATUS_CFG.ACTIVE;
const getPriCfg = (p: string) => PRIORITY_CFG[p as keyof typeof PRIORITY_CFG] ?? PRIORITY_CFG.NORMAL;

function fmt(n: number) {
  return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function isOverdue(dueDate?: string | null, status?: string) {
  if (!dueDate || status === 'COMPLETED' || status === 'ARCHIVED') return false;
  return new Date(dueDate) < new Date();
}

function relativeDate(dateStr: string): string {
  const now  = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'ayer';
  if (diff < 7)  return `hace ${diff} días`;
  if (diff < 30) return `hace ${Math.floor(diff / 7)} sem.`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED COUNTER
// ─────────────────────────────────────────────────────────────────────────────

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const spring = useSpring(0, { stiffness: 90, damping: 20 });
  const display = useTransform(spring, (v) => `${prefix}${Math.round(v).toLocaleString('es-CO')}${suffix}`);
  useEffect(() => { spring.set(value); }, [value]);
  return <motion.span>{display}</motion.span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label, value, prefix = '', suffix = '', icon: Icon, color, delay = 0,
}: {
  label: string; value: number; prefix?: string; suffix?: string;
  icon: React.ElementType; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="relative bg-surface-container border border-outline-variant/30 rounded-2xl p-5 overflow-hidden group"
    >
      <div
        className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-[0.06] transition-opacity group-hover:opacity-[0.1]"
        style={{ background: color }}
      />
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </div>
      </div>
      <p className="font-display text-2xl font-black text-on-surface tracking-tight tabular-nums">
        <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
      </p>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant opacity-40 mt-1">
        {label}
      </p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT MODAL (Create & Edit)
// ─────────────────────────────────────────────────────────────────────────────

const PALETTE = [
  '#4d8eff','#7c5cfc','#f25c54','#f9a03f','#36c27a',
  '#0dcaf0','#e91e8c','#ff6b6b','#20c997','#fd7e14',
];

const EMPTY_FORM = {
  title: '', description: '', color: '#4d8eff',
  priority: 'NORMAL', status: 'ACTIVE',
  budget: '', revenue: '', startDate: '', dueDate: '',
};

function ProjectModal({ project, onClose, onSaved }: {
  project?: Project | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!project;
  const [form, setForm] = useState(() =>
    project ? {
      title:       project.title,
      description: project.description ?? '',
      color:       project.color ?? '#4d8eff',
      priority:    project.priority,
      status:      project.status,
      budget:      project.budget?.toString() ?? '',
      revenue:     project.revenue?.toString() ?? '',
      startDate:   project.startDate ? project.startDate.split('T')[0] : '',
      dueDate:     project.dueDate   ? project.dueDate.split('T')[0]   : '',
    } : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true); setError('');
    try {
      const payload = {
        title:       form.title.trim(),
        description: form.description || null,
        color:       form.color,
        priority:    form.priority,
        status:      form.status,
        budget:      form.budget  ? parseFloat(form.budget)  : null,
        revenue:     form.revenue ? parseFloat(form.revenue) : null,
        startDate:   form.startDate || null,
        dueDate:     form.dueDate   || null,
      };
      if (isEdit) await api.projects.update(project!.id, payload);
      else        await api.projects.create(payload);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-surface-container-low border border-outline-variant/40 focus:border-primary/70 text-on-surface text-sm px-4 py-3 rounded-xl focus:outline-none transition-all placeholder:text-on-surface-variant/25 focus:bg-surface-container";
  const labelCls = "block text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-45 mb-1.5";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-surface-container border border-outline-variant/40 rounded-3xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
      >
        {/* Color accent bar */}
        <div className="h-1 w-full" style={{ background: form.color }} />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-on-surface-variant opacity-35 mb-0.5">
              {isEdit ? 'Editar proyecto' : 'Nuevo proyecto'}
            </p>
            <h3 className="font-display text-xl font-black text-on-surface tracking-tight">
              {isEdit ? project!.title : 'Crear proyecto'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-container-high text-on-surface-variant/50 hover:text-on-surface-variant transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 pb-2 space-y-4">

          {/* Color palette */}
          <div>
            <label className={labelCls}>Color del proyecto</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => set('color', c)}
                  className="w-7 h-7 rounded-full transition-all ring-offset-2 ring-offset-surface-container"
                  style={{
                    background: c,
                    transform: form.color === c ? 'scale(1.25)' : 'scale(1)',
                    boxShadow: form.color === c ? `0 0 0 2px var(--color-surface-container), 0 0 0 4px ${c}` : 'none',
                  }}
                />
              ))}
              <input
                type="color" value={form.color}
                onChange={e => set('color', e.target.value)}
                className="w-7 h-7 rounded-full cursor-pointer border-2 border-outline-variant/40 overflow-hidden bg-transparent"
                title="Color personalizado"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className={labelCls}>Nombre del proyecto *</label>
            <input
              type="text" placeholder="ej. Rediseño de marca, App móvil..."
              value={form.title} onChange={e => set('title', e.target.value)}
              required autoFocus className={inputCls}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea
              placeholder="¿De qué trata este proyecto? Objetivos, contexto..."
              value={form.description} onChange={e => set('description', e.target.value)}
              rows={3}
              className={cn(inputCls, 'resize-none leading-relaxed')}
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Estado</label>
              <div className="relative">
                <select value={form.status} onChange={e => set('status', e.target.value)} className={cn(inputCls, 'appearance-none pr-8')}>
                  {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant/40 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Prioridad</label>
              <div className="relative">
                <select value={form.priority} onChange={e => set('priority', e.target.value)} className={cn(inputCls, 'appearance-none pr-8')}>
                  {Object.entries(PRIORITY_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant/40 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Fecha de inicio</label>
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha límite</label>
              <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Budget + Revenue */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'budget', label: 'Presupuesto' },
              { key: 'revenue', label: 'Ingresos' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/30 text-sm font-black">$</span>
                  <input
                    type="number" step="0.01" min="0" placeholder="0"
                    value={(form as any)[key]} onChange={e => set(key, e.target.value)}
                    className={cn(inputCls, 'pl-7 font-mono')}
                  />
                </div>
              </div>
            ))}
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-xs text-error bg-error/8 border border-error/15 rounded-xl px-4 py-3"
            >
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between gap-3 shrink-0 border-t border-outline-variant/15">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-container-high transition-all border border-outline-variant/30"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.title.trim()}
            className="flex items-center gap-2 px-7 py-2.5 rounded-xl font-bold text-sm text-on-primary transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: form.color, boxShadow: `0 4px 20px ${form.color}40` }}
          >
            {saving
              ? <><span className="w-4 h-4 rounded-full border-2 border-on-primary/30 border-t-on-primary animate-spin" />Guardando...</>
              : isEdit
                ? <><Check className="w-4 h-4" />Guardar cambios</>
                : <><Plus className="w-4 h-4" />Crear proyecto</>
            }
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE CONFIRM DIALOG
// ─────────────────────────────────────────────────────────────────────────────

function DeleteDialog({ title, onConfirm, onCancel, loading }: {
  title: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-surface-container border border-outline-variant/40 rounded-2xl p-6 shadow-2xl"
      >
        <div className="w-11 h-11 rounded-2xl bg-error/10 flex items-center justify-center mb-4">
          <Trash2 className="w-5 h-5 text-error" />
        </div>
        <h3 className="font-display text-lg font-black text-on-surface mb-1">¿Eliminar proyecto?</h3>
        <p className="text-sm text-on-surface-variant opacity-50 mb-5">
          "<span className="font-bold opacity-80">{title}</span>" se eliminará permanentemente junto con sus datos.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-outline-variant/40 text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-error text-white text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading
              ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Eliminando...</>
              : <><Trash2 className="w-4 h-4" />Eliminar</>
            }
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────

function StatusDropdown({ current, onSelect }: { current: string; onSelect: (s: string) => void }) {
  const [open, setOpen]     = useState(false);
  const [rect, setRect]     = useState<DOMRect | null>(null);
  const buttonRef           = useRef<HTMLButtonElement>(null);
  const cfg                 = getCfg(current);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Always recalculate rect so coords are fresh even after scroll
    if (buttonRef.current) {
      setRect(buttonRef.current.getBoundingClientRect());
    }
    setOpen(o => !o);
  };

  // Close on scroll so it doesn't float away from the button
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const dropdownStyle: React.CSSProperties = rect
    ? {
        position: 'fixed',
        // Flip upward if too close to the bottom of the viewport
        ...(rect.bottom + 220 > window.innerHeight
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
        left:     rect.left,
        minWidth: Math.max(rect.width, 168),
        zIndex:   9999,
      }
    : { display: 'none' };

  // Portal content — AnimatePresence must live INSIDE the portal, not wrapping it
  const portalContent = createPortal(
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 9998 }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Dropdown — AnimatePresence inside portal so framer-motion can track it */}
      <AnimatePresence>
        {open && rect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -4 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            style={dropdownStyle}
            className="bg-surface-container-high border border-outline-variant/40 rounded-xl shadow-2xl overflow-hidden"
          >
            {Object.entries(STATUS_CFG).map(([k, v]) => {
              const VIcon = v.icon;
              const isActive = k === current;
              return (
                <button
                  key={k}
                  onClick={(e) => { e.stopPropagation(); onSelect(k); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] font-bold text-left transition-colors',
                    isActive
                      ? cn(v.color, v.bg)
                      : 'text-on-surface-variant hover:bg-surface-container-highest',
                  )}
                >
                  <VIcon className="w-3.5 h-3.5 shrink-0" />
                  {v.label}
                  {isActive && <Check className="w-3 h-3 ml-auto" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={cn(
          'flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border transition-all',
          cfg.color, cfg.bg, cfg.border,
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot, current === 'ACTIVE' && 'animate-pulse')} />
        {cfg.label}
        <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {portalContent}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS BAR (inline editable)
// ─────────────────────────────────────────────────────────────────────────────

function ProgressBar({ value, color, onSave }: { value: number; color: string; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  return (
    <div className="space-y-1.5">
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="range" min={0} max={100} value={draft}
            onChange={e => setDraft(Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full cursor-pointer accent-primary"
          />
          <span className="font-mono text-xs font-black w-9 text-right tabular-nums" style={{ color }}>
            {draft}%
          </span>
          <button
            onClick={() => { onSave(draft); setEditing(false); }}
            className="p-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={() => { setDraft(value); setEditing(false); }}
            className="p-1.5 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setDraft(value); setEditing(true); }}
          className="w-full text-left group/pb"
        >
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant opacity-35">
              Progreso
            </span>
            <span
              className="text-[9px] font-black opacity-0 group-hover/pb:opacity-70 transition-opacity flex items-center gap-1"
              style={{ color }}
            >
              <Pencil className="w-2.5 h-2.5" /> {value}%
            </span>
          </div>
          <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <motion.div
              key={value}
              initial={{ width: 0 }}
              animate={{ width: `${value}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full"
              style={{ background: color }}
            />
          </div>
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT CARD  (grid view)
// ─────────────────────────────────────────────────────────────────────────────

function ProjectCard({ project, index, onEdit, onDeleteRequest, onStatusChange, onProgressChange }: {
  project: Project; index: number;
  onEdit: (p: Project) => void;
  onDeleteRequest: (p: Project) => void;
  onStatusChange: (id: string, status: string) => void;
  onProgressChange: (id: string, progress: number) => void;
}) {
  const color     = project.color ?? 'var(--color-primary)';
  const overdue   = isOverdue(project.dueDate, project.status);
  const priCfg    = getPriCfg(project.priority);
  const taskCount = project._count?.tasks ?? 0;
  const roi       = project.budget && project.revenue
    ? Math.round(((project.revenue - project.budget) / project.budget) * 100)
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative bg-surface-container border rounded-2xl p-5 flex flex-col gap-4 min-h-[300px]',
        'transition-all duration-300 cursor-default',
        overdue
          ? 'border-error/25 hover:border-error/45 shadow-sm shadow-error/5'
          : 'border-outline-variant/35 hover:border-outline-variant/65 hover:shadow-lg hover:shadow-black/5',
        project.status === 'ARCHIVED' && 'opacity-60',
      )}
    >
      {/* Top color band — clipped independently so el padre no necesita overflow-hidden */}
      <div className="absolute top-0 left-0 right-0 h-[3px] overflow-hidden rounded-t-2xl">
        <div
          className="h-full w-full"
          style={{ background: color, opacity: project.status === 'ARCHIVED' ? 0.3 : 1 }}
        />
      </div>

      {/* Ambient hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(ellipse 80% 60% at 15% 0%, ${color}0d, transparent 70%)` }}
      />

      {/* ── TOP ROW ── */}
      <div className="flex items-start gap-3 relative">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
          style={{ background: `${color}20` }}
        >
          <FolderOpen className="w-5 h-5" style={{ color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 justify-between">
            <h3 className={cn(
              'font-display text-[17px] font-bold tracking-tight leading-snug truncate flex-1',
              'transition-colors group-hover:text-primary',
              project.status === 'ARCHIVED' ? 'text-on-surface-variant line-through' : 'text-on-surface',
            )}>
              {project.title}
            </h3>
            {overdue && (
              <span className="shrink-0 text-[8px] font-black text-error bg-error/10 border border-error/20 px-1.5 py-0.5 rounded-md uppercase tracking-widest">
                Vencido
              </span>
            )}
          </div>
          <p className="text-[11px] text-on-surface-variant opacity-40 line-clamp-1 mt-0.5">
            {project.description || 'Sin descripción.'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
          <Link
            to={`/documentation?projectId=${project.id}`}
            className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/8 transition-all"
            title="Ver especificaciones y documentación de software"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => onEdit(project)}
            className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all"
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteRequest(project)}
            className="p-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/8 transition-all"
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── META PILLS ── */}
      <div className="flex items-center gap-1.5 flex-wrap -mt-1">
        <span className={cn('text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md', priCfg.color, priCfg.bg)}>
          {priCfg.label}
        </span>
        {project.dueDate && (
          <span className={cn(
            'flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest',
            overdue ? 'text-error' : 'text-on-surface-variant opacity-35',
          )}>
            <Calendar className="w-3 h-3" />
            {new Date(project.dueDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
          </span>
        )}
        {roi !== null && (
          <span className={cn(
            'flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ml-auto',
            roi >= 0 ? 'text-emerald-400' : 'text-error',
          )}>
            <TrendingUp className="w-3 h-3" />
            {roi >= 0 ? '+' : ''}{roi}% ROI
          </span>
        )}
      </div>

      {/* ── FINANCIALS ── */}
      {(project.budget || project.revenue) && (
        <div className="grid grid-cols-2 gap-2">
          {project.budget ? (
            <div className="bg-surface-container-high rounded-xl px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35 mb-0.5">Presupuesto</p>
              <p className="text-xs font-black text-on-surface font-mono">${fmt(project.budget)}</p>
            </div>
          ) : <div />}
          {project.revenue ? (
            <div className="bg-surface-container-high rounded-xl px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35 mb-0.5">Ingresos</p>
              <p className={cn('text-xs font-black font-mono', project.revenue >= (project.budget ?? 0) ? 'text-emerald-400' : 'text-error')}>
                ${fmt(project.revenue)}
              </p>
            </div>
          ) : <div />}
        </div>
      )}

      {/* ── PROGRESS ── */}
      <div className="flex-1 flex flex-col justify-end space-y-4">
        <ProgressBar
          value={project.progress ?? 0}
          color={color}
          onSave={v => onProgressChange(project.id, v)}
        />

        {/* ── BOTTOM ROW ── */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <StatusDropdown
            current={project.status}
            onSelect={s => onStatusChange(project.id, s)}
          />
          <div className="flex items-center gap-3 ml-auto text-on-surface-variant opacity-30">
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest">
              <Layers className="w-3 h-3" /> {taskCount}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest">
              {relativeDate(project.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT ROW  (list view)
// ─────────────────────────────────────────────────────────────────────────────

function ProjectRow({ project, index, onEdit, onDeleteRequest, onStatusChange, onProgressChange }: {
  project: Project; index: number;
  onEdit: (p: Project) => void;
  onDeleteRequest: (p: Project) => void;
  onStatusChange: (id: string, status: string) => void;
  onProgressChange: (id: string, progress: number) => void;
}) {
  const color     = project.color ?? 'var(--color-primary)';
  const overdue   = isOverdue(project.dueDate, project.status);
  const priCfg    = getPriCfg(project.priority);
  const taskCount = project._count?.tasks ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ delay: index * 0.03, duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'group flex items-center gap-4 bg-surface-container border rounded-xl px-5 py-3.5',
        'transition-all duration-200 relative',
        overdue
          ? 'border-error/20 hover:border-error/35'
          : 'border-outline-variant/30 hover:border-outline-variant/60 hover:bg-surface-container-high/50',
        project.status === 'ARCHIVED' && 'opacity-50',
      )}
    >
      {/* Color dot */}
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />

      {/* Title + description */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-bold text-on-surface leading-snug truncate',
          project.status === 'ARCHIVED' && 'line-through text-on-surface-variant',
        )}>
          {project.title}
        </p>
        {project.description && (
          <p className="text-[11px] text-on-surface-variant opacity-40 truncate mt-0.5">{project.description}</p>
        )}
      </div>

      {/* Priority */}
      <span className={cn('hidden sm:block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shrink-0', priCfg.color, priCfg.bg)}>
        {priCfg.label}
      </span>

      {/* Status */}
      <div className="hidden md:block shrink-0">
        <StatusDropdown current={project.status} onSelect={s => onStatusChange(project.id, s)} />
      </div>

      {/* Progress */}
      <div className="hidden lg:flex items-center gap-2 w-28 shrink-0">
        <div className="flex-1 h-1 bg-surface-container-highest rounded-full overflow-hidden">
          <motion.div
            key={project.progress}
            initial={{ width: 0 }}
            animate={{ width: `${project.progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: color }}
          />
        </div>
        <span className="text-[10px] font-black tabular-nums" style={{ color }}>{project.progress}%</span>
      </div>

      {/* Due date */}
      {project.dueDate && (
        <span className={cn(
          'hidden sm:flex items-center gap-1 text-[10px] font-bold shrink-0',
          overdue ? 'text-error' : 'text-on-surface-variant opacity-40',
        )}>
          <Calendar className="w-3 h-3" />
          {new Date(project.dueDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
        </span>
      )}

      {/* Task count */}
      <span className="hidden xl:flex items-center gap-1 text-[10px] font-bold text-on-surface-variant opacity-30 shrink-0">
        <Layers className="w-3 h-3" /> {taskCount}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
        <Link
          to={`/documentation?projectId=${project.id}`}
          className="p-1.5 rounded-lg hover:bg-primary/8 text-on-surface-variant hover:text-primary transition-all"
          title="Ver especificaciones y documentación de software"
        >
          <BookOpen className="w-3.5 h-3.5" />
        </Link>
        <button onClick={() => onEdit(project)} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDeleteRequest(project)} className="p-1.5 rounded-lg hover:bg-error/8 text-on-surface-variant hover:text-error transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ filter, onCreateNew }: { filter: FilterKey; onCreateNew: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="col-span-full py-20 bg-surface-container rounded-2xl border border-dashed border-outline-variant/30 flex flex-col items-center justify-center gap-5 text-center px-8"
    >
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center">
          <FolderOpen className="w-7 h-7 text-on-surface-variant opacity-20" />
        </div>
        {filter === 'ALL' && (
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-on-primary" />
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-bold text-on-surface-variant opacity-40">
          {filter === 'ALL' ? 'Sin proyectos aún.' : `Sin proyectos en "${getCfg(filter).label}".`}
        </p>
        <p className="text-xs text-on-surface-variant opacity-25 max-w-[220px] mx-auto leading-relaxed">
          {filter === 'ALL'
            ? 'Crea tu primer proyecto para empezar a organizar tu trabajo.'
            : 'Prueba con otro filtro o crea un nuevo proyecto.'}
        </p>
      </div>
      {filter === 'ALL' && (
        <button
          onClick={onCreateNew}
          className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-primary bg-primary/10 hover:bg-primary/15 px-4 py-2 rounded-xl transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Crear el primero
        </button>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SORT BUTTON
// ─────────────────────────────────────────────────────────────────────────────

function SortButton({ current, dir, value, label, onClick }: {
  current: SortKey; dir: SortDir; value: SortKey; label: string; onClick: () => void;
}) {
  const active = current === value;
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-on-surface-variant opacity-40 hover:opacity-70 hover:bg-surface-container-high',
      )}
    >
      {label}
      {active && (dir === 'asc'
        ? <ChevronUp className="w-3 h-3" />
        : <ChevronDown className="w-3 h-3" />
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function Projects() {
  const [projects, setProjects]       = useState<Project[]>([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState<'create' | Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting]       = useState(false);
  const [filter, setFilter]           = useState<FilterKey>('ALL');
  const [search, setSearch]           = useState('');
  const [viewMode, setViewMode]       = useState<ViewMode>('grid');
  const [sortKey, setSortKey]         = useState<SortKey>('createdAt');
  const [sortDir, setSortDir]         = useState<SortDir>('desc');
  const [showSort, setShowSort]       = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Fetch ──
  const fetchProjects = useCallback(async () => {
    try {
      const data = await api.projects.list();
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // ── Keyboard shortcut: "/" focuses search, "n" opens create modal ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/' || e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'n') { e.preventDefault(); setModal('create'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Handlers ──
  const handleStatusChange = async (id: string, status: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    try { await api.projects.update(id, { status }); }
    catch { fetchProjects(); }
  };

  const handleProgressChange = async (id: string, progress: number) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, progress } : p));
    try { await api.projects.update(id, { progress }); }
    catch { fetchProjects(); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.projects.delete(deleteTarget.id);
      setProjects(prev => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaved = () => { fetchProjects(); setModal(null); };

  const handleSortToggle = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // ── Derived stats ──
  const stats = useMemo(() => ({
    total:     projects.length,
    active:    projects.filter(p => p.status === 'ACTIVE').length,
    avgProgress: projects.length
      ? Math.round(projects.reduce((a, p) => a + (p.progress ?? 0), 0) / projects.length)
      : 0,
    totalRevenue: projects.reduce((a, p) => a + (p.revenue ?? 0), 0),
    overdue:   projects.filter(p => isOverdue(p.dueDate, p.status)).length,
  }), [projects]);

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = { ALL: projects.length };
    projects.forEach(p => { map[p.status] = (map[p.status] ?? 0) + 1; });
    return map;
  }, [projects]);

  // ── Search + filter + sort ──
  const filtered = useMemo(() => {
    let list = filter === 'ALL' ? projects : projects.filter(p => p.status === filter);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q),
      );
    }

    list = [...list].sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case 'title':    va = a.title.toLowerCase(); vb = b.title.toLowerCase(); break;
        case 'progress': va = a.progress; vb = b.progress; break;
        case 'priority': va = PRIORITY_ORDER[a.priority] ?? 99; vb = PRIORITY_ORDER[b.priority] ?? 99; break;
        case 'dueDate':  va = a.dueDate ?? '9999'; vb = b.dueDate ?? '9999'; break;
        default:         va = a.createdAt; vb = b.createdAt; break;
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [projects, filter, search, sortKey, sortDir]);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-gutter pb-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface-container border border-outline-variant/20 rounded-2xl p-5 h-24 animate-pulse" />
          ))}
        </div>
        <div className="h-10 bg-surface-container rounded-xl animate-pulse w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-card-gap">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-surface-container border border-outline-variant/20 rounded-2xl h-[300px] animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">

      {/* ── Modals ── */}
      <AnimatePresence>
        {modal !== null && (
          <ProjectModal
            project={modal === 'create' ? null : modal}
            onClose={() => setModal(null)}
            onSaved={handleSaved}
          />
        )}
        {deleteTarget && (
          <DeleteDialog
            title={deleteTarget.title}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary opacity-60 mb-1.5">
            Workspace
          </p>
          <h2 className="font-display text-4xl font-black text-on-surface tracking-tighter leading-none flex items-center gap-3">
            Proyectos
            {stats.overdue > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-[10px] font-black text-error bg-error/10 border border-error/20 px-2.5 py-1 rounded-full uppercase tracking-widest"
              >
                {stats.overdue} vencido{stats.overdue > 1 ? 's' : ''}
              </motion.span>
            )}
          </h2>
          <p className="text-sm text-on-surface-variant opacity-45 mt-1.5">
            Gestiona el foco y los objetivos clave de tu trabajo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <p className="hidden sm:block text-[10px] text-on-surface-variant opacity-25 font-mono">
            <kbd className="px-1.5 py-0.5 rounded border border-outline-variant/30 text-[9px]">n</kbd> nuevo
          </p>
          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-primary text-on-primary shadow-md shadow-primary/25 hover:bg-primary/90 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Nuevo proyecto
          </button>
        </div>
      </div>

      {/* ── Stats grid ── */}
      {projects.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total proyectos"   value={stats.total}       icon={FolderOpen}  color="#4d8eff" delay={0}    />
          <StatCard label="Activos"            value={stats.active}      icon={Activity}    color="#36c27a" delay={0.05} />
          <StatCard label="Progreso promedio"  value={stats.avgProgress} icon={Target}      color="#7c5cfc" delay={0.1}  suffix="%" />
          <StatCard label="Ingresos totales"   value={stats.totalRevenue} icon={Wallet}     color="#f9a03f" delay={0.15} prefix="$" />
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant opacity-30" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar proyectos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant/40 focus:border-primary/60 text-on-surface text-sm pl-9 pr-9 py-2 rounded-xl focus:outline-none transition-all placeholder:text-on-surface-variant/25"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setFilter('ALL')}
            className={cn(
              'px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all',
              filter === 'ALL'
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant opacity-40 hover:opacity-70 hover:bg-surface-container-high',
            )}
          >
            Todos ({projects.length})
          </button>
          {(Object.keys(STATUS_CFG) as Array<keyof typeof STATUS_CFG>).map(key => {
            const count = statusCounts[key] ?? 0;
            if (count === 0) return null;
            const cfg = STATUS_CFG[key];
            const isActive = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold border transition-all',
                  isActive
                    ? cn(cfg.color, cfg.bg, cfg.border)
                    : 'text-on-surface-variant opacity-40 border-transparent hover:opacity-70 hover:bg-surface-container-high',
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setShowSort(s => !s)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border transition-all',
                showSort
                  ? 'bg-surface-container-high border-outline-variant/40 text-on-surface'
                  : 'border-transparent text-on-surface-variant opacity-40 hover:opacity-70 hover:bg-surface-container-high',
              )}
            >
              <ArrowDownUp className="w-3.5 h-3.5" /> Ordenar
            </button>
            <AnimatePresence>
              {showSort && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.93, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.93 }}
                    transition={{ duration: 0.13 }}
                    className="absolute right-0 top-full mt-1.5 z-20 bg-surface-container-high border border-outline-variant/40 rounded-xl shadow-2xl p-2 min-w-[160px]"
                  >
                    {([
                      ['createdAt', 'Fecha creación'],
                      ['title',     'Nombre'],
                      ['progress',  'Progreso'],
                      ['priority',  'Prioridad'],
                      ['dueDate',   'Fecha límite'],
                    ] as [SortKey, string][]).map(([key, label]) => (
                      <SortButton
                        key={key}
                        current={sortKey} dir={sortDir}
                        value={key} label={label}
                        onClick={() => { handleSortToggle(key); setShowSort(false); }}
                      />
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-surface-container border border-outline-variant/30 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                viewMode === 'grid'
                  ? 'bg-surface-container-high text-on-surface'
                  : 'text-on-surface-variant opacity-30 hover:opacity-60',
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                viewMode === 'list'
                  ? 'bg-surface-container-high text-on-surface'
                  : 'text-on-surface-variant opacity-30 hover:opacity-60',
              )}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Search results badge ── */}
      <AnimatePresence>
        {search && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-on-surface-variant opacity-40 -mt-2"
          >
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para "{search}"
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── Grid / List ── */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-card-gap">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <EmptyState key="empty" filter={filter} onCreateNew={() => setModal('create')} />
            ) : (
              filtered.map((project, i) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={i}
                  onEdit={p => setModal(p)}
                  onDeleteRequest={setDeleteTarget}
                  onStatusChange={handleStatusChange}
                  onProgressChange={handleProgressChange}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-2">
          {/* List header */}
          {filtered.length > 0 && (
            <div className="hidden lg:flex items-center gap-4 px-5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant opacity-25">
              <div className="w-2.5 shrink-0" />
              <span className="flex-1">Proyecto</span>
              <span className="w-20 shrink-0 hidden sm:block">Prioridad</span>
              <span className="w-32 shrink-0 hidden md:block">Estado</span>
              <span className="w-28 shrink-0 hidden lg:block">Progreso</span>
              <span className="w-20 shrink-0 hidden sm:block">Vence</span>
              <span className="w-10 shrink-0 hidden xl:block">Tareas</span>
              <span className="w-14 shrink-0" />
            </div>
          )}
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <EmptyState key="empty" filter={filter} onCreateNew={() => setModal('create')} />
            ) : (
              filtered.map((project, i) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  index={i}
                  onEdit={p => setModal(p)}
                  onDeleteRequest={setDeleteTarget}
                  onStatusChange={handleStatusChange}
                  onProgressChange={handleProgressChange}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}