// frontend/src/components/layout/Sidebar.tsx

import React from 'react';
import {
  LayoutDashboard,
  CalendarRange,
  CalendarDays,
  FolderOpen,
  CheckCircle2,
  Repeat,
  Wallet,
  BarChart3,
  StickyNote,
  Settings,
  LogOut,
  X,
  BookOpen,
} from 'lucide-react';

import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

import { useAppStore, useAuthStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

// ─────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────

const MAIN_NAV = [
  {
    path: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    path: '/agenda',
    label: 'Agenda',
    icon: CalendarRange,
  },
  {
    path: '/calendar',
    label: 'Calendario',
    icon: CalendarDays,
  },
  {
    path: '/projects',
    label: 'Proyectos',
    icon: FolderOpen,
  },
  {
    path: '/tasks',
    label: 'Tareas',
    icon: CheckCircle2,
  },
];

const PRODUCTIVITY_NAV = [
  {
    path: '/habits',
    label: 'Hábitos',
    icon: Repeat,
  },
  {
    path: '/finance',
    label: 'Finanzas',
    icon: Wallet,
  },
  {
    path: '/notes',
    label: 'Notas',
    icon: StickyNote,
  },
  {
    path: '/documentation',
    label: 'Documentación',
    icon: BookOpen,
  },
  {
    path: '/stats',
    label: 'Estadísticas',
    icon: BarChart3,
  },
];

// ─────────────────────────────────────────────────────────────
// NAV ITEM
// ─────────────────────────────────────────────────────────────

function NavItem({
  path,
  label,
  icon: Icon,
  onNavigate,
}: {
  path: string;
  label: string;
  icon: React.ElementType;
  onNavigate: () => void;
}) {
  return (
    <NavLink
      to={path}
      end={path === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3',
          'px-3 py-2.5 rounded-2xl',
          'transition-all duration-200',
          'text-[13px] font-semibold overflow-hidden',
          isActive
            ? 'bg-primary/12 text-primary shadow-[0_0_0_1px_rgba(var(--primary),0.08)]'
            : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* ACTIVE GLOW */}
          {isActive && (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/8 to-transparent pointer-events-none" />
          )}

          <Icon
            className={cn(
              'relative z-10 w-[17px] h-[17px] shrink-0 transition-all',
              isActive
                ? 'text-primary'
                : 'group-hover:scale-105'
            )}
          />

          <span className="relative z-10 leading-none truncate">
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION
// ─────────────────────────────────────────────────────────────

function NavSection({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: {
    path: string;
    label: string;
    icon: React.ElementType;
  }[];
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-2">
      <p
        className={cn(
          'px-3',
          'text-[10px] font-black uppercase tracking-[0.18em]',
          'text-on-surface-variant/35'
        )}
      >
        {title}
      </p>

      <div className="space-y-1">
        {items.map((item) => (
          <NavItem
            key={item.path}
            path={item.path}
            label={item.label}
            icon={item.icon}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { isSidebarOpen, setSidebarOpen } = useAppStore();
  const { user, logout } = useAuthStore();

  const handleNavigate = () => {
    if (window.innerWidth < 1280) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* MOBILE BACKDROP */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-[55] bg-black/45 backdrop-blur-sm xl:hidden"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-[60] xl:z-50',
          'h-full w-sidebar-width',
          'flex flex-col',
          'bg-surface-container-low/95 backdrop-blur-xl',
          'border-r border-outline-variant/15',
          'transition-transform duration-300 ease-in-out',
          !isSidebarOpen && '-translate-x-full'
        )}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 pt-7 pb-6 shrink-0">
          <div className="flex flex-col leading-none">
            <span
              className={cn(
                'font-display',
                'text-[27px] font-black tracking-tighter',
                'text-primary'
              )}
            >
              PlannerON
            </span>

            <span
              className={cn(
                'mt-1',
                'text-[8px] font-black uppercase tracking-[0.24em]',
                'text-on-surface-variant/30'
              )}
            >
              Productivity
            </span>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'xl:hidden',
              'p-2 rounded-xl',
              'text-on-surface-variant',
              'hover:bg-surface-container-high hover:text-on-surface',
              'transition-all duration-200'
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-7">
          <NavSection
            title="Principal"
            items={MAIN_NAV}
            onNavigate={handleNavigate}
          />

          <NavSection
            title="Productividad"
            items={PRODUCTIVITY_NAV}
            onNavigate={handleNavigate}
          />
        </nav>

        {/* FOOTER */}
        <div
          className={cn(
            'px-4 pt-4 pb-5 shrink-0',
            'border-t border-outline-variant/10',
            'bg-gradient-to-t from-black/[0.03] to-transparent'
          )}
        >
          <div className="space-y-1.5">
            {/* SETTINGS */}
            <NavItem
              path="/settings"
              label="Configuración"
              icon={Settings}
              onNavigate={handleNavigate}
            />

            {/* LOGOUT */}
            {logout && (
              <button
                onClick={logout}
                className={cn(
                  'group w-full',
                  'flex items-center gap-3',
                  'px-3 py-2.5 rounded-2xl',
                  'transition-all duration-200',
                  'text-[13px] font-semibold',
                  'text-red-400/85',
                  'hover:bg-red-500/10 hover:text-red-400',
                  'border border-transparent hover:border-red-500/10'
                )}
              >
                <LogOut
                  className={cn(
                    'w-[17px] h-[17px] shrink-0',
                    'transition-transform duration-200',
                    'group-hover:-translate-x-0.5'
                  )}
                />

                <span className="leading-none">
                  Cerrar sesión
                </span>
              </button>
            )}
          </div>

          {/* USER CARD */}
          <div
            className={cn(
              'mt-4 p-3 rounded-2xl',
              'bg-surface-container/70',
              'border border-outline-variant/10',
              'backdrop-blur-sm'
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* AVATAR */}
              <div
                className={cn(
                  'relative shrink-0',
                  'w-10 h-10 rounded-xl',
                  'flex items-center justify-center',
                  'bg-primary/12 text-primary',
                  'font-black text-sm',
                  'border border-primary/15'
                )}
              >
                {user?.name?.charAt(0).toUpperCase() ||
                  user?.email?.charAt(0).toUpperCase() ||
                  'U'}

                {/* ONLINE DOT */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-surface-container-low" />
              </div>

              {/* INFO */}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-[12px] font-bold',
                    'text-on-surface truncate'
                  )}
                >
                  {user?.name ||
                    user?.email?.split('@')[0] ||
                    'Usuario'}
                </p>

                <p
                  className={cn(
                    'text-[11px]',
                    'text-on-surface-variant truncate'
                  )}
                >
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}