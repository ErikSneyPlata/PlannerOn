import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User | null, token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

interface AppState {
  isSidebarOpen: boolean;
  isRightPanelOpen: boolean;
  currentPage: string;
  activeFocusTaskId: string | null;
  tasksRefreshNeed: number;

  setSidebarOpen: (isOpen: boolean) => void;
  setRightPanelOpen: (isOpen: boolean) => void;
  setCurrentPage: (page: string) => void;
  setActiveFocusTaskId: (id: string | null) => void;
  triggerTasksRefresh: () => void;

  toggleSidebar: () => void;
  toggleRightPanel: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isSidebarOpen: true,
  isRightPanelOpen: true,
  currentPage: 'dashboard',
  activeFocusTaskId: null,
  tasksRefreshNeed: 0,

  setSidebarOpen: (isOpen) =>
    set({ isSidebarOpen: isOpen }),

  setRightPanelOpen: (isOpen) =>
    set({ isRightPanelOpen: isOpen }),

  setCurrentPage: (page) =>
    set({ currentPage: page }),

  setActiveFocusTaskId: (id) =>
    set({ activeFocusTaskId: id }),

  triggerTasksRefresh: () =>
    set((state) => ({ tasksRefreshNeed: state.tasksRefreshNeed + 1 })),

  toggleSidebar: () =>
    set((state) => ({
      isSidebarOpen: !state.isSidebarOpen,
    })),

  toggleRightPanel: () =>
    set((state) => ({
      isRightPanelOpen: !state.isRightPanelOpen,
    })),
}));
