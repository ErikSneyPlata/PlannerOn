//frontend/src/lib/api.ts
import { useAuthStore } from '../store/useStore';

async function request(path: string, options: RequestInit = {}) {
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const token = localStorage.getItem('auth-storage')
    ? JSON.parse(localStorage.getItem('auth-storage')!).state.token
    : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(`${baseURL}${path}`, { ...options, headers });

    if (!res.ok) {
      const text = await res.text();
      let errorData;
      try {
        errorData = text ? JSON.parse(text) : { error: `Status ${res.status}` };
      } catch {
        throw new Error(`Error ${res.status}: ${text.slice(0, 50)}`);
      }
      if (res.status === 401) useAuthStore.getState().logout();
      throw new Error(errorData.error || `Request failed with status ${res.status}`);
    }

    // ── FIX: 204 No Content no tiene body — .json() lanzaría SyntaxError ──
    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return null;
    }

    return await res.json();

  } catch (err: any) {
    console.error(`[API FETCH ERROR] Path: ${path}`, err);
    throw err;
  }
}

export const api = {
  auth: {
    login:    (data: any) => request('/api/auth/login',    { method: 'POST', body: JSON.stringify(data) }),
    register: (data: any) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me:       ()          => request('/api/auth/me'),
  },
  projects: {
    list:   ()                      => request('/api/projects'),
    create: (data: any)             => request('/api/projects',       { method: 'POST',   body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/api/projects/${id}`, { method: 'PATCH',  body: JSON.stringify(data) }),
    delete: (id: string)            => request(`/api/projects/${id}`, { method: 'DELETE' }),
  },
  tasks: {
    list:   ()                      => request('/api/tasks'),
    create: (data: any)             => request('/api/tasks',          { method: 'POST',   body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/api/tasks/${id}`,   { method: 'PATCH',  body: JSON.stringify(data) }),
    delete: (id: string)            => request(`/api/tasks/${id}`,   { method: 'DELETE' }),
  },
  finance: {
    list:   ()           => request('/api/finance'),
    create: (data: any)  => request('/api/finance',       { method: 'POST',   body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/finance/${id}`, { method: 'DELETE' }),
  },
  habits: {
    list:   ()                      => request('/api/habits'),
    create: (data: any)             => request('/api/habits',            { method: 'POST',  body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/api/habits/${id}`,      { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string)            => request(`/api/habits/${id}`,      { method: 'DELETE' }),
    log:    (id: string, data: { date: string; completed: boolean }) => request(`/api/habits/${id}/log`,  { method: 'POST', body: JSON.stringify(data) }),
  },
  agenda: {
    list:   ()          => request('/api/agenda'),
    create: (data: any) => request('/api/agenda', { method: 'POST', body: JSON.stringify(data) }),
  },
  notes: {
    list:   ()                      => request('/api/notes'),
    create: (data: any)             => request('/api/notes',       { method: 'POST',   body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/api/notes/${id}`, { method: 'PATCH',  body: JSON.stringify(data) }),
    delete: (id: string)            => request(`/api/notes/${id}`, { method: 'DELETE' }),
  },
  documentation: {
    list:   (projectId?: string)    => request(`/api/documentation${projectId ? `?projectId=${projectId}` : ''}`),
    get:    (id: string)            => request(`/api/documentation/${id}`),
    create: (data: any)             => request('/api/documentation',       { method: 'POST',   body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/api/documentation/${id}`, { method: 'PATCH',  body: JSON.stringify(data) }),
    delete: (id: string)            => request(`/api/documentation/${id}`, { method: 'DELETE' }),
  },
  focus: {
    list:     ()                      => request('/api/focus'),
    create:   (data: any)             => request('/api/focus',                    { method: 'POST',  body: JSON.stringify(data) }),
    complete: (id: string, data: any) => request(`/api/focus/${id}/complete`,     { method: 'PATCH', body: JSON.stringify(data) }),
    delete:   (id: string)            => request(`/api/focus/${id}`,              { method: 'DELETE' }),
  },
  stats: {
    dashboard: () => request('/api/stats/dashboard'),
  },
  settings: {
    get: () => request('/api/settings'),
    update: (data: any) => request('/api/settings', { method: 'PATCH', body: JSON.stringify(data) }),
    getProfile: () => request('/api/settings/profile'),
    updateProfile: (data: any) => request('/api/settings/profile', { method: 'PATCH', body: JSON.stringify(data) }),
    deleteAccount: () => request('/api/settings/account', { method: 'DELETE' }),
  }
};