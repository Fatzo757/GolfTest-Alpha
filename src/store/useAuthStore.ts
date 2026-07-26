import { create } from 'zustand';
import { User } from '../types';
import { unsubscribeFromPush } from '../lib/push';
import { getApiUrl } from '../lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isOnline: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsOnline: (isOnline: boolean) => void;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const getInitialToken = (): string | null => {
  try {
    return localStorage.getItem('golf_token');
  } catch (e) {
    console.warn('LocalStorage access failed:', e);
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: getInitialToken(),
  loading: true,
  error: null,
  isOnline: navigator.onLine,

  setUser: (user) => set({ user }),
  setToken: (token) => {
    set({ token });
    if (token) {
      try {
        localStorage.setItem('golf_token', token);
      } catch (e) {}
    } else {
      try {
        localStorage.removeItem('golf_token');
      } catch (e) {}
    }
  },
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setIsOnline: (isOnline) => set({ isOnline }),

  login: (token, user) => {
    get().setToken(token);
    set({ user, error: null });
  },

  logout: async () => {
    const { token } = get();
    if (token) {
      await unsubscribeFromPush(token);
    }

    try {
      await fetch(getApiUrl('/api/auth/logout'), {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (e) {}

    get().setToken(null);
    set({ user: null });
  },

  checkAuth: async () => {
    set({ loading: true });
    const { token } = get();
    if (!token) {
      set({ user: null, loading: false, error: null });
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(getApiUrl('/api/auth/me'), {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      const contentType = res.headers.get('content-type');
      if (!res.ok || !contentType || !contentType.includes('application/json')) {
        get().setToken(null);
        set({ user: null, error: null });
        return;
      }

      const data = await res.json();
      if (data && data.user) {
        set({ user: data.user, error: null });
      } else {
        get().setToken(null);
        set({ user: null, error: null });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn('Auth check request timed out');
      } else {
        console.error('Auth check failed:', err);
      }
      get().setToken(null);
      set({ user: null, error: null });
    } finally {
      clearTimeout(timeoutId);
      set({ loading: false });
    }
  },
}));
