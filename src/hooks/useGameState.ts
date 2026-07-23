import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { GameState, Card, Move, User } from '../types';
import { fetcher } from '../lib/fetcher';
import { useGameSocket } from './useGameSocket';
import { soundService } from '../services/soundService';

export function getPoints(value: string) {
  if (value === 'J') return -2;
  if (value === 'K') return 0;
  if (value === 'Q') return 10;
  if (value === 'A') return 1;
  const num = parseInt(value);
  return isNaN(num) ? 10 : num;
}

export function useGameState(gameId: string, token: string, user: User) {
  const userId = user.id;

  // Real-time WebSocket room updates
  useGameSocket(gameId);

  // SWR data fetching
  const { data: state, error: swrError, isLoading: loading, mutate: revalidateState } = useSWR<GameState>(
    gameId && token ? `/api/games/${gameId}` : null,
    fetcher,
    { refreshInterval: 10000 }
  );

  const error = swrError ? (swrError.status === 404 ? 'Match not found or has been archived.' : swrError.message) : null;
  const [isOpponentOnline, setIsOpponentOnline] = useState(true);
  const [notification, setNotification] = useState<{ title: string; subtitle?: string } | null>(null);

  const prevTurnRef = useRef<string | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  const prevStateRef = useRef<GameState | null>(null);

  // Sound triggers & notifications
  useEffect(() => {
    if (state && state.game) {
      const prevState = prevStateRef.current;

      // Turn notification
      if (prevState && prevState.game.current_turn_player_id !== userId && state.game.current_turn_player_id === userId) {
        setNotification({ title: "IT'S YOUR TURN!", subtitle: 'Choose your next move' });
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
          try {
            new Notification('GOLF CARD GAME', {
              body: "IT'S YOUR TURN! Choose your next move.",
              tag: 'golf-turn',
            });
          } catch (err) {}
        }
        if (user.mute_sounds === 0) {
          soundService.playTurn();
        }
        setTimeout(() => setNotification(null), 5000);
      }

      // Sound triggers
      if (prevState && prevState.game.status !== state.game.status) {
        if (state.game.status === 'round_end') {
          soundService.playRoundEnd();
        } else if (state.game.status === 'finished') {
          if (state.game.winner_player_id === userId) {
            soundService.playWin();
          } else {
            soundService.playLose();
          }
        }
      }

      prevStateRef.current = state;
    }
  }, [state, userId, user.mute_sounds]);

  // Heartbeat & Online Status check
  useEffect(() => {
    const heartbeatId = setInterval(async () => {
      if (!token) return;
      try {
        await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/heartbeat`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (state?.game?.id) {
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/games/${state.game.id}/online`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setIsOpponentOnline(data.online);
          }
        }
      } catch (err) {}
    }, 5000);

    return () => {
      clearInterval(heartbeatId);
    };
  }, [token, state?.game?.id]);

  // Derived values
  const isMyTurn = state?.game.current_turn_player_id === userId;
  const opponentId = state?.game.player1_id === userId ? state?.game.player2_id : state?.game.player1_id;
  const canDraw = isMyTurn && !state?.game.drawn_card && state?.game.status !== 'initializing';

  const myName = (state?.game.player1_id === userId ? state?.game.player1_name : state?.game.player2_name) || 'Player';
  const opponentName = (state?.game.player1_id === userId ? state?.game.player2_name : state?.game.player1_name) || (state?.game.is_vs_cpu ? 'CPU' : 'Opponent');
  const opponentAvatar = state?.game?.player1_id === userId ? (state?.game as any)?.player2_avatar : (state?.game as any)?.player1_avatar;

  const myCards = useMemo(() => {
    return state?.cards.filter((c) => c.player_id === userId).sort((a, b) => (a.card_index || 0) - (b.card_index || 0)) || [];
  }, [state?.cards, userId]);

  const opponentCards = useMemo(() => {
    return (
      state?.cards
        .filter((c) => {
          if (state?.game?.is_vs_cpu) return c.player_id === 'cpu';
          return c.player_id === opponentId;
        })
        .sort((a, b) => (a.card_index || 0) - (b.card_index || 0)) || []
    );
  }, [state?.cards, state?.game?.is_vs_cpu, opponentId]);

  const latestGridMove = useMemo(() => {
    if (!state?.moves) return null;
    return state.moves.find((m) => m.card_affected_index !== null && !['initial_card', 'initial_discard', 'round_start'].includes(m.move_type));
  }, [state?.moves]);

  const latestMove = useMemo(() => {
    if (!state?.moves) return null;
    return state.moves.find((m) => !['initial_card', 'initial_discard', 'round_start'].includes(m.move_type));
  }, [state?.moves]);

  const calculateScore = useCallback(
    (player_id: string) => {
      if (!state) return 0;
      const playerCards = state.cards
        .filter((c) => c.player_id === player_id)
        .sort((a, b) => (a.card_index || 0) - (b.card_index || 0));

      const partOfSet = new Set<number>();
      const rows = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
      const cols = [[0, 3, 6], [1, 4, 7], [2, 5, 8]];

      // Check rows
      rows.forEach((indices) => {
        const row = indices.map((i) => playerCards[i]);
        const allFaceUp = row.every((c) => c && c.is_face_up);
        if (allFaceUp && row[0].value === row[1].value && row[1].value === row[2].value) {
          indices.forEach((i) => partOfSet.add(i));
        }
      });

      // Check columns
      cols.forEach((indices) => {
        const col = indices.map((i) => playerCards[i]);
        const allFaceUp = col.every((c) => c && c.is_face_up);
        if (allFaceUp && col[0].value === col[1].value && col[1].value === col[2].value) {
          indices.forEach((i) => partOfSet.add(i));
        }
      });

      let total = 0;
      playerCards.forEach((card, index) => {
        if (card && card.is_face_up && !partOfSet.has(index)) {
          total += getPoints(card.value);
        }
      });

      return total;
    },
    [state]
  );

  // Action methods
  const handleDraw = async (source: 'deck' | 'discard') => {
    if (state?.game.current_turn_player_id !== userId) return;
    if (state.game.drawn_card) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/games/${gameId}/draw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ source }),
      });
      if (res.ok) {
        soundService.playDraw();
        revalidateState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReveal = async (cardIndex: number) => {
    if (state?.game.status !== 'initializing' && state?.game.status !== 'waiting') return;

    if (state.game.status === 'initializing') {
      const faceUpCount = myCards.filter((c) => c.is_face_up).length;
      if (faceUpCount >= 2) {
        setNotification({ title: 'READY', subtitle: 'Game starts when all players are ready' });
        return;
      }
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/games/${gameId}/reveal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cardIndex }),
      });
      if (res.ok) {
        revalidateState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMove = async (cardIndex: number, moveType: 'replace' | 'discard_drawn') => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/games/${gameId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ moveType, cardIndex }),
      });
      if (res.ok) {
        soundService.playPlay();
        revalidateState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return {
    state,
    loading,
    error,
    isOpponentOnline,
    notification,
    setNotification,
    isMyTurn,
    canDraw,
    myName,
    opponentName,
    opponentAvatar,
    myCards,
    opponentCards,
    latestMove,
    latestGridMove,
    calculateScore,
    handleDraw,
    handleReveal,
    handleMove,
    revalidateState,
  };
}
