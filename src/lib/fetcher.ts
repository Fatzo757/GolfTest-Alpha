import { useAuthStore } from '../store/useAuthStore';

export const fetcher = async (url: string) => {
  const token = useAuthStore.getState().token;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  const res = await fetch(fullUrl, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(errorData.error || `HTTP ${res.status}`);
    (error as any).status = res.status;
    throw error;
  }

  return res.json();
};
