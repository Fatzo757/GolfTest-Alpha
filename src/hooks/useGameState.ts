import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { GameState, Card, Move, User } from '../types';
import { fetcher } from '../lib/fetcher';
import { useGameSocket } from './useGameSocket';
import { soundService } from '../services/soundService';
import { hapticService } from '../services/hapticService';
import { getApiUrl } from '../lib/api';
import { getPoints, calculatePlayerScore } from '../lib/gameScoring';

export { getPoints };

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

  // Auto-dismiss in-game toast notifications after 3 seconds + sound & haptics
  useEffect(() => {
    if (notification) {
      if (user.mute_sounds === 0) {
        soundService.playNotification();
      }
      hapticService.light();

      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification, user.mute_sounds]);

  // Immediately clear notification if game leaves initializing state
  useEffect(() => {
    if (state?.game?.status && state.game.status !== 'initializing' && notification) {
      setNotification(null);
    }
  }, [state?.game?.status, notification]);

  const prevTurnRef = useRef<string | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  const prevStateRef = useRef<GameState | null>(null);

  // Sound triggers & notifications
  useEffect(() => {
    if (state && state.game) {
      const prevState = prevStateRef.current;

      // Turn notification
      if (prevState && prevState.game.current_turn_player_id !== userId && state.game.current_turn_player_id === userId) {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
          try {
            new Notification('GOLF CARD GAME', {
              body: "IT'S YOUR TURN! Choose your next move.",
              tag: 'golf-turn',
              icon: '/notification_icon.png',
            });
          } catch (err) {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then((reg) => {
                reg.showNotification('GOLF CARD GAME', {
                  body: "IT'S YOUR TURN! Choose your next move.",
                  tag: 'golf-turn',
                  icon: '/notification_icon.png',
                  data: { url: `/game/${gameId}` },
                });
              }).catch(() => {});
            }
          }
        }
        if (user.mute_sounds === 0) {
          soundService.playTurn();
        }
        hapticService.medium();
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
        await fetch(getApiUrl('/api/heartbeat'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (state?.game?.id) {
          const res = await fetch(getApiUrl(`/api/games/${state.game.id}/online`), {
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
      if (!state?.cards) return 0;
      return calculatePlayerScore(state.cards, player_id, { onlyFaceUp: true });
    },
    [state]
  );

  // Action methods
  const handleDraw = async (source: 'deck' | 'discard') => {
    if (state?.game.current_turn_player_id !== userId) return;
    if (state.game.drawn_card) return;

    try {
      const res = await fetch(getApiUrl(`/api/games/${gameId}/draw`), {
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

    // Optimistically update card face up state
    if (state) {
      const updatedCards = state.cards.map((c) => {
        if (c.player_id === userId && c.card_index === cardIndex) {
          return {
            ...c,
            is_face_up: true,
          };
        }
        return c;
      });

      const optimisticState: GameState = {
        ...state,
        cards: updatedCards,
      };

      revalidateState(optimisticState, false);
    }

    try {
      const res = await fetch(getApiUrl(`/api/games/${gameId}/reveal`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cardIndex }),
      });
      if (res.ok) {
        revalidateState();
      } else {
        revalidateState();
      }
    } catch (err) {
      console.error(err);
      revalidateState();
    }
  };

  const handleMove = async (cardIndex: number, moveType: 'replace' | 'discard_drawn') => {
    soundService.playPlay();

    // Optimistically update SWR cache so drawn_card disappears instantly from active box
    // and grid card index gets updated without waiting for server network roundtrip!
    if (state) {
      const drawnCard = state.game.drawn_card;
      if (drawnCard) {
        let replacedCard: Card | undefined;
        const updatedCards = state.cards.map((c) => {
          if (c.player_id === userId && c.card_index === cardIndex && moveType === 'replace') {
            replacedCard = c;
            return {
              ...c,
              suit: drawnCard.suit,
              value: drawnCard.value,
              is_face_up: true,
              id: drawnCard.id,
            };
          }
          return c;
        });

        const updatedDiscard = [...(state.game.discard || [])];
        if (moveType === 'discard_drawn') {
          updatedDiscard.push({ ...drawnCard, is_face_up: true });
        } else if (moveType === 'replace' && replacedCard) {
          updatedDiscard.push({ ...replacedCard, is_face_up: true });
        }

        const optimisticState: GameState = {
          ...state,
          game: {
            ...state.game,
            drawn_card: null,
            discard: updatedDiscard,
          },
          cards: updatedCards,
        };

        revalidateState(optimisticState, false);
      }
    }

    try {
      const res = await fetch(getApiUrl(`/api/games/${gameId}/move`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ moveType, cardIndex }),
      });
      if (res.ok) {
        revalidateState();
      } else {
        revalidateState();
      }
    } catch (err) {
      console.error(err);
      revalidateState();
    }
  };

  const handleNextRound = async () => {
    try {
      const res = await fetch(getApiUrl(`/api/games/${gameId}/next-round`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        soundService.playDraw();
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
    handleNextRound,
    revalidateState,
  };
}
