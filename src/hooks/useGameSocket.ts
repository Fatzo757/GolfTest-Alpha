import { useEffect, useRef } from 'react';
import { useSWRConfig } from 'swr';
import { useAuthStore } from '../store/useAuthStore';

export function useGameSocket(gameId: string | null) {
  const { mutate } = useSWRConfig();
  const token = useAuthStore((state) => state.token);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!gameId || !token) return;

    // Determine WS protocol based on window location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host = window.location.host;

    // Handle Vite dev server port vs Express backend port if configured
    const apiBase = import.meta.env.VITE_API_BASE_URL;
    if (apiBase) {
      try {
        const url = new URL(apiBase);
        host = url.host;
      } catch (e) {}
    }

    const wsUrl = `${protocol}//${host}/ws?gameId=${encodeURIComponent(gameId)}&token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log(`[WS] Connected to game channel: ${gameId}`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'GAME_UPDATED' && data.gameId === gameId) {
          mutate(`/api/games/${gameId}`);
        }
      } catch (e) {
        console.error('[WS] Failed to parse message', e);
      }
    };

    ws.onerror = (error) => {
      console.warn('[WS] Socket error:', error);
    };

    ws.onclose = () => {
      console.log(`[WS] Disconnected from game channel: ${gameId}`);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      socketRef.current = null;
    };
  }, [gameId, token, mutate]);
}
