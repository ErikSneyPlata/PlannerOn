// frontend/src/pages/Tasks.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, CheckCircle2, Circle, Clock, MoreHorizontal,
  FolderOpen, AlertTriangle, ArrowUp, Minus, ArrowDown,
  Inbox, ChevronDown, Calendar, Trash2, X, Check,
  Pencil, Tag, Timer, AlignLeft, AlertCircle, Hash,
  Play, Pause, Square, History,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { useAppStore } from '../store/useStore';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_CFG: Record<string, {
  label: string; color: string; bg: string; border: string; icon: React.ElementType;
}> = {
  CRITICAL: { label: 'Crítico',   color: 'text-error',       bg: 'bg-error/10',       border: 'border-error/20',       icon: AlertTriangle },
  HIGH:     { label: 'Alto',      color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20',   icon: ArrowUp       },
  NORMAL:   { label: 'Normal',    color: 'text-primary',     bg: 'bg-primary/10',     border: 'border-primary/20',     icon: Minus         },
  LOW:      { label: 'Bajo',      color: 'text-secondary',   bg: 'bg-secondary/10',   border: 'border-secondary/20',   icon: ArrowDown     },
  SOMEDAY:  { label: 'Algún día', color: 'text-on-surface-variant', bg: 'bg-surface-container-high', border: 'border-outline-variant/30', icon: Inbox },
};

const STATUS_CFG: Record<string, { label: string; dot: string; color: string; bg: string }> = {
  BACKLOG:     { label: 'Backlog',     dot: 'bg-on-surface-variant/20', color: 'text-on-surface-variant', bg: 'bg-surface-container-high' },
  TODO:        { label: 'Por hacer',  dot: 'bg-on-surface-variant/50', color: 'text-on-surface-variant', bg: 'bg-surface-container-high' },
  IN_PROGRESS: { label: 'En curso',   dot: 'bg-primary',               color: 'text-primary',            bg: 'bg-primary/10'             },
  REVIEW:      { label: 'Revisión',   dot: 'bg-amber-400',             color: 'text-amber-400',          bg: 'bg-amber-400/10'           },
  BLOCKED:     { label: 'Bloqueado',  dot: 'bg-error',                 color: 'text-error',              bg: 'bg-error/10'               },
  COMPLETED:   { label: 'Hecho',      dot: 'bg-emerald-400',           color: 'text-emerald-400',        bg: 'bg-emerald-400/10'         },
  ARCHIVED:    { label: 'Archivado',  dot: 'bg-on-surface-variant/20', color: 'text-on-surface-variant', bg: 'bg-surface-container'      },
};

const FILTER_TABS = [
  { id: 'ALL',         label: 'Todas'      },
  { id: 'TODO',        label: 'Por hacer'  },
  { id: 'IN_PROGRESS', label: 'En curso'   },
  { id: 'REVIEW',      label: 'Revisión'   },
  { id: 'BLOCKED',     label: 'Bloqueado'  },
  { id: 'COMPLETED',   label: 'Hecho'      },
  { id: 'BACKLOG',     label: 'Backlog'    },
  { id: 'ARCHIVED',    label: 'Archivado'  },
];

function isDueSoon(d: string | null) {
  if (!d) return false;
  const diff = (new Date(d).getTime() - Date.now()) / 86400000;
  return diff <= 2 && diff >= 0;
}
function isOverdue(d: string | null, status?: string) {
  if (!d || status === 'COMPLETED' || status === 'ARCHIVED') return false;
  return new Date(d).getTime() < Date.now();
}
function parseTags(raw?: string | null): string[] {
  if (!raw) return [];
  return raw.split(',').map(t => t.trim()).filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK MODAL  (Create + Edit)
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY: Record<string, string> = {
  title: '', description: '', priority: 'NORMAL', status: 'TODO',
  projectId: '', dueDate: '', tags: '', estimatedTime: '', actualTime: '',
};

function TaskModal({
  task, projects, onClose, onSaved,
}: {
  task?: any | null;
  projects: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!task;
  const [form, setForm] = useState(() =>
    task ? {
      title:         task.title ?? '',
      description:   task.description ?? '',
      priority:      task.priority ?? 'NORMAL',
      status:        task.status ?? 'TODO',
      projectId:     task.projectId ?? '',
      dueDate:       task.dueDate ? task.dueDate.split('T')[0] : '',
      tags:          task.tags ?? '',
      estimatedTime: task.estimatedTime?.toString() ?? '',
      actualTime:    task.actualTime?.toString() ?? '',
    } : { ...EMPTY }
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
        title:         form.title.trim(),
        description:   form.description || null,
        priority:      form.priority,
        status:        form.status,
        projectId:     form.projectId || null,
        dueDate:       form.dueDate || null,
        tags:          form.tags || null,
        estimatedTime: form.estimatedTime ? parseInt(form.estimatedTime) : null,
        actualTime:    form.actualTime    ? parseInt(form.actualTime)    : null,
      };
      if (isEdit) await api.tasks.update(task.id, payload);
      else        await api.tasks.create(payload);
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
        className="w-full max-w-lg bg-surface-container border border-outline-variant/40 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-outline-variant/20 flex items-center justify-between shrink-0">
          <div>
            <p className={cn(lbl, 'mb-0.5')}>{isEdit ? 'Editar tarea' : 'Nueva tarea'}</p>
            <h3 className="font-display text-lg font-black text-on-surface tracking-tight">
              {isEdit ? task.title : 'Crear tarea'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* Title */}
          <div className="space-y-1.5">
            <label className={lbl}>Título *</label>
            <input type="text" placeholder="¿Qué hay que hacer?"
              value={form.title} onChange={e => set('title', e.target.value)}
              required autoFocus className={inp}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className={lbl}>Descripción</label>
            <textarea placeholder="Contexto, detalles, notas importantes..."
              value={form.description} onChange={e => set('description', e.target.value)}
              className={cn(inp, 'resize-none min-h-[72px]')}
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={lbl}>Estado</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inp}>
                {Object.entries(STATUS_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={lbl}>Prioridad</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} className={inp}>
                {Object.entries(PRIORITY_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Project + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={lbl}>Proyecto</label>
              <select value={form.projectId} onChange={e => set('projectId', e.target.value)} className={inp}>
                <option value="">Sin proyecto</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={lbl}>Fecha límite</label>
              <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} className={inp} />
            </div>
          </div>

          {/* Time estimates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={lbl}>Tiempo estimado (min)</label>
              <div className="relative">
                <Timer className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant opacity-30" />
                <input type="number" min="0" placeholder="60"
                  value={form.estimatedTime} onChange={e => set('estimatedTime', e.target.value)}
                  className={cn(inp, 'pl-9 font-mono')}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={lbl}>Tiempo real (min)</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant opacity-30" />
                <input type="number" min="0" placeholder="0"
                  value={form.actualTime} onChange={e => set('actualTime', e.target.value)}
                  className={cn(inp, 'pl-9 font-mono')}
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className={lbl}>Etiquetas (separadas por coma)</label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant opacity-30" />
              <input type="text" placeholder="diseño, urgente, frontend..."
                value={form.tags} onChange={e => set('tags', e.target.value)}
                className={cn(inp, 'pl-9')}
              />
            </div>
            {form.tags && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {parseTags(form.tags).map(t => (
                  <span key={t} className="text-[9px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/15">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-error bg-error/8 border border-error/15 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/20 flex items-center justify-between shrink-0">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-container-high transition-all border border-outline-variant/30"
          >
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving || !form.title.trim()}
            className="flex items-center gap-2 bg-primary text-on-primary px-7 py-2.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            {saving
              ? <><span className="w-4 h-4 rounded-full border-2 border-on-primary/30 border-t-on-primary animate-spin" />Guardando...</>
              : isEdit
                ? <><Check className="w-4 h-4" />Guardar cambios</>
                : <><Plus className="w-4 h-4" />Crear tarea</>
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

function StatusDropdown({
  current, onSelect,
}: { current: string; onSelect: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CFG[current] ?? STATUS_CFG.TODO;

  return (
    <div className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className={cn(
          'flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-lg border transition-all',
          cfg.color, cfg.bg,
          current === 'IN_PROGRESS' ? 'border-primary/20'
          : current === 'COMPLETED'  ? 'border-emerald-400/20'
          : current === 'BLOCKED'    ? 'border-error/20'
          : current === 'REVIEW'     ? 'border-amber-400/20'
          : 'border-outline-variant/20'
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot,
          current === 'IN_PROGRESS' && 'animate-pulse'
        )} />
        {cfg.label}
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 top-full mt-1.5 z-20 bg-surface-container-high border border-outline-variant/40 rounded-xl shadow-2xl overflow-hidden min-w-[152px]"
            >
              {Object.entries(STATUS_CFG).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => { onSelect(k); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-left transition-colors hover:bg-surface-container-highest',
                    k === current ? cn(v.color) : 'text-on-surface-variant'
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', v.dot)} />
                  {v.label}
                  {k === current && <Check className="w-3 h-3 ml-auto" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIME PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────

function TimeBar({ estimated, actual }: { estimated?: number | null; actual?: number | null }) {
  if (!estimated) return null;
  const pct  = Math.min(100, Math.round(((actual ?? 0) / estimated) * 100));
  const over = (actual ?? 0) > estimated;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-surface-container-highest rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', over ? 'bg-error' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn('text-[9px] font-bold tabular-nums whitespace-nowrap', over ? 'text-error' : 'text-on-surface-variant opacity-40')}>
        {actual ?? 0}/{estimated}m
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// TASK ROW
// ─────────────────────────────────────────────────────────────────────────────

function TaskRow({
  task, onEdit, onDelete, onToggle, onStatusChange, onTaskUpdated,
}: {
  task: any;
  onEdit: (t: any) => void;
  onDelete: (t: any) => void;
  onToggle: (id: string, status: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onTaskUpdated: (task: any) => void;
}) {
  const [expanded, setExpanded]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]   = useState(false);

  const pCfg       = PRIORITY_CFG[task.priority]  ?? PRIORITY_CFG.NORMAL;
  const PIcon      = pCfg.icon;
  const isCompleted = task.status === 'COMPLETED';
  const isArchived  = task.status === 'ARCHIVED';
  const overdue    = isOverdue(task.dueDate, task.status);
  const dueSoon    = isDueSoon(task.dueDate) && !isCompleted && !overdue;
  const tags       = parseTags(task.tags);
  const hasExtra   = task.description || tags.length > 0 || task.estimatedTime || (task.focusSessions && task.focusSessions.length > 0);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.tasks.delete(task.id);
      onDelete(task);
    } catch (err) {
      console.error('Delete failed', err);
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, height: 0 }}
      transition={{ duration: 0.22 }}
      className={cn(
        'group relative rounded-xl border transition-all duration-200',
        isCompleted || isArchived
          ? 'bg-surface-container/40 border-outline-variant/15 opacity-55'
          : overdue
          ? 'bg-error/3 border-error/20 hover:border-error/30'
          : 'bg-surface-container border-outline-variant/35 hover:border-outline-variant/65 hover:bg-surface-container-high/30'
      )}
    >
      {/* Delete confirm overlay */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 bg-surface-container-high/95 backdrop-blur-sm rounded-xl flex items-center gap-3 px-4"
          >
            <Trash2 className="w-4 h-4 text-error shrink-0" />
            <p className="text-xs font-bold text-on-surface flex-1 truncate">
              ¿Eliminar "<span className="text-error">{task.title}</span>"?
            </p>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => setConfirming(false)}
                className="px-3 py-1.5 rounded-lg border border-outline-variant/40 text-[10px] font-bold text-on-surface-variant hover:bg-surface-container-highest transition-all"
              >
                No
              </button>
              <button
                onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error text-white text-[10px] font-bold active:scale-95 transition-all disabled:opacity-60"
              >
                {deleting
                  ? <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : <><Trash2 className="w-3 h-3" /> Eliminar</>
                }
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main row ── */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Complete toggle */}
        <button
          onClick={() => onToggle(task.id, task.status)}
          className="shrink-0 active:scale-90 transition-transform"
        >
          {isCompleted
            ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            : <Circle className="w-5 h-5 text-on-surface-variant/25 group-hover:text-on-surface-variant/55 transition-colors" />
          }
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'text-sm font-semibold leading-snug',
              isCompleted || isArchived ? 'line-through text-on-surface-variant opacity-35' : 'text-on-surface'
            )}>
              {task.title}
            </span>

            <div className={cn(
              'hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest border',
              pCfg.color, pCfg.bg, pCfg.border
            )}>
              <PIcon className="w-2.5 h-2.5" /> {pCfg.label}
            </div>

            {overdue && (
              <span className="text-[9px] font-bold text-error bg-error/10 border border-error/20 px-1.5 py-0.5 rounded-md uppercase tracking-widest">
                Vencida
              </span>
            )}
            {dueSoon && (
              <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-md uppercase tracking-widest">
                Pronto
              </span>
            )}
          </div>

          {/* Sub-row: project + date + tags */}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {task.project && (
              <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-30">
                <FolderOpen className="w-3 h-3" /> {task.project.title}
              </div>
            )}
            {task.dueDate && (
              <div className={cn(
                'flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest',
                overdue ? 'text-error opacity-70' : dueSoon ? 'text-amber-400 opacity-70' : 'text-on-surface-variant opacity-30'
              )}>
                <Calendar className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
              </div>
            )}
            {tags.slice(0, 2).map(t => (
              <span key={t} className="text-[9px] font-bold text-primary opacity-60 flex items-center gap-0.5">
                <Hash className="w-2.5 h-2.5" />{t}
              </span>
            ))}
            {tags.length > 2 && (
              <span className="text-[9px] text-on-surface-variant opacity-25">+{tags.length - 2}</span>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Edit — visible on hover */}
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 rounded-lg text-on-surface-variant opacity-0 group-hover:opacity-25 hover:!opacity-80 hover:bg-surface-container-high transition-all"
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            onClick={() => setConfirming(true)}
            className="p-1.5 rounded-lg text-on-surface-variant opacity-0 group-hover:opacity-25 hover:!opacity-80 hover:text-error hover:bg-error/8 transition-all"
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Expand (if has extra content) */}
          {hasExtra && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1.5 rounded-lg text-on-surface-variant opacity-0 group-hover:opacity-30 hover:!opacity-70 hover:bg-surface-container-high transition-all"
            >
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', expanded && 'rotate-180')} />
            </button>
          )}
        </div>
      </div>

      {/* Status row — always visible below main */}
      <div className="px-4 pb-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <StatusDropdown current={task.status} onSelect={s => onStatusChange(task.id, s)} />
          
          {/* Start focus session button */}
          {!isCompleted && !isArchived && (
            <button
              type="button"
              onClick={() => {
                useAppStore.getState().setActiveFocusTaskId(task.id);
                useAppStore.getState().setRightPanelOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 active:scale-95 transition-all text-[9px] font-bold uppercase tracking-widest"
              title="Iniciar contador de enfoque"
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>Enfocar</span>
            </button>
          )}
        </div>

        {(task.estimatedTime || task.actualTime) && !expanded && (
          <div className="flex-1 max-w-[160px] flex justify-end">
            {task.estimatedTime ? (
              <div className="w-full">
                <TimeBar estimated={task.estimatedTime} actual={task.actualTime} />
              </div>
            ) : task.actualTime ? (
              <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-45 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" />
                Enfoque: {task.actualTime}m
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Expanded detail panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-outline-variant/10 space-y-3">
              {task.description && (
                <div className="flex gap-2">
                  <AlignLeft className="w-3.5 h-3.5 text-on-surface-variant opacity-25 shrink-0 mt-0.5" />
                  <p className="text-xs text-on-surface-variant opacity-55 leading-relaxed">{task.description}</p>
                </div>
              )}
              {task.estimatedTime && (
                <div className="flex gap-2 items-center">
                  <Timer className="w-3.5 h-3.5 text-on-surface-variant opacity-25 shrink-0" />
                  <div className="flex-1">
                    <TimeBar estimated={task.estimatedTime} actual={task.actualTime} />
                  </div>
                </div>
              )}
              {tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag className="w-3.5 h-3.5 text-on-surface-variant opacity-25" />
                  {tags.map(t => (
                    <span key={t} className="text-[9px] font-bold bg-primary/8 text-primary border border-primary/12 px-2 py-0.5 rounded-md">
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Focus Sessions History */}
              {task.focusSessions && task.focusSessions.length > 0 && (
                <div className="pt-2 border-t border-outline-variant/10 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-45">
                    <History className="w-3.5 h-3.5 text-primary" />
                    <span>Tiempos de Trabajo ({task.focusSessions.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[120px] overflow-y-auto pt-1">
                    {task.focusSessions.map((session: any) => {
                      const dateStr = new Date(session.createdAt).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      const mins = Math.max(1, Math.round(session.duration / 60));
                      return (
                        <div key={session.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/10 text-xs text-on-surface">
                          <span className="text-on-surface-variant/70 text-[10px]">{dateStr}</span>
                          <span className="font-mono text-primary font-bold text-[10px] gap-1 flex items-center">
                            <Clock className="w-2.5 h-2.5 text-primary/60" />
                            {mins} {mins === 1 ? 'min' : 'mins'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function Tasks() {
  const [tasks, setTasks]       = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [modal, setModal]       = useState<'create' | any | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([api.tasks.list(), api.projects.list()]);
      setTasks(t); setProjects(p);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const tasksRefreshNeed = useAppStore(state => state.tasksRefreshNeed);

  useEffect(() => { loadAll(); }, [loadAll, tasksRefreshNeed]);

  // ── Handlers ──
  const handleToggle = async (id: string, currentStatus: string) => {
    const next = currentStatus === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: next } : t));
    try { await api.tasks.update(id, { status: next }); }
    catch { setTasks(prev => prev.map(t => t.id === id ? { ...t, status: currentStatus } : t)); }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const old = tasks.find(t => t.id === id)?.status;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    try { await api.tasks.update(id, { status: newStatus }); }
    catch { setTasks(prev => prev.map(t => t.id === id ? { ...t, status: old } : t)); }
  };

  const handleDelete = (task: any) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));
  };

  // ── Derived ──
  // COMPLETED and ARCHIVED are hidden from ALL — only shown when explicitly filtered
  const HIDDEN_FROM_ALL = ['COMPLETED', 'ARCHIVED'];

  const tabCounts = useMemo(() => {
    const map: Record<string, number> = {
      ALL: tasks.filter(t => !HIDDEN_FROM_ALL.includes(t.status)).length,
    };
    tasks.forEach(t => { map[t.status] = (map[t.status] ?? 0) + 1; });
    return map;
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    if (activeTab === 'ALL') return tasks.filter(t => !HIDDEN_FROM_ALL.includes(t.status));
    return tasks.filter(t => t.status === activeTab);
  }, [tasks, activeTab]);

  const overdueCount = useMemo(() =>
    tasks.filter(t => isOverdue(t.dueDate, t.status)).length,
  [tasks]);

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
          <TaskModal
            task={modal === 'create' ? null : modal}
            projects={projects}
            onClose={() => setModal(null)}
            onSaved={() => { loadAll(); setModal(null); }}
          />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-primary opacity-70 mb-1.5">Task Manager</p>
          <h2 className="font-display text-4xl font-black text-on-surface tracking-tighter leading-none">Tareas</h2>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-sm text-on-surface-variant opacity-50">Enfócate en lo que importa.</p>
            {overdueCount > 0 && (
              <span className="text-[9px] font-bold text-error bg-error/10 border border-error/20 px-2 py-0.5 rounded-md uppercase tracking-widest">
                {overdueCount} vencida{overdueCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-primary text-on-primary shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Nueva tarea
        </button>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
        {FILTER_TABS.map(tab => {
          const count = tabCounts[tab.id] ?? 0;
          const cfg   = STATUS_CFG[tab.id];
          const isActive = activeTab === tab.id;
          if (tab.id !== 'ALL' && count === 0) return null;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant opacity-45 hover:opacity-75 hover:bg-surface-container-high'
              )}
            >
              {cfg && (
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  isActive ? 'bg-primary' : cfg.dot
                )} />
              )}
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  'text-[9px] font-black px-1.5 rounded-md',
                  isActive ? 'bg-primary/20 text-primary' : 'bg-surface-container-high text-on-surface-variant'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Task list ── */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {visibleTasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onEdit={t => setModal(t)}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onStatusChange={handleStatusChange}
              onTaskUpdated={(updatedTask) => {
                setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
              }}
            />
          ))}

          {visibleTasks.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 bg-surface-container rounded-2xl border border-dashed border-outline-variant/30 flex flex-col items-center justify-center gap-3 text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-on-surface-variant opacity-20" />
              </div>
              <p className="text-sm text-on-surface-variant opacity-35">
                {activeTab === 'ALL'
                  ? 'Sin tareas. ¡Hora de planear!'
                  : `Sin tareas en "${STATUS_CFG[activeTab]?.label ?? activeTab}".`
                }
              </p>
              {activeTab === 'ALL' && (
                <button
                  onClick={() => setModal('create')}
                  className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60 hover:opacity-100 transition-opacity"
                >
                  + Crear la primera
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}