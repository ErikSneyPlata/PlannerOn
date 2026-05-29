// frontend/src/components/layout/TopBar.tsx
import { useState, useRef, useEffect } from 'react';
import { 
  Plus, Menu, Info, ChevronRight, X, ArrowUpRight, ArrowDownRight,
  Bell, AlertTriangle, CheckCircle2, CalendarDays, RefreshCw, Check
} from 'lucide-react';
import { useAppStore, useAuthStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { QuickAddModal } from '../../pages/Finance';
import { api } from '../../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

interface AppNotification {
  id: string;
  type: 'TASK_OVERDUE' | 'TASK_TODAY' | 'AGENDA_UPCOMING' | 'AGENDA_TODAY';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  link: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_META: Record<string, {
  title: string;
  parent?: { path: string; label: string };
}> = {
  '':          { title: 'Dashboard'       },
  'dashboard': { title: 'Dashboard'       },
  'agenda':    { title: 'Agenda'          },
  'calendar':  { title: 'Calendario', parent: { path: '/agenda', label: 'Agenda' } },
  'projects':  { title: 'Proyectos'       },
  'tasks':     { title: 'Tareas'          },
  'finance':   { title: 'Finanzas'        },
  'habits':    { title: 'Hábitos'         },
  'stats':     { title: 'Estadísticas'    },
  'notes':     { title: 'Notas'           },
  'settings':  { title: 'Configuración'   },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICK ADD MENU — navigates to the right page and opens create modal
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_ADD_ITEMS = [
  { label: 'Nueva tarea',        path: '/tasks',    flag: 'create' },
  { label: 'Nuevo proyecto',     path: '/projects', flag: 'create' },
  { label: 'Nuevo evento',       path: '/agenda',   flag: 'create' },
  { label: 'Nueva transacción',  path: '/finance',  flag: 'create' },
  { label: 'Nuevo hábito',       path: '/habits',   flag: 'create' },
];

function QuickAddMenu({
  onClose,
}: { onClose: () => void }) {
  const navigate = useNavigate();
  const ref      = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (item: typeof QUICK_ADD_ITEMS[number]) => {
    // Pass a state flag so the destination page can auto-open its create modal
    navigate(item.path, { state: { openCreate: true } });
    onClose();
  };

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 z-50 bg-surface-container-high border border-outline-variant/40 rounded-2xl shadow-2xl overflow-hidden min-w-[200px]"
    >
      <div className="px-4 pt-4 pb-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-on-surface-variant opacity-40">
          Crear nuevo
        </p>
      </div>
      {QUICK_ADD_ITEMS.map(item => (
        <button
          key={item.path}
          onClick={() => handleSelect(item)}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-all text-left"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
          {item.label}
        </button>
      ))}
      <div className="h-px bg-outline-variant/15 mx-4 my-1" />
      <button
        onClick={onClose}
        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-on-surface-variant opacity-40 hover:opacity-70 transition-all text-left"
      >
        <X className="w-3.5 h-3.5" /> Cancelar
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOPBAR
// ─────────────────────────────────────────────────────────────────────────────

export default function TopBar() {
  const { toggleSidebar, toggleRightPanel, isSidebarOpen, isRightPanelOpen } = useAppStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [modal, setModal] = useState<'INCOME' | 'EXPENSE' | null>(null);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const slug     = location.pathname.replace('/', '').split('/')[0] || '';
  const meta     = PAGE_META[slug] ?? { title: 'Workspace' };
  const isDash   = slug === '' || slug === 'dashboard';
  const isFinance = slug === 'finance';
  const firstName = (user?.name || user?.email?.split('@')[0] || 'Usuario').split(' ')[0];

  const fetchAndProcessNotifications = async () => {
    if (!user) return;
    try {
      setLoadingNotifications(true);
      const [tasks, agendaEvents] = await Promise.all([
        api.tasks.list(),
        api.agenda.list()
      ]);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      const generated: AppNotification[] = [];

      // 1. Process Tasks
      if (Array.isArray(tasks)) {
        tasks.forEach((t: any) => {
          const hasDueDate = t.dueDate && t.dueDate !== "";
          if (hasDueDate && !['COMPLETED', 'ARCHIVED'].includes(t.status)) {
            const due = new Date(t.dueDate);
            if (due < now) {
              generated.push({
                id: `task-overdue-${t.id}`,
                type: 'TASK_OVERDUE',
                title: 'Tarea Atrasada',
                message: `"${t.title}" debía completarse el ${due.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}.`,
                timestamp: t.updatedAt || t.createdAt,
                isRead: false,
                link: '/tasks'
              });
            } else if (due >= todayStart && due < todayEnd) {
              generated.push({
                id: `task-today-${t.id}`,
                type: 'TASK_TODAY',
                title: 'Tarea para Hoy',
                message: `"${t.title}" vence hoy. ¡Recuerda abordarla!`,
                timestamp: t.updatedAt || t.createdAt,
                isRead: false,
                link: '/tasks'
              });
            }
          }
        });
      }

      // 2. Process Agenda Events
      if (Array.isArray(agendaEvents)) {
        agendaEvents.forEach((e: any) => {
          const start = new Date(e.startDate);
          if (start >= todayStart && start < todayEnd) {
            generated.push({
              id: `agenda-today-${e.id}`,
              type: 'AGENDA_TODAY',
              title: `Evento Hoy: ${e.category}`,
              message: `"${e.title}" comienza hoy a las ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
              timestamp: e.createdAt,
              isRead: false,
              link: '/agenda'
            });
          } else {
            const diffMs = start.getTime() - now.getTime();
            const diffHrs = diffMs / (1000 * 60 * 60);
            if (diffHrs > 0 && diffHrs <= 24) {
              generated.push({
                id: `agenda-upcoming-${e.id}`,
                type: 'AGENDA_UPCOMING',
                title: 'Evento Próximo',
                message: `"${e.title}" inicia en menos de 24 horas (${start.toLocaleDateString()}).`,
                timestamp: e.createdAt,
                isRead: false,
                link: '/agenda'
              });
            }
          }
        });
      }

      // Persistently store and read ID lists
      const savedReadStr = localStorage.getItem('read-notifications');
      const savedReadIds = savedReadStr ? JSON.parse(savedReadStr) as string[] : [];

      const finalized = generated.map(n => ({
        ...n,
        isRead: savedReadIds.includes(n.id)
      }));

      // Unread prioritized, then sort by timestamp descending
      finalized.sort((a, b) => {
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      setNotifications(finalized);
    } catch (err) {
      console.error('Error listing notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchAndProcessNotifications();
    const interval = setInterval(fetchAndProcessNotifications, 45000); // refresh every 45s
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', clickHandler);
    return () => document.removeEventListener('mousedown', clickHandler);
  }, []);

  const markAsRead = (id: string) => {
    const savedReadStr = localStorage.getItem('read-notifications');
    const savedReadIds = savedReadStr ? JSON.parse(savedReadStr) as string[] : [];
    if (!savedReadIds.includes(id)) {
      savedReadIds.push(id);
      localStorage.setItem('read-notifications', JSON.stringify(savedReadIds));
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    localStorage.setItem('read-notifications', JSON.stringify(allIds));
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header
      className={cn(
        'fixed top-0 h-[60px] flex justify-between items-center px-4 md:px-gutter z-40',
        'bg-background/80 backdrop-blur-xl border-b border-outline-variant/30',
        'transition-all duration-300',
        isSidebarOpen ? 'xl:left-sidebar-width' : 'left-0',
        isRightPanelOpen ? '2xl:right-right-panel-width' : 'right-0',
      )}
    >
      {/* Bottom shimmer line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent pointer-events-none" />

      {/* ── LEFT: toggle + title ── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Sidebar toggle */}
        <button
          onClick={toggleSidebar}
          className={cn(
            'p-2 rounded-lg transition-all duration-200 shrink-0',
            isSidebarOpen
              ? 'text-primary bg-primary/10'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          )}
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-[18px] h-[18px]" />
        </button>

        {/* Title area */}
        <div className="flex flex-col justify-center min-w-0">
          {isDash ? (
            // Dashboard: greeting + name
            <>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary opacity-70 leading-none">
                {getGreeting()}
              </span>
              <h2 className="font-display text-sm xs:text-base sm:text-lg font-black text-on-surface tracking-tight leading-tight truncate">
                {firstName}
              </h2>
            </>
          ) : meta.parent ? (
            // Sub-page with breadcrumb (e.g. Calendario under Agenda)
            <div className="flex items-center gap-1.5">
              <NavLink
                to={meta.parent.path}
                className="text-[11px] font-bold text-on-surface-variant opacity-40 hover:opacity-80 transition-opacity hidden sm:block"
              >
                {meta.parent.label}
              </NavLink>
              <ChevronRight className="w-3 h-3 text-on-surface-variant opacity-25 hidden sm:block shrink-0" />
              <h2 className="font-display text-sm xs:text-base sm:text-lg md:text-xl font-black text-on-surface tracking-tight leading-none truncate">
                {meta.title}
              </h2>
            </div>
          ) : (
            // Regular page title
            <h2 className="font-display text-sm xs:text-base sm:text-lg md:text-xl font-black text-on-surface tracking-tight leading-none truncate">
              {meta.title}
            </h2>
          )}
        </div>
      </div>

      {/* ── RIGHT: panel toggle + quick add ── */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">

        {/* Center of Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(prev => !prev)}
            className={cn(
              'p-2 rounded-lg transition-all duration-200 relative',
              showNotifications
                ? 'text-primary bg-primary/10'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            )}
            title="Centro de Notificaciones"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border border-background animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="fixed md:absolute right-4 md:right-0 left-4 md:left-auto top-[65px] md:top-full mt-2 w-auto md:w-[320px] max-w-[calc(100vw-32px)] bg-surface-container-high border border-outline-variant/35 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[420px]">
              <div className="p-4 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container-low/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-on-surface">Notificaciones</span>
                  {unreadCount > 0 && (
                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/10 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount} nuevas
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] font-black text-primary hover:text-primary-hover transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Leídas
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 max-h-[300px] space-y-1">
                {loadingNotifications && notifications.length === 0 ? (
                  <div className="flex items-center justify-center p-8 gap-2">
                    <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-xs text-on-surface-variant">Buscando alertas...</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-10 px-4 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500/20 mx-auto" />
                    <p className="text-xs font-bold text-on-surface-variant">¡Estás al día!</p>
                    <p className="text-[10px] text-on-surface-variant/40 leading-relaxed">
                      No tienes tareas vencidas ni eventos próximos pendientes de alerta.
                    </p>
                  </div>
                ) : (
                  notifications.map(notif => {
                    const isOverdue = notif.type === 'TASK_OVERDUE';
                    const isAgenda = notif.type.startsWith('AGENDA_');

                    return (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markAsRead(notif.id);
                          navigate(notif.link);
                          setShowNotifications(false);
                        }}
                        className={cn(
                          'p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex gap-2.5 items-start relative',
                          notif.isRead
                            ? 'bg-surface-container hover:bg-surface-container-highest border-outline-variant/5 opacity-65'
                            : 'bg-surface-container-low border-primary/10 hover:border-primary/25 hover:bg-surface-container-high'
                        )}
                      >
                        <div className={cn(
                          'p-1.5 rounded-xl shrink-0 mt-0.5',
                          isOverdue 
                            ? 'bg-rose-500/10 text-rose-400' 
                            : isAgenda 
                              ? 'bg-sky-500/10 text-sky-450' 
                              : 'bg-emerald-500/10 text-emerald-400'
                        )}>
                          {isOverdue ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : isAgenda ? (
                            <CalendarDays className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className={cn('text-xs font-bold truncate block', notif.isRead ? 'text-on-surface-variant' : 'text-on-surface')}>
                              {notif.title}
                            </span>
                            {!notif.isRead && (
                              <span className="h-1.5 w-1.5 bg-primary rounded-full shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-on-surface-variant leading-relaxed mt-0.5">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="p-2.5 border-t border-outline-variant/10 text-center bg-surface-container-low/30">
                <button
                  onClick={() => {
                    fetchAndProcessNotifications();
                  }}
                  className="text-[10px] font-extrabold text-on-surface-variant/60 hover:text-on-surface transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Sincronizar alertas
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right panel toggle */}
        <button
          onClick={toggleRightPanel}
          className={cn(
            'p-2 rounded-lg transition-all duration-200',
            isRightPanelOpen
              ? 'text-primary bg-primary/10'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          )}
          aria-label="Toggle Panel"
        >
          <Info className="w-[18px] h-[18px]" />
        </button>

        {/* Quick add Income/Expense if NOT on Finance page */}
        {!isFinance && (
          <>
            <button
              onClick={() => setModal('INCOME')}
              className="flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-lg font-bold text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95 transition-all duration-150"
              title="Registrar Ingreso"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ingreso</span>
            </button>
            <button
              onClick={() => setModal('EXPENSE')}
              className="flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-lg font-bold text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 active:scale-95 transition-all duration-150"
              title="Registrar Gasto"
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gasto</span>
            </button>
          </>
        )}

        {/* Quick add button + dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowQuickAdd(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg font-bold text-xs',
              'transition-all duration-150 shadow-md active:scale-95',
              showQuickAdd
                ? 'bg-primary/15 text-primary border border-primary/25 shadow-none'
                : 'bg-primary text-on-primary shadow-primary/20 hover:bg-primary/90'
            )}
          >
            <Plus
              className={cn('w-3.5 h-3.5 transition-transform duration-200', showQuickAdd && 'rotate-45')}
              strokeWidth={2.5}
            />
            <span className="hidden sm:inline tracking-wide">
              {showQuickAdd ? 'Cancelar' : 'Crear'}
            </span>
          </button>

          {showQuickAdd && (
            <QuickAddMenu onClose={() => setShowQuickAdd(false)} />
          )}
        </div>
      </div>

      <AnimatePresence>
        {modal && (
          <QuickAddModal
            defaultType={modal}
            onClose={() => setModal(null)}
            onSaved={() => {
              window.location.reload();
            }}
          />
        )}
      </AnimatePresence>
    </header>
  );
}