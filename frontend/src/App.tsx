import  { useEffect, useState } from 'react';
import { useAuthStore, useAppStore } from './store/useStore';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import RightPanel from './components/layout/RightPanel';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import Finance from './pages/Finance';
import Habits from './pages/Habits';
import Agenda from './pages/Agenda';
import AuthPage from './pages/Auth';
import Stats from './pages/Stats';
import Notes from './pages/Notes';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';
import Documentation from './pages/Documentation';
import { AnimatePresence, motion } from 'motion/react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { cn } from './lib/utils';

function App() {
  const { token } = useAuthStore();
  const { isSidebarOpen, isRightPanelOpen, setSidebarOpen, setRightPanelOpen } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Automatically close panel views if screen size is narrow
    if (window.innerWidth < 1280) {
      setSidebarOpen(false);
    }
    if (window.innerWidth < 1536) {
      setRightPanelOpen(false);
    }
    setMounted(true);
  }, [setSidebarOpen, setRightPanelOpen]);

  if (!mounted) return null;

  if (!token) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background text-on-surface selection:bg-primary/30 overflow-x-hidden">
      <Sidebar />
      <TopBar />
      <RightPanel />
      
      <main className={cn(
        "transition-all duration-300 ease-in-out pt-16 px-4 md:px-gutter h-screen overflow-y-auto custom-scrollbar",
        isSidebarOpen ? "xl:ml-sidebar-width" : "ml-0",
        isRightPanelOpen ? "2xl:mr-right-panel-width" : "mr-0"
      )}>
        <div className="max-w-7xl mx-auto py-6 md:py-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, scale: 0.99, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.99, y: -10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/habits" element={<Habits />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/notes" element={<Notes />} />
                <Route path="/documentation" element={<Documentation />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Decorative gradients */}
      <div className="fixed top-0 left-0 w-full h-screen pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full translate-x-1/4 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full -translate-x-1/4 translate-y-1/4" />
      </div>
    </div>
  );
}

export default App;
