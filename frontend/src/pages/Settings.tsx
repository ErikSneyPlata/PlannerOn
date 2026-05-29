import React, { useState, useEffect } from 'react';
import { 
  User, 
  Bell, 
  Lock, 
  Eye, 
  Palette, 
  Globe, 
  LogOut, 
  Shield,
  Smartphone,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/useStore';
import { api } from '../lib/api';

interface UserSettings {
  theme: string;
  language: string;
  timezone: string;
  notifications: boolean;
  analytics: boolean;
  crossDeviceSync: boolean;
}

export default function Settings() {
  const { user, token, setAuth, logout } = useAuthStore();
  
  // Settings & Profile state
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'dark',
    language: 'es',
    timezone: 'America/Bogota',
    notifications: true,
    analytics: true,
    crossDeviceSync: false,
  });
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Account Deletion Confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch current settings
        const settingsData = await api.settings.get();
        if (settingsData) {
          setSettings({
            theme: settingsData.theme || 'dark',
            language: settingsData.language || 'es',
            timezone: settingsData.timezone || 'America/Bogota',
            notifications: settingsData.notifications !== false,
            analytics: settingsData.analytics !== false,
            crossDeviceSync: !!settingsData.crossDeviceSync,
          });
        }
        
        // Ensure name state matches current user
        setEditedName(user?.name || '');
      } catch (err: any) {
        console.error('Failed to load settings:', err);
        setError('Error al cargar la configuración del servidor.');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (token) {
      loadSettings();
    }
  }, [token, user]);

  // Flash success message
  const showSuccessMessage = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => {
      setSuccess(null);
    }, 4000);
  };

  // Update a single setting
  const handleUpdateSetting = async (key: keyof UserSettings, value: any) => {
    try {
      setError(null);
      
      // Optimistic Toggle in local state
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);

      // Save to server
      await api.settings.update({ [key]: value });
      showSuccessMessage('Configuración guardada.');
    } catch (err: any) {
      console.error('Failed to sync setting:', err);
      setError('No se pudo guardar el cambio en el servidor.');
      // Revert optimization on failure
      const reverted = await api.settings.get();
      if (reverted) {
        setSettings(reverted);
      }
    }
  };

  // Update Profile on backend
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedName.trim()) return;

    try {
      setIsSaving(true);
      setError(null);

      const updatedUserRes = await api.settings.updateProfile({
        name: editedName.trim()
      });

      if (updatedUserRes && user) {
        // Update Zustand auth store
        setAuth({
          ...user,
          name: updatedUserRes.name
        }, token);
        
        setIsEditingProfile(false);
        showSuccessMessage('Perfil actualizado correctamente.');
      }
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setError('Ocurrió un error al intentar actualizar el perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  // Core account deletion handler
  const handleDeleteAccount = async () => {
    if (deleteConfirmInput !== 'ELIMINAR MI CUENTA') {
      setError('Por favor, escribe exactamente "ELIMINAR MI CUENTA" para proceder.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await api.settings.deleteAccount();
      logout();
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      setError('Ocurrió un error al intentar eliminar la cuenta.');
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-40">
          Cargando configuración...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 font-sans">
      
      {/* ── Header ── */}
      <div className="mb-10">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-primary opacity-70 mb-1.5">
          Control Center
        </p>
        <h2 className="font-display text-4xl font-black text-on-surface tracking-tighter leading-none">
          Settings & Config
        </h2>
      </div>

      {/* ── Status Notices ── */}
      <AnimatePresence mode="popLayout">
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs font-bold uppercase tracking-wider"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>{success}</span>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-bold"
          >
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Profile Hero ── */}
      <div className="bg-surface-container rounded-[40px] p-8 md:p-10 border border-outline-variant/20 mb-12 flex flex-col md:flex-row items-center gap-10 shadow-sm relative overflow-hidden">
        
        {/* Visual dynamic backgrounds */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/2 blur-[80px] rounded-full translate-x-1/4 -translate-y-1/4 pointer-events-none" />

        <div className="relative">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary via-secondary to-primary bg-[length:200%_200%] p-1 shadow-xl shadow-primary/10">
             <div className="w-full h-full rounded-full bg-surface-container overflow-hidden flex items-center justify-center">
                <span className="text-4xl font-black text-primary">
                  {user?.name?.[0] || user?.email?.[0]?.toUpperCase()}
                </span>
             </div>
          </div>
        </div>

        <div className="flex-1 w-full text-center md:text-left">
          {!isEditingProfile ? (
            <>
              <h3 className="text-3xl font-black text-on-surface tracking-tight mb-1">
                {user?.name || 'Usuario Autenticado'}
              </h3>
              <p className="text-sm font-medium text-on-surface-variant opacity-60 mb-6">
                {user?.email}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start">
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs uppercase tracking-wider transition-all hover:bg-primary/90 active:scale-95"
                >
                  Editar Perfil
                </button>
                <div className="px-4 py-2 bg-surface-container-highest/50 rounded-xl border border-outline-variant/10 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  Beta Access
                </div>
              </div>
            </>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md mx-auto md:mx-0">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Nombre de Usuario
                </label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="Tu nombre..."
                  required
                />
              </div>

              <div className="flex items-center gap-3 justify-center md:justify-start">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all hover:bg-emerald-500 active:scale-95 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Guardar Perfil
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(false);
                    setEditedName(user?.name || '');
                  }}
                  className="px-5 py-2.5 bg-surface-container-high text-on-surface-variant rounded-xl font-bold text-xs uppercase tracking-wider transition-all hover:bg-surface-container-highest"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── Settings Sections ── */}
      <div className="space-y-12">
        
        {/* Section 1: Preference Panels */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-primary ml-4">
            Preferencia Visual & Región
          </h4>
          <div className="bg-surface-container border border-outline-variant/20 rounded-[32px] p-6 space-y-6">
            
            {/* Theme Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/5">
              <div className="flex gap-4">
                <div className="p-3.5 rounded-2xl bg-surface-container-high shrink-0">
                  <Palette className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-base font-bold text-on-surface mb-0.5 tracking-tight">Esquema del Sistema</p>
                  <p className="text-[11px] font-medium text-on-surface-variant opacity-50">Theme setup for UI elements</p>
                </div>
              </div>
              <div className="flex bg-surface-container-high p-1 rounded-xl border border-outline-variant/30 self-start sm:self-center">
                {['light', 'dark', 'system'].map((t) => (
                  <button
                    key={t}
                    onClick={() => handleUpdateSetting('theme', t)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                      settings.theme === t 
                        ? "bg-primary text-on-primary shadow" 
                        : "text-on-surface-variant hover:bg-surface-container-highest"
                    )}
                  >
                    {t === 'light' ? 'Claro' : t === 'dark' ? 'Oscuro' : 'Auto'}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/5">
              <div className="flex gap-4">
                <div className="p-3.5 rounded-2xl bg-surface-container-high shrink-0">
                  <Globe className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-base font-bold text-on-surface mb-0.5 tracking-tight">Idioma de Preferencia</p>
                  <p className="text-[11px] font-medium text-on-surface-variant opacity-50">Select your active language code</p>
                </div>
              </div>
              <select
                value={settings.language}
                onChange={(e) => handleUpdateSetting('language', e.target.value)}
                className="bg-surface-container-high text-on-surface border border-outline-variant/30 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-primary/50"
              >
                <option value="es">Español (ES)</option>
                <option value="en">English (EN)</option>
                <option value="pt">Português (PT)</option>
              </select>
            </div>

            {/* Timezone Configuration */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex gap-4">
                <div className="p-3.5 rounded-2xl bg-surface-container-high shrink-0">
                  <Shield className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-base font-bold text-on-surface mb-0.5 tracking-tight">Zona Horaria</p>
                  <p className="text-[11px] font-medium text-on-surface-variant opacity-50">Schedules and reminders synchronize globally</p>
                </div>
              </div>
              <select
                value={settings.timezone}
                onChange={(e) => handleUpdateSetting('timezone', e.target.value)}
                className="bg-surface-container-high text-on-surface border border-outline-variant/30 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-primary/50"
              >
                <option value="America/Bogota">Col (GMT-5)</option>
                <option value="America/Mexico_City">Mex (GMT-6)</option>
                <option value="America/New_York">EST (GMT-5)</option>
                <option value="UTC">UTC (Universal)</option>
              </select>
            </div>

          </div>
        </div>

        {/* Section 2: Real Toggles */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-primary ml-4">
            Security & Controls
          </h4>
          <div className="bg-surface-container border border-outline-variant/20 rounded-[32px] overflow-hidden">
            
            {/* Toggle 1: Notifications */}
            <div className="flex items-center justify-between p-6 hover:bg-surface-container-high transition-colors border-b border-outline-variant/5">
              <div className="flex gap-6">
                <div className="p-3.5 rounded-2xl bg-surface-container-high">
                  <Bell className="w-5 h-5 text-on-surface-variant" />
                </div>
                <div>
                  <p className="text-base font-bold text-on-surface mb-0.5 tracking-tight">Alertas de Notificación</p>
                  <p className="text-[11px] font-medium text-on-surface-variant opacity-50">Neural popups for reminders</p>
                </div>
              </div>
              <button 
                onClick={() => handleUpdateSetting('notifications', !settings.notifications)}
                className={cn(
                  "w-12 h-6 rounded-full p-1 transition-all relative shadow-inner",
                  settings.notifications ? "bg-primary" : "bg-surface-container-highest"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full bg-on-primary transition-all shadow-sm",
                  settings.notifications ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
            </div>

            {/* Toggle 2: Analytics */}
            <div className="flex items-center justify-between p-6 hover:bg-surface-container-high transition-colors border-b border-outline-variant/5">
              <div className="flex gap-6">
                <div className="p-3.5 rounded-2xl bg-surface-container-high">
                  <Eye className="w-5 h-5 text-on-surface-variant" />
                </div>
                <div>
                  <p className="text-base font-bold text-on-surface mb-0.5 tracking-tight">Protocolo de Privacidad</p>
                  <p className="text-[11px] font-medium text-on-surface-variant opacity-50">Allow telemetry tracking for better UX</p>
                </div>
              </div>
              <button 
                onClick={() => handleUpdateSetting('analytics', !settings.analytics)}
                className={cn(
                  "w-12 h-6 rounded-full p-1 transition-all relative shadow-inner",
                  settings.analytics ? "bg-primary" : "bg-surface-container-highest"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full bg-on-primary transition-all shadow-sm",
                  settings.analytics ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
            </div>

            {/* Toggle 3: Sync */}
            <div className="flex items-center justify-between p-6 hover:bg-surface-container-high transition-colors">
              <div className="flex gap-6">
                <div className="p-3.5 rounded-2xl bg-surface-container-high">
                  <Smartphone className="w-5 h-5 text-on-surface-variant" />
                </div>
                <div>
                  <p className="text-base font-bold text-on-surface mb-0.5 tracking-tight">Sincronización Multidispositivo</p>
                  <p className="text-[11px] font-medium text-on-surface-variant opacity-50">Sync state in real-time across active sessions</p>
                </div>
              </div>
              <button 
                onClick={() => handleUpdateSetting('crossDeviceSync', !settings.crossDeviceSync)}
                className={cn(
                  "w-12 h-6 rounded-full p-1 transition-all relative shadow-inner",
                  settings.crossDeviceSync ? "bg-primary" : "bg-surface-container-highest"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full bg-on-primary transition-all shadow-sm",
                  settings.crossDeviceSync ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* ── Danger Zone ── */}
      <div className="mt-16 pt-12 border-t border-outline-variant/20 space-y-6">
        
        {/* Core Session Purge */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-surface-container border border-outline-variant/10 rounded-[32px] p-8">
          <div>
            <h4 className="text-lg font-black text-on-surface mb-1">Clearance Session</h4>
            <p className="text-xs text-on-surface-variant opacity-60">Session tokens and local cache will be safely purged.</p>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-8 py-4 bg-surface-container-highest hover:bg-rose-500/10 hover:text-rose-400 text-on-surface rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>

        {/* Complete Account Destruction */}
        <div className="bg-rose-500/[0.03] border border-rose-500/10 rounded-[32px] p-8 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h4 className="text-lg font-black text-rose-500 mb-1">Destruction Vault (Danger Zone)</h4>
              <p className="text-xs text-on-surface-variant opacity-60">Permanently delete your profile, projects, task matrices, databases, and configuration.</p>
            </div>
            
            {!showDeleteConfirm && (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-3 px-8 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-rose-500/10 shrink-0"
              >
                <Trash2 className="w-5 h-5" />
                Eliminar Cuenta
              </button>
            )}
          </div>

          {showDeleteConfirm && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-6 border-t border-rose-500/10 space-y-4"
            >
              <p className="text-xs font-semibold text-rose-400">
                Esta acción es irreversible. Para confirmar la eliminación permanente de tu cuenta y toda tu información, ingresa la frase: <strong className="text-rose-500 select-all font-mono">ELIMINAR MI CUENTA</strong>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  className="bg-surface-container-high border border-rose-500/30 text-rose-500 placeholder:text-rose-500/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-500 w-full font-bold uppercase tracking-wider"
                  placeholder="Escribe la frase de seguridad..."
                />
                
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isSaving || deleteConfirmInput !== 'ELIMINAR MI CUENTA'}
                    className="px-6 py-3 bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-rose-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Confirmar Destrucción
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmInput('');
                    }}
                    className="px-6 py-3 bg-surface-container-high text-on-surface-variant rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

      </div>

      {/* ── App Version ── */}
      <div className="mt-12 text-center">
         <p className="text-[10px] font-bold text-on-surface-variant opacity-20 uppercase tracking-[0.3em]">
           PlannerOn System // Version v2.4.1 (Stable Build)
         </p>
      </div>
    </div>
  );
}
