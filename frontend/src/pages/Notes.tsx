// frontend/src/pages/Notes.tsx
import  {
  useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Search, StickyNote, Trash2, Edit3, Clock,
  Pin, X, Check, ChevronDown, Eye, Code2, Sparkles,
  LayoutGrid, List, ArrowDownUp, Tag, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  color: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = 'grid' | 'list';
type SortKey  = 'updatedAt' | 'createdAt' | 'title';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const PALETTE = [
  { color: '#4d8eff', label: 'Azul'     },
  { color: '#7c5cfc', label: 'Violeta'  },
  { color: '#36c27a', label: 'Verde'    },
  { color: '#f9a03f', label: 'Naranja'  },
  { color: '#f25c54', label: 'Rojo'     },
  { color: '#e91e8c', label: 'Rosa'     },
  { color: '#0dcaf0', label: 'Cian'     },
  { color: '#8b949e', label: 'Gris'     },
];

const DEFAULT_CATEGORIES = ['General', 'Trabajo', 'Personal', 'Ideas', 'Estudio', 'Hábitos'];

function relativeDate(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1)  return 'ahora mismo';
  if (diff < 60) return `hace ${diff} min`;
  const h = Math.floor(diff / 60);
  if (h < 24)   return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)    return `hace ${d}d`;
  return new Date(dateStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMPLE MARKDOWN RENDERER  (sin dependencias externas)
// ─────────────────────────────────────────────────────────────────────────────

function renderMarkdown(text: string): string {
  return text
    // Escape HTML
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-surface-container-highest rounded-lg px-3 py-2 text-xs font-mono my-2 overflow-x-auto whitespace-pre-wrap"><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-surface-container-highest rounded px-1 py-0.5 text-xs font-mono">$1</code>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    // Headings
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 class="text-lg font-bold mt-4 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    // Checkboxes
    .replace(/^- \[x\] (.+)$/gm, '<div class="flex items-start gap-2 my-0.5"><span class="mt-0.5 w-4 h-4 rounded bg-primary flex items-center justify-center shrink-0"><svg viewBox="0 0 10 10" class="w-2.5 h-2.5 text-on-primary fill-none stroke-current stroke-2"><polyline points="2,5 4,7 8,3"/></svg></span><span class="line-through opacity-50">$1</span></div>')
    .replace(/^- \[ \] (.+)$/gm,'<div class="flex items-start gap-2 my-0.5"><span class="mt-0.5 w-4 h-4 rounded border-2 border-outline-variant/50 shrink-0"></span><span>$1</span></div>')
    // Unordered list
    .replace(/^[-*] (.+)$/gm,  '<div class="flex items-start gap-2 my-0.5"><span class="mt-2 w-1.5 h-1.5 rounded-full bg-on-surface-variant opacity-40 shrink-0"></span><span>$1</span></div>')
    // Ordered list
    .replace(/^\d+\. (.+)$/gm, (_, p1, offset, str) => {
      const num = str.slice(0, offset).split('\n').filter((l: string) => /^\d+\./.test(l)).length + 1;
      return `<div class="flex items-start gap-2 my-0.5"><span class="text-xs font-bold opacity-40 shrink-0 w-4 text-right">${num}.</span><span>${p1}</span></div>`;
    })
    // Blockquote
    .replace(/^> (.+)$/gm, '<div class="border-l-2 border-primary/40 pl-3 my-1 text-on-surface-variant opacity-70 italic">$1</div>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="border-outline-variant/20 my-3"/>')
    // Paragraphs: double newline → paragraph break
    .replace(/\n\n+/g, '</p><p class="mb-2">')
    // Single newline → line break
    .replace(/\n/g, '<br/>');
}

function MarkdownPreview({ content, className }: { content: string; className?: string }) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none text-on-surface-variant text-sm leading-relaxed',
        '[&_strong]:text-on-surface [&_strong]:font-bold',
        '[&_em]:italic [&_del]:line-through',
        '[&_h1]:text-on-surface [&_h2]:text-on-surface [&_h3]:text-on-surface',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: `<p class="mb-2">${renderMarkdown(content)}</p>` }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTE MODAL  (Create & Edit, full editor)
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: '', content: '', category: 'General', color: '#4d8eff', isPinned: false,
};

