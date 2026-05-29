// frontend/src/pages/Finance.tsx
import  { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, ArrowUpRight, ArrowDownRight, MoreHorizontal, Wallet,
  ShoppingCart, Coffee, Car, HeartPulse, BookOpen, Gamepad2,
  Home, Zap, Utensils, TrendingUp, Repeat2, DollarSign,
  Trash2, X, ChevronLeft, ChevronRight, Calendar, ChevronDown,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  INCOME:       { label: 'Ingreso',     color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', stripe: 'bg-emerald-400', sign: '+' },
  EXPENSE:      { label: 'Gasto',       color: 'text-rose-400',    bg: 'bg-rose-400/10',    border: 'border-rose-400/20',    stripe: 'bg-rose-400',    sign: '−' },
  INVESTMENT:   { label: 'Inversión',   color: 'text-primary',     bg: 'bg-primary/10',     border: 'border-primary/20',     stripe: 'bg-primary',     sign: '↗' },
  SUBSCRIPTION: { label: 'Suscripción', color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20',   stripe: 'bg-amber-400',   sign: '~' },
} as const;

const EXPENSE_CATEGORIES = [
  { id: 'COMIDA',          label: 'Comida',        icon: Utensils,      color: 'text-orange-400',  bg: 'bg-orange-400/10'  },
  { id: 'CAFE',            label: 'Café/Snack',    icon: Coffee,        color: 'text-amber-400',   bg: 'bg-amber-400/10'   },
  { id: 'TRANSPORTE',      label: 'Transporte',    icon: Car,           color: 'text-sky-400',     bg: 'bg-sky-400/10'     },
  { id: 'MERCADO',         label: 'Mercado',       icon: ShoppingCart,  color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { id: 'SALUD',           label: 'Salud',         icon: HeartPulse,    color: 'text-rose-400',    bg: 'bg-rose-400/10'    },
  { id: 'VIVIENDA',        label: 'Vivienda',      icon: Home,          color: 'text-violet-400',  bg: 'bg-violet-400/10'  },
  { id: 'SERVICIOS',       label: 'Servicios',     icon: Zap,           color: 'text-yellow-400',  bg: 'bg-yellow-400/10'  },
  { id: 'EDUCACION',       label: 'Educación',     icon: BookOpen,      color: 'text-blue-400',    bg: 'bg-blue-400/10'    },
  { id: 'ENTRETENIMIENTO', label: 'Ocio',          icon: Gamepad2,      color: 'text-pink-400',    bg: 'bg-pink-400/10'    },
  { id: 'SUSCRIPCION',     label: 'Suscripción',   icon: Repeat2,       color: 'text-amber-400',   bg: 'bg-amber-400/10'   },
  { id: 'GASTO_HORMIGA',   label: 'Hormiga',       icon: Coffee,        color: 'text-red-400',     bg: 'bg-red-400/10'     },
  { id: 'OTRO',            label: 'Otro',          icon: MoreHorizontal,color: 'text-on-surface-variant', bg: 'bg-surface-container-high' },
];

const INCOME_CATEGORIES = [
  { id: 'SALARIO',   label: 'Salario',   icon: DollarSign,    color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { id: 'FREELANCE', label: 'Freelance', icon: Zap,           color: 'text-primary',     bg: 'bg-primary/10'     },
  { id: 'NEGOCIO',   label: 'Negocio',   icon: TrendingUp,    color: 'text-sky-400',     bg: 'bg-sky-400/10'     },
  { id: 'INVERSION', label: 'Inversión', icon: TrendingUp,    color: 'text-violet-400',  bg: 'bg-violet-400/10'  },
  { id: 'REGALO',    label: 'Regalo',    icon: Wallet,        color: 'text-pink-400',    bg: 'bg-pink-400/10'    },
  { id: 'OTRO_ING',  label: 'Otro',      icon: MoreHorizontal,color: 'text-on-surface-variant', bg: 'bg-surface-container-high' },
];

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

function getCatConfig(id: string) {
  return ALL_CATEGORIES.find(c => c.id === id) ?? {
    id, label: id, icon: MoreHorizontal,
    color: 'text-on-surface-variant', bg: 'bg-surface-container-high',
  };
}

function fmt(n: number) {
  return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtFull(n: number) {
  return n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMonthYear(date: Date) {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return `${months[date.getMonth()]} de ${date.getFullYear()}`;
}

function getDayLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00'); // enforce local interpretation
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const weekday = d.toLocaleDateString('es-CO', { weekday: 'long' });
  const day = d.getDate();
  const month = d.toLocaleDateString('es-CO', { month: 'long' });

  if (dateStr === todayStr) {
    return `Hoy, ${day} de ${month}`;
  } else if (dateStr === yesterdayStr) {
    return `Ayer, ${day} de ${month}`;
  } else {
    const formatted = `${weekday}, ${day} de ${month}`;
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICK ADD MODAL
// ─────────────────────────────────────────────────────────────────────────────

export function QuickAddModal({
  defaultType, onClose, onSaved,
}: {
  defaultType: 'INCOME' | 'EXPENSE' | 'INVESTMENT' | 'SUBSCRIPTION';
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle]       = useState('');
  const [amount, setAmount]     = useState('');
  const [type, setType]         = useState<string>(defaultType);
  const [category, setCategory] = useState('');
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const isIncome = type === 'INCOME';
  const cats = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => { setCategory(cats[0].id); }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !category) return;
    setSaving(true);
    setError('');
    try {
      await api.finance.create({
        title,
        amount: parseFloat(amount),
        type,
        category,
        date: new Date(date).toISOString(),
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const typeCfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];

  const modalContent = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-surface-container border border-outline-variant/40 rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-outline-variant/20">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-on-surface-variant opacity-40">
              Nueva Transacción
            </p>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Type pills */}
          <div className="flex gap-2 flex-wrap">
            {Object.entries(TYPE_CONFIG).map(([k, v]) => (
              <button
                key={k} type="button" onClick={() => setType(k)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border',
                  type === k
                    ? cn(v.color, v.bg, v.border)
                    : 'text-on-surface-variant opacity-40 border-transparent hover:opacity-70 hover:bg-surface-container-high'
                )}
              >
                {k === 'INCOME'       && <ArrowUpRight className="w-3 h-3" />}
                {k === 'EXPENSE'      && <ArrowDownRight className="w-3 h-3" />}
                {k === 'INVESTMENT'   && <TrendingUp className="w-3 h-3" />}
                {k === 'SUBSCRIPTION' && <Repeat2 className="w-3 h-3" />}
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-40">Monto</label>
            <div className="relative">
              <span className={cn('absolute left-4 top-1/2 -translate-y-1/2 font-display text-2xl font-black', typeCfg.color)}>
                {typeCfg.sign}
              </span>
              <input
                type="number" step="0.01" min="0" placeholder="0"
                value={amount} onChange={e => setAmount(e.target.value)}
                required autoFocus
                className="w-full bg-surface-container-low border border-outline-variant/50 focus:border-primary/50 text-on-surface font-display text-3xl font-black pl-10 pr-4 py-3 rounded-xl focus:outline-none transition-all placeholder:text-on-surface-variant/20 tracking-tighter"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-40">Descripción</label>
            <input
              type="text"
              placeholder={isIncome ? 'ej. Pago cliente, salario...' : 'ej. Tinto, mercado, arriendo...'}
              value={title} onChange={e => setTitle(e.target.value)} required
              className="w-full bg-surface-container-low border border-outline-variant/50 focus:border-primary/50 text-on-surface text-sm px-4 py-3 rounded-xl focus:outline-none transition-all placeholder:text-on-surface-variant/25"
            />
          </div>

          {/* Category grid */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-40">Categoría</label>
            <div className="grid grid-cols-4 gap-1.5">
              {cats.map(cat => {
                const Icon = cat.icon;
                const sel = category === cat.id;
                return (
                  <button
                    key={cat.id} type="button" onClick={() => setCategory(cat.id)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all',
                      sel
                        ? cn(cat.color, cat.bg, 'border-current/20')
                        : 'text-on-surface-variant opacity-40 border-outline-variant/20 hover:opacity-60 hover:bg-surface-container-high'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[8px] font-bold leading-tight">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-40">Fecha</label>
            <input
              type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/50 focus:border-primary/50 text-on-surface text-sm px-4 py-3 rounded-xl focus:outline-none transition-all"
            />
          </div>

          {error && (
            <p className="text-xs text-error bg-error/8 border border-error/15 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit" disabled={saving}
            className={cn(
              'w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] shadow-md disabled:opacity-50',
              isIncome
                ? 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-400'
                : 'bg-primary text-on-primary shadow-primary/20 hover:bg-primary/90'
            )}
          >
            {saving
              ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 block rounded-full border-2 border-white/30 border-t-white animate-spin" />Guardando...</span>
              : `Registrar ${typeCfg.label}`
            }
          </button>
        </form>
      </motion.div>
    </motion.div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY BREAKDOWN
// ─────────────────────────────────────────────────────────────────────────────

function CategoryBreakdown({ transactions }: { transactions: any[] }) {
  const expenses = transactions.filter(t => t.type !== 'INCOME');
  const total = expenses.reduce((s, t) => s + t.amount, 0);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(t => { const k = t.category ?? 'OTRO'; map[k] = (map[k] ?? 0) + t.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 7);
  }, [transactions]);

  if (byCategory.length === 0) return (
    <div className="bg-surface-container border border-outline-variant/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 min-h-[200px] text-center">
      <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center">
        <MoreHorizontal className="w-5 h-5 text-on-surface-variant opacity-30" />
      </div>
      <p className="text-sm text-on-surface-variant opacity-40">Sin datos de categorías aún.</p>
    </div>
  );

  return (
    <div className="bg-surface-container border border-outline-variant/40 rounded-2xl p-6 space-y-4 h-full">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-on-surface tracking-tight">Por categoría</h3>
        <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-25">Gastos</span>
      </div>
      <div className="space-y-3">
        {byCategory.map(([catId, amount]) => {
          const cat = getCatConfig(catId);
          const Icon = cat.icon;
          const pct = total > 0 ? (amount / total) * 100 : 0;
          return (
            <div key={catId} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn('w-5 h-5 rounded-md flex items-center justify-center', cat.bg)}>
                    <Icon className={cn('w-3 h-3', cat.color)} />
                  </div>
                  <span className="text-xs font-semibold text-on-surface">{cat.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-bold text-on-surface-variant opacity-35">{pct.toFixed(0)}%</span>
                  <span className="text-xs font-bold font-mono text-on-surface tabular-nums">${fmt(amount)}</span>
                </div>
              </div>
              <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
                  className={cn('h-full rounded-full', cat.bg.replace('/10', '/50'))}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="pt-3 border-t border-outline-variant/15 flex justify-between items-center">
        <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-30">Total gastos</span>
        <span className="font-mono text-sm font-black text-rose-400">−${fmt(total)}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

type ViewTab = 'ALL' | 'INCOME' | 'EXPENSE' | 'INVESTMENT' | 'SUBSCRIPTION';
type ModalType = 'INCOME' | 'EXPENSE' | 'INVESTMENT' | 'SUBSCRIPTION' | null;

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function Finance() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]               = useState<ModalType>(null);
  const [tab, setTab]                   = useState<ViewTab>('ALL');
  const [deletingId, setDeletingId]     = useState<string | null>(null);

  const [filterMode, setFilterMode]     = useState<'MONTHLY' | 'ALL'>('MONTHLY');
  const [currentDate, setCurrentDate]   = useState<Date>(() => {
    // metadata shows 2026-05-28-ish as current time, so standard new Date() fallback to May 2026
    return new Date(2026, 4, 28);
  });
  const [limit, setLimit]               = useState(50);

  // Historial dynamic date filters
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>('ALL');
  const [selectedYear, setSelectedYear]   = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery]     = useState('');

  const fetchTransactions = async () => {
    try {
      const data = await api.finance.list();
      setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.finance.delete(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Capital acumulado total: All incomes vs all expenses ever ("lo que tengo en este mmento")
  const globalIncome   = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const globalExpense  = transactions.filter(t => t.type !== 'INCOME').reduce((s, t) => s + t.amount, 0);
  const globalBalance  = globalIncome - globalExpense;

  // Years that are present in the dataset (for dynamic dropdown filter)
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    transactions.forEach(t => {
      const d = new Date(t.date);
      const year = d.getFullYear();
      if (!isNaN(year)) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  const availableMonths = useMemo(() => {
    return MONTH_NAMES.map((name, index) => ({ name, index }));
  }, []);

  // Filtrado por periodo (mes o histórico completo)
  const periodTransactions = useMemo(() => {
    if (filterMode === 'MONTHLY') {
      return transactions.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth();
      });
    } else {
      // In HISTORY (ALL) mode:
      return transactions.filter(t => {
        const d = new Date(t.date);
        if (selectedYear !== 'ALL' && d.getFullYear() !== selectedYear) return false;
        if (selectedMonth !== 'ALL' && d.getMonth() !== selectedMonth) return false;
        return true;
      });
    }
  }, [transactions, filterMode, currentDate, selectedMonth, selectedYear]);

  // Estadísticas del periodo
  const totalIncomeVal       = periodTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpenseVal      = periodTransactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const totalInvestmentVal   = periodTransactions.filter(t => t.type === 'INVESTMENT').reduce((s, t) => s + t.amount, 0);
  const totalSubscriptionVal = periodTransactions.filter(t => t.type === 'SUBSCRIPTION').reduce((s, t) => s + t.amount, 0);

  const totalIncome   = totalIncomeVal;
  const totalExpenses = totalExpenseVal + totalInvestmentVal + totalSubscriptionVal; // Keep overall outflows for backward compatibility in stats
  const balance       = totalIncome - totalExpenses;
  const savingsRate   = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  const hormigaTotal  = periodTransactions.filter(t => t.category === 'GASTO_HORMIGA').reduce((s, t) => s + t.amount, 0);

  // Filtrado final de la pestaña (Todos, Entradas, Salidas, Inversión, Suscripción) & búsqueda de texto
  const filtered = useMemo(() => {
    let list = periodTransactions;
    if (tab === 'INCOME') {
      list = list.filter(t => t.type === 'INCOME');
    } else if (tab === 'EXPENSE') {
      list = list.filter(t => t.type === 'EXPENSE');
    } else if (tab === 'INVESTMENT') {
      list = list.filter(t => t.type === 'INVESTMENT');
    } else if (tab === 'SUBSCRIPTION') {
      list = list.filter(t => t.type === 'SUBSCRIPTION');
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => 
        t.title.toLowerCase().includes(q) || 
        (t.category && t.category.toLowerCase().includes(q))
      );
    }
    return list;
  }, [periodTransactions, tab, searchQuery]);

  // Transacciones agrupadas por fecha (YYYY-MM-DD), ordenadas de más reciente a más antigua
  const groupedTransactions = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const groups: { [key: string]: any[] } = {};
    sorted.forEach(t => {
      const dateStr = t.date.split('T')[0];
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(t);
    });
    return Object.entries(groups);
  }, [filtered]);

  // Transacciones agrupadas limitadas para paginación
  const displayedGroupedTransactions = useMemo(() => {
    let count = 0;
    const result: [string, any[]][] = [];
    for (const [dateStr, items] of groupedTransactions) {
      if (count >= limit) break;
      const sliceSize = Math.max(0, limit - count);
      const itemsToInclude = items.slice(0, sliceSize);
      if (itemsToInclude.length > 0) {
        result.push([dateStr, itemsToInclude]);
        count += itemsToInclude.length;
      }
    }
    return result;
  }, [groupedTransactions, limit]);

  const getDailySum = (groupTransactions: any[]) => {
    let incomeSum = 0;
    let expenseSum = 0;
    groupTransactions.forEach(t => {
      if (t.type === 'INCOME') {
        incomeSum += t.amount;
      } else {
        expenseSum += t.amount;
      }
    });
    return incomeSum - expenseSum;
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
        {modal && (
          <QuickAddModal
            defaultType={modal}
            onClose={() => setModal(null)}
            onSaved={fetchTransactions}
          />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-primary opacity-70 mb-1.5">Finance Hub</p>
          <h2 className="font-display text-4xl font-black text-on-surface tracking-tighter leading-none">Finanzas</h2>
          <p className="text-sm text-on-surface-variant opacity-50 mt-2">Control total de entradas y salidas.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setModal('INCOME')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95 transition-all"
          >
            <ArrowUpRight className="w-4 h-4" /> Ingreso
          </button>
          <button
            onClick={() => setModal('EXPENSE')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 active:scale-95 transition-all"
          >
            <ArrowDownRight className="w-4 h-4" /> Gasto
          </button>
          <button
            onClick={() => setModal('INVESTMENT')}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 active:scale-95 transition-all"
          >
            <TrendingUp className="w-4 h-4" /> Inversión
          </button>
          <button
            onClick={() => setModal('SUBSCRIPTION')}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 active:scale-95 transition-all"
          >
            <Repeat2 className="w-4 h-4" /> Suscripción
          </button>
        </div>
      </div>

      {/* ── Period Selector and Navigation ── */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 bg-surface-container border border-outline-variant/40 rounded-2xl p-4">
        {/* Left: Mode Selection (Monthly vs General/All-time) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="grid grid-cols-2 p-1 bg-surface-container-low border border-outline-variant/20 rounded-xl w-full sm:w-[280px]">
            <button
              type="button"
              onClick={() => {
                setFilterMode('MONTHLY');
                setLimit(50);
              }}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-bold transition-all text-center',
                filterMode === 'MONTHLY'
                  ? 'bg-primary text-on-primary shadow-sm shadow-primary/20'
                  : 'text-on-surface-variant opacity-50 hover:opacity-100'
              )}
            >
              Vista Mensual
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('ALL');
                setLimit(50);
              }}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-bold transition-all text-center',
                filterMode === 'ALL'
                  ? 'bg-primary text-on-primary shadow-sm shadow-primary/20'
                  : 'text-on-surface-variant opacity-50 hover:opacity-100'
              )}
            >
              Historial (Todo)
            </button>
          </div>
        </div>

        {/* Middle/Right Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1 justify-end">
          {/* Dynamically controlled filters depending on filterMode */}
          <AnimatePresence mode="wait">
            {filterMode === 'MONTHLY' ? (
              <motion.div
                key="monthly-nav"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant/20 px-3 py-1 pb-1 rounded-xl justify-between w-full md:w-auto"
              >
                <button
                  type="button"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCurrentDate(newDate);
                    setLimit(50);
                  }}
                  className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-all active:scale-95"
                  title="Mes anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex flex-col items-center px-4 min-w-[130px] select-none">
                  <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant opacity-45 font-sans">Periodo</span>
                  <span className="text-xs font-black text-on-surface font-display mt-0.5">{formatMonthYear(currentDate)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCurrentDate(newDate);
                    setLimit(50);
                  }}
                  className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-all active:scale-95"
                  title="Mes siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="all-nav"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto"
              >
                {/* Year Dropdown Filter */}
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedYear(val === 'ALL' ? 'ALL' : Number(val));
                      setLimit(50);
                    }}
                    className="w-full sm:w-auto bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs font-bold pl-3 pr-8 py-2.5 rounded-xl focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                  >
                    <option value="ALL">Cualquier año</option>
                    {availableYears.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-on-surface-variant opacity-50 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Month Dropdown Filter */}
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedMonth(val === 'ALL' ? 'ALL' : Number(val));
                      setLimit(50);
                    }}
                    className="w-full sm:w-auto bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs font-bold pl-3 pr-8 py-2.5 rounded-xl focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                  >
                    <option value="ALL">Cualquier mes</option>
                    {availableMonths.map(m => (
                      <option key={m.index} value={m.index}>{m.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-on-surface-variant opacity-50 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Clear filters if set */}
                {(selectedYear !== 'ALL' || selectedMonth !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedYear('ALL');
                      setSelectedMonth('ALL');
                      setLimit(50);
                    }}
                    className="text-[10px] font-bold text-rose-400 bg-rose-400/10 hover:bg-rose-400/25 px-3 py-2 rounded-xl transition-all font-display uppercase tracking-widest text-center"
                  >
                    Limpiar Filtros
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Unified search input */}
          <div className="relative w-full md:w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Buscar por descripción..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setLimit(50);
              }}
              className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary text-on-surface placeholder:text-on-surface-variant/30 text-xs px-9 py-2.5 rounded-xl focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-surface-container text-on-surface-variant/60 hover:text-on-surface transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-card-gap">
        {/* Balance hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="col-span-2 relative bg-surface-container-high border border-outline-variant/40 rounded-2xl p-6 overflow-hidden flex flex-col justify-between min-h-[175px]"
        >
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-start justify-between min-w-0 w-full mb-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-primary opacity-60 shrink-0" />
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-40">Capital acumulado (hoy)</p>
              </div>
              <div className={cn('font-display text-4xl font-black tracking-tighter truncate mt-1.5', globalBalance >= 0 ? 'text-on-surface' : 'text-rose-400')}>
                {globalBalance < 0 ? '−' : ''}${fmt(Math.abs(globalBalance))}
              </div>
            </div>
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-bold uppercase tracking-widest shrink-0 ml-2',
              globalBalance >= 0 ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-rose-400 bg-rose-400/10 border-rose-400/20'
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', globalBalance >= 0 ? 'bg-emerald-400' : 'bg-rose-400')} />
              {globalBalance >= 0 ? 'Sólido' : 'Negativo'}
            </div>
          </div>
          <div className="space-y-3 pt-3 border-t border-outline-variant/10">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[8px] font-bold uppercase tracking-wide text-on-surface-variant opacity-45">
                  {filterMode === 'MONTHLY' ? `Balance de ${formatMonthYear(currentDate)}` : 'Balance filtrado'}
                </p>
                <p className={cn('font-mono text-xs font-black mt-0.5', balance >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                  {balance >= 0 ? '+' : '−'}${fmt(Math.abs(balance))}
                </p>
              </div>
              <div>
                <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-on-surface-variant opacity-45">
                  <span>Tasa de ahorro</span>
                  <span>{Math.max(0, savingsRate).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden mt-1.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(0, Math.min(100, savingsRate))}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                    className="h-full bg-emerald-400 rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Income Stat Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className={cn(
            "bg-surface-container border p-5 flex flex-col justify-between cursor-pointer rounded-2xl transition-all relative overflow-hidden",
            tab === 'INCOME' 
              ? "border-emerald-500/80 bg-emerald-500/[0.04] shadow-md shadow-emerald-500/5 scale-[1.02]" 
              : "border-outline-variant/40 hover:border-emerald-400/30 hover:bg-surface-container-high/60"
          )}
          onClick={() => setTab(prev => prev === 'INCOME' ? 'ALL' : 'INCOME')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-400/10 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-25">Entradas</span>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant opacity-40 mb-1">Total ingresos</p>
            <span className="font-display text-2xl font-black text-emerald-400 tracking-tighter">+${fmt(totalIncomeVal)}</span>
          </div>
        </motion.div>

        {/* Expense Stat Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className={cn(
            "bg-surface-container border p-5 flex flex-col justify-between cursor-pointer rounded-2xl transition-all relative overflow-hidden",
            tab === 'EXPENSE' 
              ? "border-rose-500/80 bg-rose-500/[0.04] shadow-md shadow-rose-500/5 scale-[1.02]" 
              : "border-outline-variant/40 hover:border-rose-400/30 hover:bg-surface-container-high/60"
          )}
          onClick={() => setTab(prev => prev === 'EXPENSE' ? 'ALL' : 'EXPENSE')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-rose-400/10 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-25">Salidas</span>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant opacity-40 mb-1 font-sans">Total gastos</p>
            <span className="font-display text-2xl font-black text-rose-400 tracking-tighter">−${fmt(totalExpenseVal)}</span>
            {hormigaTotal > 0 && (
              <p className="text-[9px] font-bold text-amber-400 mt-1 flex items-center gap-1 leading-none">
                <Coffee className="w-2.5 h-2.5" />${fmt(hormigaTotal)} hormiga
              </p>
            )}
          </div>
        </motion.div>

        {/* Investment Stat Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className={cn(
            "bg-surface-container border p-5 flex flex-col justify-between cursor-pointer rounded-2xl transition-all relative overflow-hidden",
            tab === 'INVESTMENT' 
              ? "border-primary/80 bg-primary/[0.04] shadow-md shadow-primary/5 scale-[1.02]" 
              : "border-outline-variant/40 hover:border-primary/30 hover:bg-surface-container-high/60"
          )}
          onClick={() => setTab(prev => prev === 'INVESTMENT' ? 'ALL' : 'INVESTMENT')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-25">Inversión</span>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant opacity-40 mb-1 font-sans">Inversiones</p>
            <span className="font-display text-2xl font-black text-primary tracking-tighter">↗${fmt(totalInvestmentVal)}</span>
          </div>
        </motion.div>

        {/* Subscription Stat Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className={cn(
            "bg-surface-container border p-5 flex flex-col justify-between cursor-pointer rounded-2xl transition-all relative overflow-hidden",
            tab === 'SUBSCRIPTION' 
              ? "border-amber-500/80 bg-amber-500/[0.04] shadow-md shadow-amber-500/5 scale-[1.02]" 
              : "border-outline-variant/40 hover:border-amber-400/30 hover:bg-surface-container-high/60"
          )}
          onClick={() => setTab(prev => prev === 'SUBSCRIPTION' ? 'ALL' : 'SUBSCRIPTION')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center">
              <Repeat2 className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-25">Suscripciones</span>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant opacity-40 mb-1 font-sans">Suscripción</p>
            <span className="font-display text-2xl font-black text-amber-500 tracking-tighter">~${fmt(totalSubscriptionVal)}</span>
          </div>
        </motion.div>
      </div>

      {/* ── Bottom grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-card-gap">

        {/* Breakdown */}
        <div className="lg:col-span-4">
          <CategoryBreakdown transactions={periodTransactions} />
        </div>

        {/* Transaction list */}
        <div className="lg:col-span-8">
          <div className="bg-surface-container border border-outline-variant/40 rounded-2xl overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="px-5 py-4 border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center gap-3">
              <h3 className="font-display text-base font-bold text-on-surface tracking-tight flex-1">Movimientos</h3>
              <div className="flex flex-wrap gap-1">
                {(['ALL', 'INCOME', 'EXPENSE', 'INVESTMENT', 'SUBSCRIPTION'] as ViewTab[]).map(t => (
                  <button
                    key={t} onClick={() => setTab(t)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
                      tab === t
                        ? t === 'INCOME'       ? 'bg-emerald-400/15 text-emerald-400'
                          : t === 'EXPENSE'    ? 'bg-rose-400/15 text-rose-400 font-sans'
                          : t === 'INVESTMENT' ? 'bg-primary/20 text-primary font-sans'
                          : t === 'SUBSCRIPTION' ? 'bg-amber-400/15 text-amber-400 font-sans'
                          : 'bg-surface-container-highest text-on-surface'
                        : 'text-on-surface-variant opacity-40 hover:opacity-75 hover:bg-surface-container-high'
                    )}
                  >
                    {t === 'ALL' ? 'Todos' : 
                     t === 'INCOME' ? 'Ingresos' : 
                     t === 'EXPENSE' ? 'Gastos' : 
                     t === 'INVESTMENT' ? 'Inversiones' : 'Suscripciones'}
                  </button>
                ))}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-25 whitespace-nowrap text-right">
                {filtered.length} reg.
              </span>
            </div>

            {/* Rows grouped by Day */}
            <div className="divide-y divide-outline-variant/10 max-h-[560px] overflow-y-auto flex-1">
              {displayedGroupedTransactions.length > 0 ? (
                displayedGroupedTransactions.map(([dateKey, items]) => {
                  const dayLabel = getDayLabel(dateKey);
                  const dailyNet = getDailySum(items);

                  return (
                    <div key={dateKey} className="py-3.5 space-y-1">
                      {/* Sticky Day Header */}
                      <div className="px-4 py-1.5 flex justify-between items-center bg-surface-container-high/30 rounded-xl mx-4 mb-2 border border-outline-variant/5">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-primary opacity-50" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant opacity-75 leading-none">
                            {dayLabel}
                          </span>
                        </div>
                        <span className={cn(
                          'font-mono text-[9px] font-bold tracking-tight',
                          dailyNet > 0 ? 'text-emerald-400' : dailyNet < 0 ? 'text-rose-400' : 'text-on-surface-variant opacity-40'
                        )}>
                          {dailyNet > 0 ? '+' : dailyNet < 0 ? '−' : ''}${fmt(Math.abs(dailyNet))}
                        </span>
                      </div>

                      {/* Items of this Day */}
                      <div className="divide-y divide-outline-variant/5">
                        <AnimatePresence initial={false}>
                          {items.map((t, idx) => {
                            const typeCfg = TYPE_CONFIG[t.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.EXPENSE;
                            const cat = getCatConfig(t.category ?? 'OTRO');
                            const Icon = cat.icon;
                            const isDeleting = deletingId === t.id;

                            return (
                              <motion.div
                                key={t.id}
                                layout
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: isDeleting ? 0.4 : 1, x: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ delay: idx * 0.01, duration: 0.2 }}
                                className="flex items-center gap-3 px-5 py-3 group hover:bg-surface-container-high/40 transition-colors"
                              >
                                {/* Stripe */}
                                <div className={cn('w-[3px] h-9 rounded-full shrink-0', typeCfg.stripe)} />

                                {/* Category icon */}
                                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', cat.bg)}>
                                  <Icon className={cn('w-3.5 h-3.5', cat.color)} />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-on-surface truncate leading-snug">{t.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-35">{cat.label}</span>
                                    <span className="text-on-surface-variant opacity-20 text-[9px]">·</span>
                                    <span className="text-[9px] font-bold tabular-nums text-on-surface-variant opacity-35">
                                      {new Date(t.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </span>
                                  </div>
                                </div>

                                {/* Amount */}
                                <span className={cn('font-mono text-sm font-bold tabular-nums shrink-0', typeCfg.color)}>
                                  {typeCfg.sign}${fmtFull(t.amount)}
                                </span>

                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={() => handleDelete(t.id)}
                                  disabled={isDeleting}
                                  className="p-1.5 rounded-lg text-on-surface-variant opacity-0 group-hover:opacity-25 hover:!opacity-80 hover:text-rose-400 hover:bg-rose-400/10 transition-all disabled:cursor-not-allowed shrink-0"
                                  title="Eliminar"
                                >
                                  {isDeleting
                                    ? <span className="w-3.5 h-3.5 block rounded-full border-2 border-rose-400/30 border-t-rose-400 animate-spin" />
                                    : <Trash2 className="w-3.5 h-3.5" />
                                  }
                                </button>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-on-surface-variant opacity-30" />
                  </div>
                  <p className="text-sm text-on-surface-variant opacity-40">
                    {tab === 'INCOME' ? 'Sin ingresos en este periodo.' : tab === 'EXPENSE' ? 'Sin gastos en este periodo.' : 'Sin movimientos en este periodo.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setModal(tab === 'INCOME' ? 'INCOME' : 'EXPENSE')}
                    className="text-[10px] font-bold text-primary opacity-60 hover:opacity-100 transition-opacity"
                  >
                    + Agregar el primero
                  </button>
                </div>
              )}

              {/* Load More Trigger */}
              {filtered.length > limit && (
                <div className="p-4 border-t border-outline-variant/10 text-center bg-surface-container-low/10">
                  <button
                    type="button"
                    onClick={() => setLimit(prev => prev + 50)}
                    className="px-4 py-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/25 rounded-xl transition-all active:scale-95"
                  >
                    Cargar más movimientos ({filtered.length - limit} restantes)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}