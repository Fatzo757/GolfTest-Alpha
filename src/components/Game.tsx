import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GameState, Card, Move, User } from '../types.ts';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { RefreshCw, ArrowLeft, History, Info, ChevronRight, X, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { Chat } from './Chat';
import { soundService } from '../services/soundService';
import UserAvatar from './UserAvatar.tsx';
import CardComponent, { CardPattern, getCardBackColors } from './Card.tsx';
import { formatMatchTime } from '../lib/timeUtils';
import Confetti from './Confetti';

interface GameProps {
  gameId: string;
  token: string;
  user: User;
  onExit: () => void;
  onRematch?: (newGameId: string) => void;
}

export default function Game({ gameId, token, user, onExit, onRematch }: GameProps) {
  const userId = user.id;
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingStateRef = useRef(false);
  const [isOpponentOnline, setIsOpponentOnline] = useState(true);
  const [notification, setNotification] = useState<{title: string, subtitle?: string} | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [draggingOver, setDraggingOver] = useState<{ type: 'grid' | 'discard'; index?: number } | null>(null);
  
  const [mobileTab, setMobileTab] = useState<'me' | 'opponent' | 'history'>('me');
  const [nudgeCooldown, setNudgeCooldown] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [moveFilter, setMoveFilter] = useState<'ALL' | 'ME' | 'OPPONENT'>('ALL');
  const prevTurnRef = useRef<string | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  const discardPileRef = useRef<HTMLDivElement>(null);
  const gridRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevStateRef = useRef<GameState | null>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const fetchState = useCallback(async (silent = false) => {
    if (loadingStateRef.current && !silent) return;
    if (!token) return;

    try {
      if (!silent && !prevStateRef.current) setLoading(true);
      loadingStateRef.current = true;

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/games/${gameId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 404) {
        setError("Match not found or has been archived.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Sync Error: ${res.status}`);
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response format");
      }

      const data = await res.json();
      
      if (data && data.game) {
        const prevState = prevStateRef.current;
        
        // Turn notification
        if (prevState && prevState.game.current_turn_player_id !== userId && data.game.current_turn_player_id === userId) {
          setNotification({ title: "IT'S YOUR TURN!", subtitle: "Choose your next move" });
          
          // Browser Notification
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
            try {
              new Notification("GOLF CARD GAME", {
                body: "IT'S YOUR TURN! Choose your next move.",
                tag: 'golf-turn'
              });
            } catch (err) {
              console.error("Notification failed:", err);
            }
          }

          if (user.mute_sounds === 0) {
            soundService.playTurn();
          }
          setTimeout(() => setNotification(null), 5000);
        }

        // Initialization notification
        if (!prevState && data.game.status === 'initializing') {
          setNotification({ title: "GAME SETUP", subtitle: "Reveal 2 cards to start" });
          setTimeout(() => setNotification(null), 3000);
        }
        
        // Game start notification
        if (prevState && prevState.game.status === 'initializing' && data.game.status === 'playing') {
          setNotification({ title: "GAME STARTED!", subtitle: "Select a card from the deck or discard pile" });
          setTimeout(() => setNotification(null), 4000);
        }

        // Detect CPU move change
        const cpuMoves = data.moves.filter((m: Move) => m.player_id === 'cpu');
        if (cpuMoves.length > 0) {
          const latestCpuMove = cpuMoves[0];
          
        }

        // Sound triggers
        if (prevState && prevState.game.status !== data.game.status) {
          if (data.game.status === 'round_end') {
            soundService.playRoundEnd();
          } else if (data.game.status === 'finished') {
            if (data.game.winner_player_id === userId) {
              soundService.playWin();
            } else {
              soundService.playLose();
            }
          }
        }
        
        setState(data);
        prevStateRef.current = data;
        setError(null);
      } else {
        throw new Error("Empty game data received");
      }
    } catch (err: any) {
      if (err.message !== 'Failed to fetch') {
        console.error('Fetch State Error:', err);
      }
      if (!prevStateRef.current) setError(err.message === 'Failed to fetch' ? 'Connecting to server...' : (err.message || 'Unknown sync error'));
    } finally {
      setLoading(false);
      loadingStateRef.current = false;
    }
  }, [gameId, token, userId, user.mute_sounds]);

  

  useEffect(() => {
    // Initial fetch
    fetchState();
    
    pollInterval.current = setInterval(() => fetchState(true), 1500);

    // Heartbeat & Online Status check
    const heartbeatId = setInterval(async () => {
      if (!token) return;
      try {
        // Update my own status
        const hbRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/heartbeat`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!hbRes.ok) return;

        // Check opponent status
        if (prevStateRef.current?.game.id) {
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/games/${prevStateRef.current.game.id}/online`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setIsOpponentOnline(data.online);
          }
        }
      } catch (err) {
        // Silent fail for network errors during heartbeat
      }
    }, 5000);

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
      clearInterval(heartbeatId);
    };
  }, [fetchState, token]);

  useEffect(() => {
    if (state?.game) {
      const statusChanged = prevStatusRef.current !== state.game.status;
      const turnChanged = prevTurnRef.current !== state.game.current_turn_player_id;

      if (statusChanged && state.game.status === 'initializing') {
        setMobileTab('me');
      } else if (turnChanged) {
        if (state.game.current_turn_player_id === userId) {
          setMobileTab('me');
        } else {
          setMobileTab('opponent');
        }
      }

      prevStatusRef.current = state.game.status;
      prevTurnRef.current = state.game.current_turn_player_id;
    }
  }, [state?.game?.current_turn_player_id, state?.game?.status, userId]);

  const handleNewMatch = async () => {
    if (!state || !onRematch) {
      onExit();
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/games/${gameId}/rematch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        onRematch(data.gameId);
      } else {
        setError(data.error);
        onExit(); // Fallback
      }
    } catch (err) {
      console.error(err);
      onExit(); // Fallback
    }
  };

  const handleDraw = async (source: 'deck' | 'discard') => {
    if (state?.game.current_turn_player_id !== userId) return;
    if (state.game.drawn_card) return; // Already drawn

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/games/${gameId}/draw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ source })
      });
      if (res.ok) {
        soundService.playDraw();
        fetchState(true);
      } else {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Draw failed:', error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReveal = async (cardIndex: number) => {
    if (state?.game.status !== 'initializing' && state?.game.status !== 'waiting') return;
    
    // Client side check for initialization
    if (state.game.status === 'initializing') {
      const faceUpCount = myCards.filter(c => c.is_face_up).length;
      if (faceUpCount >= 2) {
        setNotification({ title: "READY", subtitle: "Game starts when all players are ready" });
        return;
      }
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/games/${gameId}/reveal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cardIndex })
      });
      if (res.ok) {
        fetchState(true);
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
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          moveType,
          cardIndex
        })
      });
      if (res.ok) {
        soundService.playPlay();
        setMobileTab('opponent');
        fetchState(true);
      } else {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Move failed:', error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMyTurnNow = state?.game?.current_turn_player_id === userId;
      if (!state?.game || !isMyTurnNow) return;

      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= 6) {
        if (state.game.status === 'initializing') {
          handleReveal(num - 1);
        } else if (state.game.status === 'playing' && state.game.drawn_card) {
          handleMove(num - 1, 'replace');
        }
      } else if (state.game.status === 'playing') {
        if (e.key.toLowerCase() === 'd') {
          if (!state.game.drawn_card) {
            handleDraw('deck');
          }
        } else if (e.key.toLowerCase() === 's') {
          if (!state.game.drawn_card) {
            handleDraw('discard');
          } else {
            handleMove(0, 'discard_drawn');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, userId, handleDraw, handleReveal, handleMove]);

  const getPoints = (value: string) => {
    if (value === 'J') return -2;
    if (value === 'K') return 0;
    if (value === 'Q') return 10;
    if (value === 'A') return 1;
    const num = parseInt(value);
    return isNaN(num) ? 10 : num;
  };

  const calculateScore = (player_id: string) => {
    if (!state) return 0;
    const playerCards = state.cards
      .filter(c => c.player_id === player_id)
      .sort((a, b) => (a.card_index || 0) - (b.card_index || 0));
    
    const partOfSet = new Set<number>();
    const rows = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
    const cols = [[0, 3, 6], [1, 4, 7], [2, 5, 8]];

    // Check rows
    rows.forEach(indices => {
      const row = indices.map(i => playerCards[i]);
      const allFaceUp = row.every(c => c && c.is_face_up);
      if (allFaceUp && row[0].value === row[1].value && row[1].value === row[2].value) {
        indices.forEach(i => partOfSet.add(i));
      }
    });

    // Check columns
    cols.forEach(indices => {
      const col = indices.map(i => playerCards[i]);
      const allFaceUp = col.every(c => c && c.is_face_up);
      if (allFaceUp && col[0].value === col[1].value && col[1].value === col[2].value) {
        indices.forEach(i => partOfSet.add(i));
      }
    });

    let total = 0;
    playerCards.forEach((card, index) => {
      if (card && card.is_face_up && !partOfSet.has(index)) {
        total += getPoints(card.value);
      }
    });

    return total;
  };

  const isMyTurn = state?.game.current_turn_player_id === userId;
  const opponentId = state?.game.player1_id === userId ? state?.game.player2_id : state?.game.player1_id;
  const canDraw = isMyTurn && !state?.game.drawn_card && state?.game.status !== 'initializing';

  const latestGridMove = useMemo(() => {
    if (!state?.moves) return null;
    return state.moves.find(m => m.card_affected_index !== null && !['initial_card', 'initial_discard', 'round_start'].includes(m.move_type));
  }, [state?.moves]);

  const latestMove = useMemo(() => {
    if (!state?.moves) return null;
    return state.moves.find(m => !['initial_card', 'initial_discard', 'round_start'].includes(m.move_type));
  }, [state?.moves]);

  const myName = (state?.game.player1_id === userId ? state?.game.player1_name : state?.game.player2_name) || 'Player';
  const opponentName = (state?.game.player1_id === userId ? state?.game.player2_name : state?.game.player1_name) || (state?.game.is_vs_cpu ? 'CPU' : 'Opponent');
  const opponentAvatar = state?.game?.player1_id === userId ? (state?.game as any)?.player2_avatar : (state?.game as any)?.player1_avatar;

  const myCards = state?.cards.filter(c => c.player_id === userId).sort((a,b) => (a.card_index || 0) - (b.card_index || 0)) || [];
  const opponentCards = state?.cards.filter(c => {
    if (state?.game?.is_vs_cpu) return c.player_id === 'cpu';
    return c.player_id === opponentId;
  }).sort((a,b) => (a.card_index || 0) - (b.card_index || 0)) || [];

  const opponentCardStyle = state?.game?.player1_id === userId ? state?.game?.player2_card_style : state?.game?.player1_card_style;
  const opponentCardBackStyle = state?.game?.player1_id === userId ? state?.game?.player2_card_back_style : state?.game?.player1_card_back_style;
  const opponentCardBackColor = state?.game?.player1_id === userId ? state?.game?.player2_card_back_color : state?.game?.player1_card_back_color;
  const opponentCardBackSecondaryColor = state?.game?.player1_id === userId ? state?.game?.player2_card_back_secondary_color : state?.game?.player1_card_back_secondary_color;

  const turnIndicator = (colorClass: string) => (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`flex items-center gap-1 font-bold ${colorClass} px-2 h-full border-l border-white/10`}
    >
      <motion.div
        animate={{ x: [0, 4, 0] }}
        transition={{ repeat: Infinity, duration: 0.6 }}
      >
        <ChevronRight size={10} strokeWidth={3} />
      </motion.div>
      <span className="text-[9px] tracking-[0.2em] animate-pulse">ACTIVE_TURN</span>
    </motion.div>
  );

  const cardVariants = {
    hidden: { scale: 0, opacity: 0, rotateY: 180, x: -100, y: 100 },
    visible: (i: number) => ({ 
      scale: 1, 
      opacity: 1, 
      rotateY: 0,
      x: 0,
      y: 0,
      transition: { 
        type: 'spring', 
        damping: 18, 
        stiffness: 150,
        delay: i * 0.05
      }
    }),
    exit: { scale: 0, opacity: 0, transition: { duration: 0.2 } }
  };

  const boardVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        type: 'spring',
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

    const DeckAndDiscard = (
      <div className="h-[145px] md:h-[200px] lg:h-auto p-2 md:p-6 geometric-border bg-black/10 flex flex-row lg:flex-col items-center justify-center gap-1 md:gap-4 lg:gap-8 min-w-fit w-full">
         {/* Deck Slot */}
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="flex flex-col items-center gap-1 w-16 md:w-28"
         >
          <motion.div 
             onClick={() => canDraw && handleDraw('deck')}
             whileHover={canDraw ? { scale: 1.1, rotate: 5, boxShadow: '8px 8px 0px 0px rgba(255,123,82,0.4)' } : {}}
             whileTap={canDraw ? { scale: 0.9 } : {}}
             className={`w-full aspect-[3/4] geometric-card geometric-card-back cursor-pointer transition-all relative small md:normal ${canDraw ? '!border-black ring-2 ring-ui-yellow ring-offset-2 ring-offset-bg-dark' : 'opacity-60 !border-black'} ${latestMove?.player_id !== userId && latestMove?.move_type.includes('deck') ? 'ring-2 ring-ui-orange ring-offset-2 ring-offset-bg-dark shadow-[0_0_10px_rgba(255,123,82,0.5)]' : ''}`}
             style={{ backgroundColor: getCardBackColors(user.card_back_color || 'ui-red').hex }}
           >
             {latestMove?.player_id !== userId && latestMove?.move_type.includes('deck') && (
               <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-ui-orange text-white text-[7px] font-bold px-1 py-0.5 rounded-full whitespace-nowrap animate-bounce z-50">
                 {latestMove.player_id === "cpu" ? "CPU" : "OPPONENT"}
               </div>
             )}
             <div className="card-pattern absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
               <CardPattern backStyle={user.card_back_style || 'classic'} backColor={user.card_back_color || 'ui-red'} backSecondaryColor={user.card_back_secondary_color || 'white'} />
             </div>
             <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
               <div className={`text-[9px] md:text-[12px] font-bold drop-shadow-lg text-center transition-colors ${state?.game?.deck_count && state.game.deck_count < 10 ? 'text-ui-red animate-pulse' : 'text-ui-orange'}`}>
                 {state?.game?.deck_count}
               </div>
             </div>
           </motion.div>
           <span className="text-[7px] md:text-[10px] text-ui-orange tracking-widest font-bold uppercase">Deck</span>
        </motion.div>

        {/* Integrated Active Card Area - Fixed Width Slot */}
        <div className="w-[110px] md:w-[150px] lg:w-full flex flex-col items-center justify-center h-[125px] md:h-[160px] lg:h-auto lg:min-h-[140px]">
          <AnimatePresence mode="wait" initial={false}>
            {state?.game?.drawn_card ? (
              <motion.div 
                key="active-card"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center gap-1"
              >
                <span className="text-[7px] text-ui-yellow font-black uppercase tracking-[0.2em] animate-pulse">Active</span>
                <div className="flex items-center gap-1 relative z-50">
                  <motion.div
                    drag={isMyTurn}
                    dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                    dragSnapToOrigin
                    onDragStart={() => soundService.playDraw()}
                    onDrag={(e, info) => {
                      const x = info.point.x;
                      const y = info.point.y;
                      
                      const discardRect = discardPileRef.current?.getBoundingClientRect();
                      if (discardRect && x >= discardRect.left && x <= discardRect.right && y >= discardRect.top && y <= discardRect.bottom) {
                        setDraggingOver({ type: 'discard' });
                        return;
                      }

                      for (let i = 0; i < gridRefs.current.length; i++) {
                        const rect = gridRefs.current[i]?.getBoundingClientRect();
                        if (rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                          setDraggingOver({ type: 'grid', index: i });
                          return;
                        }
                      }
                      setDraggingOver(null);
                    }}
                    onDragEnd={(e, info) => {
                      const x = info.point.x;
                      const y = info.point.y;
                      setDraggingOver(null);
                      const discardRect = discardPileRef.current?.getBoundingClientRect();
                      if (discardRect && x >= discardRect.left && x <= discardRect.right && y >= discardRect.top && y <= discardRect.bottom) {
                        handleMove(0, 'discard_drawn');
                        return;
                      }
                      for (let i = 0; i < gridRefs.current.length; i++) {
                        const rect = gridRefs.current[i]?.getBoundingClientRect();
                        if (rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                          handleMove(i, 'replace');
                          return;
                        }
                      }
                    }}
                    whileHover={isMyTurn ? { scale: 1.05 } : {}}
                    whileDrag={{ scale: 1.15, zIndex: 100 }}
                    className={`${isMyTurn ? "cursor-grab active:cursor-grabbing" : ""} w-16 md:w-24 aspect-[3/4]`}
                  >
                    <CardComponent
                      key={state.game.drawn_card.id}
                      card={state.game.drawn_card}
                      index={-1}
                      style={user.card_style || 'classic'} backStyle={user.card_back_style || 'classic'} backColor={user.card_back_color || 'ui-red'} backSecondaryColor={user.card_back_secondary_color || 'white'}
                      className={`small md:normal !border-black ${isMyTurn ? 'ring-2 ring-ui-yellow/50 shadow-[0_0_20px_rgba(255,205,117,0.3)]' : ''}`}
                      forceFaceUp={true}
                    />
                  </motion.div>
                  {isMyTurn && (
                    <button 
                      onClick={() => handleMove(0, 'discard_drawn')} 
                      className="p-1.5 md:p-3 bg-bg-dark border-2 border-ui-red text-ui-red hover:bg-ui-red hover:text-white transition-all shadow-[1px_1px_0px_0px_rgba(220,38,38,0.2)]"
                      title="Discard Active Card"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <div key="placeholder" className="h-full flex flex-col items-center justify-center opacity-40">
                <div className="w-[40px] h-[58px] md:w-[80px] md:h-[110px] border border-dashed border-ui-border rounded-sm flex items-center justify-center bg-ui-blue/5">
                   <div className="text-[10px] font-bold uppercase tracking-widest text-ui-yellow">READY</div>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="flex flex-col items-center gap-1 w-16 md:w-28"
         >
           <div 
             ref={discardPileRef}
             onClick={() => {
               if (state.game.drawn_card) {
                 handleMove(0, 'discard_drawn');
               } else if (canDraw) {
                 handleDraw('discard');
               }
             }}
             className={`w-full aspect-[3/4] relative cursor-pointer transition-all small md:normal ${isMyTurn && state?.game?.status !== 'initializing' ? 'ring-2 ring-ui-green ring-offset-2 ring-offset-bg-dark' : 'opacity-40'} ${draggingOver?.type === 'discard' ? 'scale-110 ring-2 ring-ui-green ring-offset-2 ring-offset-bg-dark shadow-[0_0_15px_rgba(56,217,115,0.6)]' : ''} ${latestMove?.player_id !== userId && latestMove?.move_type.includes('discard') ? 'ring-2 ring-ui-green ring-offset-1 ring-offset-bg-dark shadow-[0_0_10px_rgba(56,217,115,0.5)]' : ''}`}
           >
             {latestMove?.player_id !== userId && latestMove?.move_type.includes('discard') && (
               <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-ui-green text-bg-dark text-[7px] font-bold px-1 py-0.5 rounded-full whitespace-nowrap animate-bounce z-50">
                 {latestMove.player_id === "cpu" ? "CPU" : "OPPONENT"}
               </div>
             )}
             <AnimatePresence mode="popLayout">
              {state?.game?.discard && state.game.discard.length > 0 ? (
                <CardComponent
                  key={state.game.discard[state.game.discard.length-1].id || 'discard'}
                  card={state.game.discard[state.game.discard.length-1]}
                  index={999}
                  style={user.card_style || 'classic'} backStyle={user.card_back_style || 'classic'} backColor={user.card_back_color || 'ui-red'} backSecondaryColor={user.card_back_secondary_color || 'white'}
                  className="small md:normal"
                  forceFaceUp={true}
                />
              ) : (
                <div className="geometric-card small md:normal border-2 border-dashed border-black flex items-center justify-center opacity-40">
                  <X size={12} />
                </div>
              )}
             </AnimatePresence>
           </div>
           <span className="text-[7px] md:text-[10px] text-ui-green tracking-widest font-bold uppercase">Discard</span>
        </motion.div>
      </div>
    );

  return (
    <AnimatePresence mode="wait">
      {loading && !state && !error ? (
        <motion.div 
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-[80vh] flex flex-col items-center justify-center p-20 space-y-6 bg-bg-dark/50"
        >
          <div className="text-ui-yellow font-mono text-xs animate-pulse tracking-[0.2em] uppercase">Syncing Game State...</div>
          <div className="w-48 h-2 bg-ui-border p-[2px]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="h-full bg-ui-yellow shadow-[0_0_10px_rgba(255,205,117,0.5)]"
            />
          </div>
          <span className="text-[8px] text-ui-gray uppercase font-mono">Verifying Session ID: {gameId}</span>
        </motion.div>
      ) : error && !state ? (
        <motion.div 
          key="error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-[80vh] flex flex-col items-center justify-center p-8 bg-bg-dark border-4 border-ui-red shadow-[8px_8px_0px_0px_rgba(239,68,68,0.2)]"
        >
          <div className="text-ui-red font-mono text-xs mb-4 uppercase tracking-widest font-bold">Sync Failure</div>
          <div className="text-[12px] text-ui-gray mb-8 uppercase text-center leading-loose max-w-xs">{error}</div>
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <button 
              onClick={() => fetchState(false)}
              className="geometric-button text-[12px] w-full border-ui-yellow text-ui-yellow"
            >
              RETRY CONNECTION
            </button>
            <button 
              onClick={onExit}
              className="geometric-button text-[12px] w-full"
            >
              ABANDON MISSION
            </button>
          </div>
        </motion.div>
      ) : state && (
        <motion.div 
          key="game-content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <LayoutGroup>
            <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
              {/* Initialization Banner (Desktop Only) */}
              <AnimatePresence>
                {state.game.status === 'initializing' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-ui-yellow/10 border-4 border-ui-yellow p-3 md:p-4 text-center overflow-hidden w-full max-w-2xl mx-auto mt-2"
                  >
                    <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4">
                       <div className="flex items-center gap-2">
                         <Info className="text-ui-yellow" size={16} />
                         <span className="text-[10px] md:text-[12px] text-ui-yellow font-bold uppercase tracking-widest">
                           {myCards.filter(c => c.is_face_up).length < 2 
                             ? "Game Setup: Select 2 cards to reveal" 
                             : "Ready: Waiting for opponent..."}
                         </span>
                       </div>
                       {myCards.filter(c => c.is_face_up).length >= 2 && !state.game.is_vs_cpu && (
                         <button 
                           onClick={async () => {
                             if (nudgeCooldown) return;
                             setNudgeCooldown(true);
                             setTimeout(() => setNudgeCooldown(false), 5000);
                             try {
                               await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/games/${gameId}/messages`, {
                                 method: 'POST',
                                 headers: {
                                   'Content-Type': 'application/json',
                                   Authorization: `Bearer ${token}`
                                 },
                                 body: JSON.stringify({ content: '*NUDGES YOU* Please select your starting cards!' })
                               });
                             } catch (err) {
                               console.error(err);
                             }
                           }}
                           disabled={nudgeCooldown}
                           className="geometric-button px-4 py-1 text-[10px] disabled:opacity-50"
                         >
                           {nudgeCooldown ? 'Nudged!' : 'Nudge Opponent'}
                         </button>
                       )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
      
              {/* Simplified Game Header */}
              <div className="flex items-center px-4 py-2 pointer-events-none relative z-[100]">
                <button 
                  onClick={onExit} 
                  className="pointer-events-auto secondary-button p-2 bg-bg-dark border-2 border-ui-red text-ui-red hover:bg-ui-red hover:text-white transition-all group shadow-lg flex items-center justify-center shrink-0"
                  title="Exit Game"
                >
                  <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                </button>

                <div className="pointer-events-auto flex flex-1 ml-4 items-center justify-between gap-2 md:gap-4 bg-bg-dark/40 backdrop-blur-md px-3 py-2 md:px-5 md:py-2.5 border border-ui-border rounded-xl shadow-lg">
                  <div className="flex flex-col items-center group relative cursor-help">
                    <span className="text-[10px] md:text-[12px] text-ui-yellow uppercase leading-none mb-1 flex items-center gap-1 drop-shadow-sm">
                      <Layers size={10} className="md:w-3 md:h-3" />
                      Deck
                    </span>
                    <span className="text-[14px] md:text-[16px] text-white font-bold leading-none tracking-tighter drop-shadow-sm">
                      {state.game.deck_count} LEFT
                    </span>
                  </div>

                  <div className="w-[1px] h-6 bg-ui-border mx-1" />
                  
                  <div className="flex items-center gap-3 md:gap-5">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <div className="w-4 h-4 md:w-5 md:h-5 rounded-full overflow-hidden border border-ui-green/30 flex items-center justify-center">
                        <UserAvatar type={user.avatar} size={12} className="md:hidden" />
                        <UserAvatar type={user.avatar} size={16} className="hidden md:block" />
                      </div>
                      <span className="text-[14px] md:text-[16px] text-ui-green font-black">{userId === state.game.player1_id ? state.game.player1_total_score : state.game.player2_total_score}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <div className="w-4 h-4 md:w-5 md:h-5 rounded-full overflow-hidden border border-ui-red/30 flex items-center justify-center">
                        <UserAvatar type={opponentAvatar} size={12} className="md:hidden" />
                        <UserAvatar type={opponentAvatar} size={16} className="hidden md:block" />
                      </div>
                      <span className="text-[14px] md:text-[16px] text-ui-red font-black">{userId === state.game.player1_id ? state.game.player2_total_score : state.game.player1_total_score}</span>
                    </div>
                  </div>

                  <div className="hidden sm:block w-[1px] h-6 bg-ui-border mx-1" />

                  <div className="flex flex-col items-end">
                     <div className="flex items-center gap-1 md:gap-2">
                        <div className={`shrink-0 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${state.game.status === 'playing' ? 'bg-ui-green animate-pulse' : 'bg-ui-orange'}`} />
                        <span className="text-[12px] md:text-[14px] text-white/60 uppercase font-black tracking-widest max-w-[80px] md:max-w-[120px] text-right truncate">
                          {state.game.status === 'playing' ? (isMyTurn ? user.username : opponentName) : state.game.status}
                        </span>
                     </div>
                  </div>
                </div>
              </div>

              {/* Game Layout: 3-column on Desktop, Active tab on Mobile */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row gap-4 md:gap-6 items-start justify-center px-4">
                   {/* Center Column: Deck & Discard (Desktop Middle, Mobile Top) */}
                   <div className="w-full lg:w-48 xl:w-64 order-1 lg:order-2">
                     {DeckAndDiscard}
                   </div>

                   {/* Mobile Tab Switcher */}
                   <div className="lg:hidden flex border-2 border-ui-border p-1 bg-bg-dark/40 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] w-full order-2">
                     <button 
                       onClick={() => setMobileTab('me')}
                       className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-all truncate px-1 ${mobileTab === 'me' ? 'bg-ui-green text-black opacity-100' : 'opacity-60 hover:opacity-100'}`}
                     >
                       {user.username} ({calculateScore(userId)})
                     </button>
                     <button 
                       onClick={() => setMobileTab('opponent')}
                       className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-all truncate px-1 ${mobileTab === 'opponent' ? 'bg-ui-red text-white opacity-100' : 'opacity-60 hover:opacity-100'}`}
                     >
                       {opponentName} ({calculateScore(opponentId || 'cpu')})
                     </button>
                     <button 
                       onClick={() => setMobileTab('history')}
                       className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-all ${mobileTab === 'history' ? 'bg-ui-yellow text-black opacity-100' : 'opacity-60 hover:opacity-100'}`}
                     >
                       HISTORY
                     </button>
                   </div>

                   {/* Opponent Area (Left Column on Desktop) */}
                   <div className={`flex-1 w-full max-w-2xl order-3 lg:order-1 transition-all duration-500 ${mobileTab === 'opponent' ? 'block' : 'hidden lg:block'}`}>
                     <div className={`relative p-4 md:p-6 bg-ui-red/20 border-4 transition-all duration-500 ${!isMyTurn && state.game.status === 'playing' ? 'border-ui-red shadow-[0_0_15px_rgba(255,82,82,0.2)]' : 'border-dashed border-ui-purple/30'}`}>
                       <div className="absolute -top-3 left-6 bg-bg-dark text-[10px] tracking-widest uppercase flex items-center overflow-hidden h-6 border-2 border-ui-red">
                          <div className="px-3 flex items-center gap-2 border-l border-white/10 flex-row-reverse">
                            <div className="w-3 h-3 flex items-center justify-center opacity-60 text-ui-red">
                               <UserAvatar type={(state.game as any).player2_avatar} size={10} />
                            </div>
                            <span className="text-ui-red font-bold truncate max-w-[80px] md:max-w-[120px]">{opponentName}</span>
                            <span className="opacity-50">::</span>
                            <span>{calculateScore(opponentId || 'cpu')} Pts</span>
                         </div>
                         {!isMyTurn && state.game.status === 'playing' && turnIndicator('text-ui-orange')}
                       </div>
                       <motion.div 
                         variants={boardVariants}
                         initial="hidden"
                         animate="visible"
                         className="grid grid-cols-3 gap-3 w-full max-w-[320px] sm:max-w-[400px] md:max-w-[480px] mx-auto place-items-center opacity-80"
                       >
                         {opponentCards.map((card, idx) => (
                           <div key={card.id || idx} className="relative w-full">
                             {latestGridMove?.player_id === opponentId && latestGridMove?.card_affected_index === idx && (
                               <motion.div 
                                 initial={{ opacity: 0, y: -10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 className="absolute -top-6 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap pointer-events-none"
                               >
                                 <div className="bg-ui-yellow text-bg-dark text-[9px] font-black px-2 py-1 border border-bg-dark shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase tracking-widest flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-bg-dark/50 animate-pulse rounded-full inline-block" />
                                    Last Move
                                 </div>
                               </motion.div>
                             )}
                             <CardComponent 
                               card={card}
                               index={idx}
                               style={opponentCardStyle || 'classic'} backStyle={opponentCardBackStyle || 'classic'} backColor={opponentCardBackColor || 'ui-red'} backSecondaryColor={opponentCardBackSecondaryColor || 'white'}
                               className={`fluid ${latestGridMove?.player_id === opponentId && latestGridMove?.card_affected_index === idx ? 'ring-4 ring-ui-yellow shadow-[0_0_20px_rgba(255,205,117,0.5)]' : ''}`}
                             />
                           </div>
                         ))}
                       </motion.div>
                     </div>
                   </div>

                   <div className={`flex-1 w-full max-w-2xl order-4 lg:order-3 transition-all duration-500 ${mobileTab === 'me' ? 'block' : 'hidden lg:block'}`}>
                     <div className={`relative p-4 md:p-6 bg-ui-green/20 border-4 transition-all duration-500 ${isMyTurn && state.game.status === 'playing' ? 'border-ui-green shadow-[0_0_15px_rgba(56,217,115,0.2)]' : 'border-ui-border'}`}>
                       <div className="absolute -top-3 left-6 bg-bg-dark text-[10px] tracking-widest uppercase flex items-center overflow-hidden h-6 border-2 border-ui-green">
                         <div className="px-3 flex items-center gap-2 border-r border-white/10">
                            <div className="w-3 h-3 flex items-center justify-center opacity-60 text-ui-green">
                               <UserAvatar type={user.avatar} size={10} />
                            </div>
                            <span className="text-ui-green font-bold truncate max-w-[80px] md:max-w-[120px]">{myName}</span>
                            <span className="opacity-50">::</span>
                           <span>{calculateScore(userId)} Pts</span>
                         </div>
                         {isMyTurn && state.game.status === 'playing' && turnIndicator('text-ui-yellow')}
                       </div>
                       
                       <AnimatePresence>
                       </AnimatePresence>
   
                       <motion.div 
                         variants={boardVariants}
                         initial="hidden"
                         animate="visible"
                         className="grid grid-cols-3 gap-3 w-full max-w-[320px] sm:max-w-[400px] md:max-w-[480px] mx-auto place-items-center"
                       >
                         {myCards.map((card, idx) => (
                           <div 
                             key={card.id || idx}
                             ref={el => gridRefs.current[idx] = el}
                             className="relative group w-full"
                           >
                             {latestGridMove?.player_id === userId && latestGridMove?.card_affected_index === idx && (
                               <motion.div 
                                 initial={{ opacity: 0, y: -10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 className="absolute -top-6 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap pointer-events-none"
                               >
                                 <div className="bg-ui-yellow text-bg-dark text-[9px] font-black px-2 py-1 border border-bg-dark shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase tracking-widest flex items-center gap-1">
                                   <span className="w-1.5 h-1.5 bg-bg-dark/50 animate-pulse rounded-full inline-block" />
                                   Last Move
                                 </div>
                               </motion.div>
                             )}
                             <CardComponent
                               card={card}
                               index={idx}
                               style={user.card_style || 'classic'} backStyle={user.card_back_style || 'classic'} backColor={user.card_back_color || 'ui-red'} backSecondaryColor={user.card_back_secondary_color || 'white'}
                               onClick={() => {
                                 if (state.game.status === 'initializing') {
                                   handleReveal(idx);
                                 } else if (state.game.drawn_card) {
                                   handleMove(idx, 'replace');
                                 }
                               }}
                               className={`fluid cursor-pointer ${latestGridMove?.player_id === userId && latestGridMove?.card_affected_index === idx ? 'ring-4 ring-ui-yellow shadow-[0_0_20px_rgba(255,205,117,0.5)]' : ''} ${state.game.drawn_card ? 'ring-4 ring-ui-yellow ring-offset-4 ring-offset-bg-dark border-ui-yellow scale-105 z-10 shadow-[0_0_20px_rgba(255,205,117,0.4)]' : ''} ${draggingOver?.type === 'grid' && draggingOver.index === idx ? 'scale-110 -translate-y-4 ring-ui-yellow ring-4' : ''} hover:y-[-10px] hover:scale-110 hover:shadow-[0_0_20px_rgba(56,217,115,0.4),8px_8px_0px_0px_rgba(0,0,0,0.4)]`}
                             />
                             
                             {state.game.status === 'initializing' && !card.is_face_up && (
                               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                 <span className="text-[8px] text-ui-yellow font-bold opacity-0 group-hover:opacity-100 uppercase tracking-widest bg-bg-dark/80 px-2 py-1 border border-ui-yellow transition-opacity">Reveal</span>
                               </div>
                             )}
   
                             {state.game.drawn_card && !card.is_face_up && (
                               <motion.div 
                                 initial={{ opacity: 0 }}
                                 animate={{ opacity: 1 }}
                                 className="absolute inset-0 bg-ui-yellow/10 flex items-center justify-center z-20 pointer-events-none"
                               >
                                 <div className="text-[10px] text-center text-ui-yellow font-bold bg-bg-dark px-1 border border-ui-yellow">SWAP</div>
                               </motion.div>
                             )}

                             {state.game.drawn_card && !card.is_face_up && null}
                           </div>
                         ))}
                       </motion.div>
                     </div>
                   </div>
                </div>
              </div>

              {/* Bottom Section: History & Moves */}
              <div className={`w-full max-w-7xl mx-auto px-4 ${mobileTab === 'history' ? 'block' : 'hidden lg:block'}`}>
                <div className="geometric-border p-5 flex flex-col bg-bg-dark/20 min-h-[48px]">
                  <div className="flex items-center justify-between border-b border-ui-border pb-3 mb-4 w-full">
                    <button 
                      onClick={() => setHistoryCollapsed(!historyCollapsed)}
                      className="text-xs text-white uppercase tracking-widest flex items-center gap-2 hover:text-ui-yellow transition-colors"
                    >
                      <History size={12} /> Recent Moves {historyCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                    </button>
                    {!historyCollapsed && (
                      <div className="flex items-center gap-2">
                        {['ALL', 'ME', 'OPPONENT'].map(f => (
                          <button
                            key={f}
                            onClick={() => setMoveFilter(f as any)}
                            className={`text-[12px] uppercase tracking-widest px-2 py-1 rounded-sm border ${moveFilter === f ? 'bg-ui-yellow text-bg-dark border-transparent font-bold' : 'bg-transparent text-ui-gray border-ui-border hover:border-ui-yellow hover:text-white'}`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <motion.div 
                     animate={{ height: historyCollapsed ? 0 : 'auto', opacity: historyCollapsed ? 0 : 1 }}
                     className="overflow-hidden"
                  >
                    <div className="max-h-[300px] overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                      {(() => {
                        const filteredMoves = state.moves.filter(m => {
                          if (m.move_type === 'initial_card' || m.move_type === 'initial_discard' || m.move_type === 'round_start' || m.move_type === 'round_end') return false;
                          if (moveFilter === 'ME' && m.player_id !== userId) return false;
                          if (moveFilter === 'OPPONENT' && m.player_id === userId) return false;
                          return true;
                        });
                        
                        const grouped = filteredMoves.reduce((acc, move) => {
                          const round = move.round_number || state.game.round_number;
                          if (!acc[round]) acc[round] = [];
                          acc[round].push(move);
                          return acc;
                        }, {} as Record<number, Move[]>);

                        const sortedRounds = Object.entries(grouped).sort((a, b) => Number(b[0]) - Number(a[0]));
                        
                        if (sortedRounds.length === 0) {
                          return <div className="text-[12px] text-ui-gray uppercase text-center py-4">No moves found.</div>;
                        }

                        return sortedRounds.map(([round, movesInRound]) => (
                          <div key={round} className="space-y-4">
                            <h4 className="text-xs text-ui-yellow uppercase font-bold tracking-widest flex items-center before:content-[''] before:h-[1px] before:flex-1 before:bg-ui-border/50 before:mr-4 after:content-[''] after:h-[1px] after:flex-1 after:bg-ui-border/50 after:ml-4">
                              Round {round}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {(movesInRound as Move[]).map((move, i) => (
                                <div key={i} className="flex flex-col gap-2 border border-ui-border/30 bg-black/20 p-3 rounded-sm hover:border-ui-border/70 transition-colors h-full">
                                  <div className="flex justify-between items-center text-[12px] uppercase tracking-widest w-full">
                                    <span className={move.player_id === userId ? 'text-ui-green font-bold' : 'text-ui-red font-bold'}>
                                      {move.player_id === userId ? 'YOU' : move.player_id === 'cpu' ? 'CPU' : 'OPPONENT'}
                                    </span>
                                    <span className="text-ui-gray opacity-80 text-right">{formatMatchTime(move.timestamp, { timeZone: user.time_zone, timeFormat: user.time_format, showDate: !!user.show_move_date })}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-3 mt-1">
                                    <div className="w-8 h-11 border border-ui-border bg-ui-blue flex flex-col items-center justify-center text-xs shadow-sm shrink-0">
                                      <span className={move.card_suit === 'hearts' || move.card_suit === 'diamonds' ? 'text-ui-red' : ''}>
                                        {move.card_value}
                                      </span>
                                      <span className="text-xs">{move.card_suit === 'hearts' ? '♥' : move.card_suit === 'diamonds' ? '♦' : move.card_suit === 'clubs' ? '♣' : '♠'}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                      <span className="text-[12px] text-ui-yellow font-bold uppercase truncate">{move.move_type === 'replace' ? 'Swapped' : move.move_type === 'discard_drawn' ? 'Discarded' : move.move_type}</span>
                                      <span className="text-[11px] text-white/80 uppercase truncate">Pos: {move.card_affected_index}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>

      {/* Round End Overlay */}
      <AnimatePresence>
        {state.game.status === 'round_end' && (
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-0 z-[150] bg-bg-dark/90 backdrop-blur-md overflow-y-auto flex justify-center p-4 md:p-10 custom-scrollbar"
          >
            {calculateScore(userId) < calculateScore(opponentId || 'cpu') && <Confetti />}
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="geometric-border bg-ui-blue/20 p-6 md:p-10 max-w-2xl w-full space-y-8 md:space-y-10 relative overflow-hidden my-auto"
            >
               <motion.div 
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.2, 1]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute top-0 right-0 w-64 h-64 bg-ui-yellow/5 -rotate-12 translate-x-32 -translate-y-32"
               />
               
               <div className="text-center space-y-2 relative z-10">
                 <motion.h2 
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl sm:text-3xl text-ui-yellow tracking-tighter font-extrabold uppercase"
                 >
                   Round Complete
                 </motion.h2>
                 <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-[12px] text-ui-gray tracking-widest"
                 >
                   Calculating scores...
                 </motion.p>
               </div>

               <div className="grid md:grid-cols-2 gap-12 relative z-10">
                 {/* Player Summary */}
                 <motion.div 
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="h-full flex flex-col p-6 border-4 border-ui-green/30 bg-ui-green/5"
                 >
                    <h3 className="text-xs text-ui-green mb-6 border-b border-ui-green/50 pb-2">:: YOUR SCORE ::</h3>
                    <div className="grid grid-cols-3 gap-2 mb-6">
                       {myCards.map((c, i) => (
                         <div key={i} className="w-12 h-16 border-2 border-ui-green/50 flex flex-col items-center justify-center text-[12px] bg-bg-dark/50 mx-auto">
                            <span className={c.suit === 'hearts' || c.suit === 'diamonds' ? 'text-ui-red' : ''}>{c.value}</span>
                            <span className="text-lg">{c.suit === 'hearts' ? '♥' : c.suit === 'diamonds' ? '♦' : c.suit === 'clubs' ? '♣' : '♠'}</span>
                         </div>
                       ))}
                    </div>
                    <div className="flex justify-between items-end mt-auto">
                      <span className="text-[10px] text-ui-gray uppercase">Round Total</span>
                      <motion.span 
                        initial={{ scale: 1 }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="text-2xl text-ui-green font-bold"
                      >
                        {calculateScore(userId)} pts
                      </motion.span>
                    </div>
                 </motion.div>

                 {/* Opponent Summary */}
                 <motion.div 
                  initial={{ x: 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="h-full flex flex-col p-6 border-4 border-ui-red/30 bg-ui-red/5"
                 >
                    <h3 className="text-xs text-ui-red mb-6 border-b border-ui-red/50 pb-2">:: OPPONENT SCORE ::</h3>
                    <div className="grid grid-cols-3 gap-2 mb-6">
                       {opponentCards.map((c, i) => (
                         <div key={i} className="w-12 h-16 border-2 border-ui-red/50 flex flex-col items-center justify-center text-[12px] bg-bg-dark/50 mx-auto">
                             <span className={c.suit === 'hearts' || c.suit === 'diamonds' ? 'text-ui-red' : ''}>{c.value}</span>
                             <span className="text-lg">{c.suit === 'hearts' ? '♥' : c.suit === 'diamonds' ? '♦' : c.suit === 'clubs' ? '♣' : '♠'}</span>
                         </div>
                       ))}
                    </div>
                    <div className="flex justify-between items-end mt-auto">
                      <span className="text-[10px] text-ui-gray uppercase">Round Total</span>
                      <span className="text-2xl text-ui-red font-bold">{calculateScore(opponentId || 'cpu')} pts</span>
                    </div>
                 </motion.div>
               </div>

               <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="flex flex-col md:flex-row border-t-2 border-ui-border pt-8 mt-4 justify-between items-center gap-12"
               >
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex justify-between text-[12px] text-ui-gray">
                      <span>YOUR TOTAL SCORE</span>
                      <span className="text-ui-yellow font-bold uppercase">{state.game.player1_total_score} pts</span>
                    </div>
                    <div className="w-full h-2 bg-ui-border overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${Math.min(100, state.game.player1_total_score)}%` }}
                         transition={{ duration: 1.5, ease: 'easeOut', delay: 1 }}
                         className="h-full bg-ui-yellow shadow-[0_0_10px_#ffcd75]"
                       />
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/games/${gameId}/next-round`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                      });
                      if (res.ok) fetchState(true);
                    }}
                    className="geometric-button px-10 py-4 text-[12px] shrink-0"
                  >
                    Next Round
                  </button>
               </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Turn Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-6 right-6 md:bottom-12 md:right-12 z-[100] flex justify-center pointer-events-none"
          >
            <div className="bg-ui-green text-bg-dark p-3 md:p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4">
              <div className="w-8 h-8 border-2 border-bg-dark flex items-center justify-center font-bold text-lg animate-pulse">!</div>
              <div className="flex flex-col">
                <span className="text-xs font-bold tracking-tighter">{notification.title}</span>
                <span className="text-[10px] opacity-70">{notification.subtitle}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Win Modal */}
      <AnimatePresence>
        {state.game.status === 'finished' && (
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            className="fixed inset-0 z-[200] bg-bg-dark/95 backdrop-blur-xl overflow-y-auto flex justify-center p-4 md:p-10 custom-scrollbar"
          >
            {state.game.winner_player_id === userId && <Confetti />}
            <motion.div 
              initial={{ scale: 0.5, y: 100, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 100 }}
              className="geometric-border bg-bg-dark p-6 md:p-10 text-center space-y-8 md:space-y-10 max-w-xl w-full relative overflow-hidden my-auto"
            >
               {/* Animated Background Accents */}
               <motion.div 
                animate={{ rotate: 360, scale: [1, 1.5, 1], opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute -top-32 -left-32 w-96 h-96 bg-ui-yellow/10 rounded-full blur-3xl pointer-events-none"
               />
               <motion.div 
                animate={{ rotate: -360, scale: [1, 1.3, 1], opacity: [0.05, 0.15, 0.05] }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                className="absolute -bottom-32 -right-32 w-96 h-96 bg-ui-green/10 rounded-full blur-3xl pointer-events-none"
               />

              <div className="relative z-10 space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[12px] text-ui-yellow tracking-[0.5em] font-black uppercase"
                >
                  Final Classification
                </motion.div>
                <motion.h2 
                  animate={{ scale: [1, 1.02, 1] }} 
                  transition={{ repeat: Infinity, duration: 4 }}
                  className="text-4xl sm:text-6xl text-white tracking-tighter font-black uppercase italic drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                >
                  GAME <span className="text-ui-yellow underline decoration-4 underline-offset-8 decoration-ui-yellow/40">OVER</span>
                </motion.h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 py-6 relative z-10">
                {/* Player 1 Card */}
                <motion.div 
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className={`h-full relative p-8 border-4 flex flex-col gap-4 overflow-hidden transition-all duration-700 ${state.game.winner_player_id === state.game.player1_id ? 'border-ui-yellow bg-ui-yellow/10 shadow-[0_0_30px_rgba(255,205,117,0.2)]' : 'border-ui-border bg-black/40'}`}
                >
                  {state.game.winner_player_id === state.game.player1_id && (
                    <motion.div 
                      animate={{ opacity: [0.1, 0.3, 0.1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 bg-ui-yellow/5 card-pattern"
                    />
                  )}
                  <span className="text-[12px] text-ui-gray uppercase font-black tracking-widest relative z-10">
                    {state.game.player1_id === userId ? ':: YOU' : state.game.player1_name}
                  </span>
                  <div className="flex flex-col relative z-10">
                    <span className={`text-4xl sm:text-6xl font-black italic tracking-tighter ${state.game.winner_player_id === state.game.player1_id ? 'text-ui-yellow' : 'text-ui-border'}`}>
                      {state.game.player1_total_score}
                    </span>
                    <span className="text-[10px] text-ui-gray uppercase font-bold tracking-tighter">Total Points</span>
                  </div>
                  {state.game.winner_player_id === state.game.player1_id && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 1 }}
                      className="absolute top-2 right-2 bg-ui-yellow text-bg-dark text-[10px] font-black px-2 py-0.5 rotate-12 shadow-md z-20"
                    >
                      WINNER
                    </motion.div>
                  )}
                </motion.div>

                {/* Player 2 Card */}
                <motion.div 
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7, type: 'spring' }}
                  className={`h-full relative p-8 border-4 flex flex-col gap-4 overflow-hidden transition-all duration-700 ${state.game.winner_player_id === state.game.player2_id || (state.game.player2_id === 'cpu' && state.game.winner_player_id === 'cpu') ? 'border-ui-yellow bg-ui-yellow/10 shadow-[0_0_30px_rgba(255,205,117,0.2)]' : 'border-ui-border bg-black/40'}`}
                >
                   { (state.game.winner_player_id === state.game.player2_id || (state.game.player2_id === 'cpu' && state.game.winner_player_id === 'cpu')) && (
                    <motion.div 
                      animate={{ opacity: [0.1, 0.3, 0.1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 bg-ui-yellow/5 card-pattern"
                    />
                  )}
                  <span className="text-[12px] text-ui-gray uppercase font-black tracking-widest relative z-10">
                    {state.game.player2_id === userId ? ':: YOU' : state.game.player2_name}
                  </span>
                  <div className="flex flex-col relative z-10">
                    <span className={`text-4xl sm:text-6xl font-black italic tracking-tighter ${state.game.winner_player_id === state.game.player2_id || (state.game.player2_id === 'cpu' && state.game.winner_player_id === 'cpu') ? 'text-ui-yellow' : 'text-ui-border'}`}>
                      {state.game.player2_total_score}
                    </span>
                    <span className="text-[10px] text-ui-gray uppercase font-bold tracking-tighter">Total Points</span>
                  </div>
                  {(state.game.winner_player_id === state.game.player2_id || (state.game.player2_id === 'cpu' && state.game.winner_player_id === 'cpu')) && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 1 }}
                      className="absolute top-2 right-2 bg-ui-yellow text-bg-dark text-[10px] font-black px-2 py-0.5 rotate-12 shadow-md z-20"
                    >
                      WINNER
                    </motion.div>
                  )}
                </motion.div>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="relative z-10 py-8 px-6 bg-white/5 border-t-2 border-b-2 border-white/10"
              >
                <div className={`text-xl sm:text-4xl font-black tracking-tighter uppercase italic ${state.game.winner_player_id === userId ? 'text-ui-green' : 'text-ui-red'}`}>
                  {state.game.winner_player_id === userId ? (
                    <span className="flex items-center justify-center gap-4">
                      <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }}>★</motion.span>
                      Victory Achieved
                      <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }}>★</motion.span>
                    </span>
                  ) : (
                    'Defeat Conceded'
                  )}
                </div>
                <div className="text-[10px] text-ui-gray mt-2 tracking-[0.4em] font-bold uppercase opacity-50">
                  {state.game.winner_player_id === userId ? 'Performance: Exceptional' : 'Performance: Sub-Optimal'}
                </div>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10 pt-4">
                <motion.button 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  onClick={onExit}
                  className="geometric-button py-5 text-[12px] font-black uppercase tracking-widest bg-ui-yellow text-bg-dark border-none"
                >
                  Return to Lobby
                </motion.button>
                <motion.button 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1.7 }}
                  onClick={handleNewMatch}
                  className="geometric-button py-5 text-[12px] font-black uppercase tracking-widest border-white/20 hover:border-white opacity-50 hover:opacity-100 transition-all"
                >
                  {state.game.next_game_id ? 'Join Rematch' : 'New Match'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Chat gameId={gameId} userId={userId || ''} user={user} token={token} />
    </LayoutGroup>
    </motion.div>
    )}
    </AnimatePresence>
  );
}