function NoteModal({ note, onClose, onSaved }: {
  note?: Note | null;
  onClose: () => void;
  onSaved: (n: Note) => void;
}) {
  const isEdit = !!note;
  const [form, setForm] = useState(() =>
    note ? {
      title:    note.title,
      content:  note.content,
      category: note.category,
      color:    note.color,
      isPinned: note.isPinned,
    } : { ...EMPTY_FORM }
  );
  const [preview, setPreview]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [customCat, setCustomCat]   = useState('');
  const [showCatInput, setShowCatInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(200, ta.scrollHeight)}px`;
  }, [form.content]);

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true); setError('');
    try {
      const payload = {
        title:    form.title.trim(),
        content:  form.content,
        category: form.category,
        color:    form.color,
        isPinned: form.isPinned,
      };
      const saved = isEdit
        ? await api.notes.update(note!.id, payload)
        : await api.notes.create(payload);
      onSaved(saved);
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
      setSaving(false);
    }
  };

  // Toolbar actions for textarea
  const insertMarkdown = (before: string, after = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const sel   = form.content.slice(start, end);
    const newVal = form.content.slice(0, start) + before + sel + after + form.content.slice(end);
    set('content', newVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + sel.length);
    }, 0);
  };

  const toolbarBtns = [
    { label: 'B',  title: 'Negrita',      action: () => insertMarkdown('**', '**'),  cls: 'font-black' },
    { label: 'I',  title: 'Cursiva',      action: () => insertMarkdown('*', '*'),    cls: 'italic'     },
    { label: 'S',  title: 'Tachado',      action: () => insertMarkdown('~~', '~~'),  cls: 'line-through'},
    { label: '`',  title: 'Código',       action: () => insertMarkdown('`', '`'),    cls: 'font-mono'  },
    { label: '# ', title: 'Heading',      action: () => insertMarkdown('# '),        cls: ''           },
    { label: '> ', title: 'Cita',         action: () => insertMarkdown('> '),        cls: ''           },
    { label: '- ', title: 'Lista',        action: () => insertMarkdown('- '),        cls: ''           },
    { label: '☐',  title: 'Tarea',        action: () => insertMarkdown('- [ ] '),   cls: ''           },
  ];

  const inputCls = "w-full bg-surface-container-low border border-outline-variant/40 focus:border-primary/70 text-on-surface text-sm px-4 py-2.5 rounded-xl focus:outline-none transition-all placeholder:text-on-surface-variant/25";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 bg-background/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-surface-container border border-outline-variant/40 rounded-3xl shadow-2xl flex flex-col max-h-[92vh]"
      >
        {/* Color bar */}
        <div className="h-1 rounded-t-3xl transition-all duration-300" style={{ background: form.color }} />

        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-center gap-3 shrink-0">
          {/* Pin toggle */}
          <button
            onClick={() => set('isPinned', !form.isPinned)}
            className={cn(
              'p-2 rounded-xl transition-all',
              form.isPinned
                ? 'bg-primary/15 text-primary'
                : 'text-on-surface-variant/30 hover:text-on-surface-variant hover:bg-surface-container-high',
            )}
            title={form.isPinned ? 'Desanclar' : 'Anclar'}
          >
            <Pin className="w-4 h-4" />
          </button>

          <input
            type="text"
            placeholder="Título de la nota..."
            value={form.title}
            onChange={e => set('title', e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-on-surface font-display text-xl font-bold focus:outline-none placeholder:text-on-surface-variant/25 tracking-tight"
          />

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-surface-container-high transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meta row: category + color */}
        <div className="px-6 pb-3 flex items-center gap-3 flex-wrap shrink-0 border-b border-outline-variant/15">
          {/* Category */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag className="w-3 h-3 text-on-surface-variant opacity-30" />
            {DEFAULT_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => set('category', cat)}
                className={cn(
                  'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-all',
                  form.category === cat
                    ? 'text-on-primary'
                    : 'text-on-surface-variant opacity-35 hover:opacity-60 hover:bg-surface-container-high',
                )}
                style={form.category === cat ? { background: form.color } : {}}
              >
                {cat}
              </button>
            ))}
            {showCatInput ? (
              <div className="flex items-center gap-1">
                <input
                  type="text" autoFocus placeholder="Nueva..."
                  value={customCat}
                  onChange={e => setCustomCat(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && customCat.trim()) {
                      set('category', customCat.trim());
                      setShowCatInput(false);
                      setCustomCat('');
                    }
                    if (e.key === 'Escape') setShowCatInput(false);
                  }}
                  className="text-[9px] font-bold uppercase tracking-widest w-20 bg-surface-container-high border border-primary/40 rounded-lg px-2 py-1 focus:outline-none"
                />
                <button onClick={() => setShowCatInput(false)} className="text-on-surface-variant/40 hover:text-on-surface-variant">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCatInput(true)}
                className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg text-on-surface-variant opacity-25 hover:opacity-50 hover:bg-surface-container-high transition-all"
              >
                + Otra
              </button>
            )}
          </div>

          {/* Color palette */}
          <div className="flex items-center gap-1.5 ml-auto">
            {PALETTE.map(({ color }) => (
              <button
                key={color}
                onClick={() => set('color', color)}
                className="w-5 h-5 rounded-full transition-all"
                style={{
                  background: color,
                  transform: form.color === color ? 'scale(1.3)' : 'scale(1)',
                  boxShadow: form.color === color
                    ? `0 0 0 2px var(--color-surface-container), 0 0 0 3.5px ${color}`
                    : 'none',
                }}
                title={PALETTE.find(p => p.color === color)?.label}
              />
            ))}
          </div>
        </div>

        {/* Editor toolbar */}
        <div className="px-6 py-2 flex items-center gap-0.5 border-b border-outline-variant/10 shrink-0">
          {toolbarBtns.map(btn => (
            <button
              key={btn.label}
              onClick={btn.action}
              title={btn.title}
              className={cn(
                'px-2 py-1 rounded-lg text-[11px] text-on-surface-variant opacity-40 hover:opacity-80 hover:bg-surface-container-high transition-all min-w-[28px] text-center',
                btn.cls,
              )}
            >
              {btn.label}
            </button>
          ))}
          <div className="flex-1" />
          {/* Preview toggle */}
          <button
            onClick={() => setPreview(p => !p)}
            className={cn(
              'flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border transition-all',
              preview
                ? 'bg-primary/10 text-primary border-primary/25'
                : 'text-on-surface-variant opacity-35 border-transparent hover:opacity-60 hover:bg-surface-container-high',
            )}
          >
            {preview ? <Code2 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {preview ? 'Editar' : 'Preview'}
          </button>
        </div>

        {/* Editor / Preview */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[200px]">
          <AnimatePresence mode="wait">
            {preview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                {form.content.trim()
                  ? <MarkdownPreview content={form.content} />
                  : <p className="text-on-surface-variant opacity-20 text-sm italic">Nada que previsualizar aún...</p>
                }
              </motion.div>
            ) : (
              <motion.div
                key="editor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <textarea
                  ref={textareaRef}
                  placeholder="Escribe tu nota aquí... soporta **markdown**, `código`, - listas, - [ ] tareas..."
                  value={form.content}
                  onChange={e => set('content', e.target.value)}
                  onKeyDown={e => {
                    // Tab inserts spaces instead of losing focus
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      insertMarkdown('  ');
                    }
                  }}
                  className="w-full bg-transparent text-on-surface text-sm leading-relaxed resize-none focus:outline-none placeholder:text-on-surface-variant/20 font-mono"
                  style={{ minHeight: '200px' }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/15 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[10px] text-on-surface-variant opacity-25 font-mono">
            {form.content.length} chars · {form.content.split(/\s+/).filter(Boolean).length} palabras
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-error">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-container-high transition-all border border-outline-variant/30"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !form.title.trim()}
              className="flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-sm text-on-primary transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg"
              style={{ background: form.color, boxShadow: `0 4px 16px ${form.color}40` }}
            >
              {saving
                ? <><span className="w-4 h-4 rounded-full border-2 border-on-primary/30 border-t-on-primary animate-spin" />Guardando...</>
                : <><Check className="w-4 h-4" />{isEdit ? 'Guardar' : 'Crear nota'}</>
              }
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTE CARD  (grid)
// ─────────────────────────────────────────────────────────────────────────────

function NoteCard({ note, index, onEdit, onDelete, onPinToggle }: {
  note: Note; index: number;
  onEdit: (n: Note) => void;
  onDelete: (n: Note) => void;
  onPinToggle: (n: Note) => void;
}) {
  const hasContent = note.content.trim().length > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="group relative bg-surface-container border border-outline-variant/25 rounded-2xl overflow-hidden flex flex-col hover:border-outline-variant/55 hover:shadow-lg hover:shadow-black/5 transition-all duration-300 cursor-pointer"
      onClick={() => onEdit(note)}
    >
      {/* Color accent top */}
      <div className="h-[3px] w-full" style={{ background: note.color }} />

      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              {note.isPinned && (
                <Pin className="w-3 h-3 shrink-0" style={{ color: note.color }} />
              )}
              <span
                className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
                style={{ color: note.color, background: `${note.color}18` }}
              >
                {note.category}
              </span>
            </div>
            <h4 className="font-display text-base font-bold text-on-surface tracking-tight leading-snug truncate">
              {note.title}
            </h4>
          </div>

          {/* Actions — visible on hover */}
          <div
            className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => onPinToggle(note)}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                note.isPinned
                  ? 'text-primary bg-primary/10'
                  : 'text-on-surface-variant hover:bg-surface-container-high',
              )}
              title={note.isPinned ? 'Desanclar' : 'Anclar'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onEdit(note)}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all"
              title="Editar"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(note)}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/8 transition-all"
              title="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content preview */}
        {hasContent && (
          <div className="flex-1">
            <MarkdownPreview
              content={note.content}
              className="line-clamp-5 text-xs opacity-60 pointer-events-none"
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-outline-variant/10">
          <span className="flex items-center gap-1 text-[9px] font-bold text-on-surface-variant opacity-30 uppercase tracking-widest">
            <Clock className="w-3 h-3" />
            {relativeDate(note.updatedAt)}
          </span>
          <span className="text-[9px] font-bold text-on-surface-variant opacity-20 uppercase tracking-widest">
            {note.content.split(/\s+/).filter(Boolean).length} palabras
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTE ROW  (list)
// ─────────────────────────────────────────────────────────────────────────────

function NoteRow({ note, index, onEdit, onDelete, onPinToggle }: {
  note: Note; index: number;
  onEdit: (n: Note) => void;
  onDelete: (n: Note) => void;
  onPinToggle: (n: Note) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ delay: index * 0.03, duration: 0.22 }}
      className="group flex items-center gap-4 bg-surface-container border border-outline-variant/25 rounded-xl px-4 py-3 hover:border-outline-variant/55 hover:bg-surface-container-high/30 transition-all cursor-pointer"
      onClick={() => onEdit(note)}
    >
      {/* Color dot */}
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: note.color }} />

      {/* Pin indicator */}
      {note.isPinned && <Pin className="w-3 h-3 shrink-0" style={{ color: note.color }} />}

      {/* Title */}
      <p className="flex-1 text-sm font-bold text-on-surface truncate">{note.title}</p>

      {/* Category */}
      <span
        className="hidden sm:block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shrink-0"
        style={{ color: note.color, background: `${note.color}18` }}
      >
        {note.category}
      </span>

      {/* Preview snippet */}
      <p className="hidden md:block text-xs text-on-surface-variant opacity-40 truncate max-w-[200px] shrink-0">
        {note.content.replace(/[#*`>_~\[\]]/g, '').slice(0, 60)}
      </p>

      {/* Date */}
      <span className="hidden sm:block text-[10px] text-on-surface-variant opacity-30 font-bold shrink-0">
        {relativeDate(note.updatedAt)}
      </span>

      {/* Actions */}
      <div
        className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => onPinToggle(note)}
          className={cn(
            'p-1.5 rounded-lg transition-all',
            note.isPinned ? 'text-primary' : 'text-on-surface-variant hover:bg-surface-container-high',
          )}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(note)}
          className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/8 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE DIALOG
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
        transition={{ duration: 0.16 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-surface-container border border-outline-variant/40 rounded-2xl p-6 shadow-2xl"
      >
        <div className="w-11 h-11 rounded-2xl bg-error/10 flex items-center justify-center mb-4">
          <Trash2 className="w-5 h-5 text-error" />
        </div>
        <h3 className="font-display text-lg font-black text-on-surface mb-1">¿Eliminar nota?</h3>
        <p className="text-sm text-on-surface-variant opacity-50 mb-5">
          "<span className="font-bold opacity-80">{title}</span>" se eliminará permanentemente.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-outline-variant/40 text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-all">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-error text-white text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading
              ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Eliminando...</>
              : <><Trash2 className="w-4 h-4" />Eliminar</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function Notes() {
  const [notes, setNotes]             = useState<Note[]>([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState<'create' | Note | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [deleting, setDeleting]       = useState(false);
  const [search, setSearch]           = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');
  const [viewMode, setViewMode]       = useState<ViewMode>('grid');
  const [sortKey, setSortKey]         = useState<SortKey>('updatedAt');
  const [showSort, setShowSort]       = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Fetch ──
  const fetchNotes = useCallback(async () => {
    try {
      const data = await api.notes.list();
      setNotes(data);
    } catch (err) {
      console.error('Failed to fetch notes', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'n') { e.preventDefault(); setModal('create'); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Handlers ──
  const handleSaved = (saved: Note) => {
    setNotes(prev => {
      const exists = prev.find(n => n.id === saved.id);
      return exists
        ? prev.map(n => n.id === saved.id ? saved : n)
        : [saved, ...prev];
    });
    setModal(null);
  };

  const handlePinToggle = async (note: Note) => {
    const updated = { ...note, isPinned: !note.isPinned };
    setNotes(prev => prev.map(n => n.id === note.id ? updated : n));
    try { await api.notes.update(note.id, { isPinned: !note.isPinned }); }
    catch { fetchNotes(); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.notes.delete(deleteTarget.id);
      setNotes(prev => prev.filter(n => n.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setDeleting(false);
    }
  };

  // ── Derived ──
  const categories = useMemo(() => {
    const cats = Array.from(new Set(notes.map(n => n.category)));
    return ['Todas', ...cats];
  }, [notes]);

  const pinned    = notes.filter(n => n.isPinned).length;
  const wordCount = notes.reduce((a, n) => a + n.content.split(/\s+/).filter(Boolean).length, 0);

  const filtered = useMemo(() => {
    let list = [...notes];

    if (categoryFilter !== 'Todas') list = list.filter(n => n.category === categoryFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      // Pinned always first
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (sortKey === 'title') return a.title.localeCompare(b.title, 'es');
      return new Date(b[sortKey]).getTime() - new Date(a[sortKey]).getTime();
    });

    return list;
  }, [notes, search, categoryFilter, sortKey]);

  // ── Skeleton ──
  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        <div className="h-12 bg-surface-container rounded-2xl animate-pulse w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-surface-container rounded-2xl h-48 animate-pulse border border-outline-variant/20"
              style={{ animationDelay: `${i * 70}ms` }} />
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
          <NoteModal
            note={modal === 'create' ? null : modal}
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
            Knowledge Base
          </p>
          <h2 className="font-display text-4xl font-black text-on-surface tracking-tighter leading-none">
            Notas
          </h2>
          {notes.length > 0 && (
            <p className="text-sm text-on-surface-variant opacity-45 mt-1.5">
              {notes.length} nota{notes.length !== 1 ? 's' : ''} ·{' '}
              {pinned > 0 && <>{pinned} anclada{pinned !== 1 ? 's' : ''} · </>}
              {wordCount.toLocaleString('es-CO')} palabras en total
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <p className="hidden sm:block text-[10px] text-on-surface-variant opacity-25 font-mono">
            <kbd className="px-1.5 py-0.5 rounded border border-outline-variant/30 text-[9px]">n</kbd> nueva
          </p>
          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-primary text-on-primary shadow-md shadow-primary/25 hover:bg-primary/90 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Nueva nota
          </button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant opacity-30" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar notas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant/40 focus:border-primary/60 text-on-surface text-sm pl-9 pr-8 py-2 rounded-xl focus:outline-none transition-all placeholder:text-on-surface-variant/25"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface-variant">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-1 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all',
                categoryFilter === cat
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant opacity-40 hover:opacity-70 hover:bg-surface-container-high',
              )}
            >
              {cat} {cat !== 'Todas' && `(${notes.filter(n => n.category === cat).length})`}
            </button>
          ))}
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
              <ArrowDownUp className="w-3.5 h-3.5" />
              {{updatedAt: 'Modificado', createdAt: 'Creado', title: 'A–Z'}[sortKey]}
            </button>
            <AnimatePresence>
              {showSort && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.93, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.93 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-1.5 z-20 bg-surface-container-high border border-outline-variant/40 rounded-xl shadow-2xl overflow-hidden min-w-[150px]"
                  >
                    {([
                      ['updatedAt', 'Últimas modificadas'],
                      ['createdAt', 'Más recientes'],
                      ['title',     'Orden A–Z'],
                    ] as [SortKey, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => { setSortKey(key); setShowSort(false); }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3.5 py-2.5 text-[11px] font-bold text-left transition-colors',
                          sortKey === key
                            ? 'bg-primary/10 text-primary'
                            : 'text-on-surface-variant hover:bg-surface-container-highest',
                        )}
                      >
                        {label}
                        {sortKey === key && <Check className="w-3 h-3 ml-auto" />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-surface-container border border-outline-variant/30 rounded-xl p-1 gap-0.5">
            {([['grid', LayoutGrid], ['list', List]] as const).map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  viewMode === mode
                    ? 'bg-surface-container-high text-on-surface'
                    : 'text-on-surface-variant opacity-30 hover:opacity-60',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search results count */}
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

      {/* ── Notes grid/list ── */}
      {notes.length === 0 ? (
        /* First-time empty state */
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-24 flex flex-col items-center justify-center text-center gap-5"
        >
          <div className="relative">
            <div className="w-20 h-20 bg-surface-container rounded-3xl flex items-center justify-center">
              <StickyNote className="w-9 h-9 text-on-surface-variant opacity-15" />
            </div>
            <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-on-primary" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-on-surface opacity-60 mb-1">Sin notas aún</h3>
            <p className="text-sm text-on-surface-variant opacity-35 max-w-[240px] leading-relaxed">
              Captura ideas, tareas y reflexiones con soporte para markdown.
            </p>
          </div>
          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-primary bg-primary/10 hover:bg-primary/15 px-5 py-2.5 rounded-xl transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Crear primera nota
          </button>
        </motion.div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-16 text-center text-sm text-on-surface-variant opacity-35"
              >
                Sin resultados para "{search || categoryFilter}"
              </motion.div>
            ) : (
              filtered.map((note, i) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  index={i}
                  onEdit={n => setModal(n)}
                  onDelete={setDeleteTarget}
                  onPinToggle={handlePinToggle}
                />
              ))
            )}
          </AnimatePresence>

          {/* Quick-add card */}
          <motion.button
            layout
            onClick={() => setModal('create')}
            className="min-h-[160px] bg-surface-container/30 border-2 border-dashed border-outline-variant/15 rounded-2xl flex flex-col items-center justify-center gap-3 group hover:bg-surface-container/60 hover:border-outline-variant/30 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-primary/10">
              <Plus className="w-5 h-5 text-on-surface-variant opacity-30 group-hover:text-primary group-hover:opacity-100 transition-all" />
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-25 group-hover:opacity-50 transition-opacity">
              Nota rápida
            </p>
          </motion.button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* List header */}
          {filtered.length > 0 && (
            <div className="hidden md:flex items-center gap-4 px-4 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant opacity-25">
              <div className="w-2.5 shrink-0" />
              <span className="flex-1">Título</span>
              <span className="w-24 shrink-0 hidden sm:block">Categoría</span>
              <span className="w-48 shrink-0 hidden md:block">Contenido</span>
              <span className="w-20 shrink-0 hidden sm:block">Modificado</span>
              <span className="w-16 shrink-0" />
            </div>
          )}
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 text-center text-sm text-on-surface-variant opacity-35"
              >
                Sin resultados para "{search || categoryFilter}"
              </motion.div>
            ) : (
              filtered.map((note, i) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  index={i}
                  onEdit={n => setModal(n)}
                  onDelete={setDeleteTarget}
                  onPinToggle={handlePinToggle}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}