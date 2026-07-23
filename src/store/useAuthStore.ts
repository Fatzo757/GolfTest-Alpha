import { create } from 'zustand';
import { User } from '../types';
import { unsubscribeFromPush } from '../lib/push';

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
    get().setToken(null);
    set({ user: null });
  },

  checkAuth: async () => {
    const { token } = get();
    if (!token) {
      set({ loading: false });
      return;
    }

    set({ loading: true });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('UNAUTHORIZED');
        }
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      if (data.user) {
        set({ user: data.user, error: null });
      } else {
        throw new Error('Invalid user data');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Auth check failed:', err);
      set({ error: `Authentication service unavailable: ${err.message}` });
      if (err.message === 'UNAUTHORIZED') {
        get().setToken(null);
        set({ user: null });
      }
    } finally {
      clearTimeout(timeoutId);
      set({ loading: false });
    }
  }
}));
