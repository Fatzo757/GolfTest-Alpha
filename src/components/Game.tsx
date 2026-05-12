import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Card, Move, User } from '../types.ts';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { RefreshCw, ArrowLeft, History, Info, ChevronRight, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Chat } from './Chat';
import { soundService } from '../services/soundService';
import UserAvatar from './UserAvatar.tsx';
import CardComponent from './Card.tsx';
import { formatMatchTime } from '../lib/timeUtils';

interface GameProps {
  gameId: string;
  token: string;
  user: User;
  onExit: () => void;
}

export default function Game({ gameId, token, user, onExit }: GameProps) {
  const userId = user.id;
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingStateRef = useRef(false);
  const [isOpponentOnline, setIsOpponentOnline] = useState(true);
  const [notification, setNotification] = useState<{title: string, subtitle?: string} | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [draggingOver, setDraggingOver] = useState<{ type: 'grid' | 'discard'; index?: number } | null>(null);
  const [lastCpuMove, setLastCpuMove] = useState<Move | null>(null);
  
  const [mobileTab, setMobileTab] = useState<'me' | 'opponent'>('me');
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const prevTurnRef = useRef<string | null>(null);
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
      if (!silent && !state) setLoading(true);
      loadingStateRef.current = true;

      const res = await fetch(`/api/games/${gameId}`, {
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
                tag: 'golf-turn',
                renotify: true
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
          setLastCpuMove(current => {
            if (!current || current.id !== latestCpuMove.id) {
              return latestCpuMove;
            }
            return current;
          });
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
      console.error('Fetch State Error:', err);
      if (!state) setError(err.message || 'Unknown sync error');
    } finally {
      setLoading(false);
      loadingStateRef.current = false;
    }
  }, [gameId, token, userId, user.mute_sounds, state]);

  useEffect(() => {
    if (lastCpuMove) {
      const timer = setTimeout(() => setLastCpuMove(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [lastCpuMove]);

  useEffect(() => {
    // Initial fetch
    fetchState();
    
    pollInterval.current = setInterval(() => fetchState(true), 1500);

    // Heartbeat & Online Status check
    const heartbeatId = setInterval(async () => {
      if (!token) return;
      try {
        // Update my own status
        const hbRes = await fetch('/api/heartbeat', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!hbRes.ok) return;

        // Check opponent status
        if (prevStateRef.current?.game.id) {
          const res = await fetch(`/api/games/${prevStateRef.current.game.id}/online`, {
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
      if (prevTurnRef.current !== state.game.current_turn_player_id) {
        if (state.game.current_turn_player_id === userId) {
          setMobileTab('me');
        } else if (state.game.status === 'playing') {
          setMobileTab('opponent');
        }
        prevTurnRef.current = state.game.current_turn_player_id;
      }
    }
  }, [state?.game?.current_turn_player_id, state?.game?.status, userId]);

  const handleDraw = async (source: 'deck' | 'discard') => {
    if (state?.game.current_turn_player_id !== userId) return;
    if (state.game.drawn_card) return; // Already drawn

    try {
      const res = await fetch(`/api/games/${gameId}/draw`, {
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
    try {
      const res = await fetch(`/api/games/${gameId}/reveal`, {
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
      const res = await fetch(`/api/games/${gameId}/move`, {
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
  
  const myName = (state?.game.player1_id === userId ? state?.game.player1_name : state?.game.player2_name) || 'Player';
  const opponentName = (state?.game.player1_id === userId ? state?.game.player2_name : state?.game.player1_name) || (state?.game.is_vs_cpu ? 'CPU' : 'Opponent');

  const myCards = state?.cards.filter(c => c.player_id === userId).sort((a,b) => (a.card_index || 0) - (b.card_index || 0)) || [];
  const opponentCards = state?.cards.filter(c => {
    if (state?.game?.is_vs_cpu) return c.player_id === 'cpu';
    return c.player_id === opponentId;
  }).sort((a,b) => (a.card_index || 0) - (b.card_index || 0)) || [];

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
      <span className="text-[7px] tracking-[0.2em] animate-pulse">ACTIVE_TURN</span>
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
      <div className="p-4 md:p-6 geometric-border bg-black/20 flex flex-row xl:flex-col items-center justify-center gap-2 md:gap-4 lg:gap-8">
         {/* Deck Slot */}
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="flex flex-col items-center gap-2 w-20 md:w-28"
         >
          <motion.div 
             onClick={() => canDraw && handleDraw('deck')}
             whileHover={canDraw ? { scale: 1.1, rotate: 5, boxShadow: '8px 8px 0px 0px rgba(255,123,82,0.4)' } : {}}
             whileTap={canDraw ? { scale: 0.9 } : {}}
             className={`geometric-card geometric-card-back cursor-pointer transition-all relative small md:normal ${canDraw ? 'border-ui-yellow' : 'opacity-40 grayscale'} ${lastCpuMove?.move_type.includes('deck') ? 'ring-4 ring-ui-orange ring-offset-2 ring-offset-bg-dark shadow-[0_0_15px_rgba(255,123,82,0.5)]' : ''}`}
           >
             {lastCpuMove?.move_type.includes('deck') && (
               <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-ui-orange text-white text-[6px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap animate-bounce z-50 shadow-lg">
                 CPU DREW
               </div>
             )}
             <div className="card-pattern flex items-center justify-center">
               <div className={`text-[8px] md:text-[10px] font-bold drop-shadow-lg text-center transition-colors ${state?.game?.deck_count && state.game.deck_count < 10 ? 'text-ui-red animate-pulse' : 'text-ui-orange'}`}>
                 DECK<br/>{state?.game?.deck_count}
               </div>
             </div>
           </motion.div>
           <span className="text-[6px] md:text-[8px] text-ui-orange tracking-widest font-bold uppercase">Deck</span>
        </motion.div>

        {/* Integrated Active Card Area - Fixed Width Slot */}
        <div className="w-24 md:w-32 flex flex-col items-center justify-center min-h-[100px] md:min-h-[140px]">
          <AnimatePresence mode="wait" initial={false}>
            {state?.game?.drawn_card ? (
              <motion.div 
                key="active-card"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center gap-2"
              >
                <span className="text-[6px] text-ui-yellow font-black uppercase tracking-[0.2em] animate-pulse">Active</span>
                <div className="flex items-center gap-2">
                  <CardComponent
                    key={state.game.drawn_card.id}
                    card={state.game.drawn_card}
                    index={-1}
                    style={user.card_style || 'classic'}
                    className="small md:normal border-ui-yellow ring-4 ring-ui-yellow/20"
                    forceFaceUp={true}
                  />
                  <button 
                    onClick={() => handleMove(0, 'discard_drawn')} 
                    className="p-2 md:p-3 bg-bg-dark border-2 border-ui-red text-ui-red hover:bg-ui-red hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(220,38,38,0.2)]"
                    title="Discard Active Card"
                  >
                    <X size={12} />
                  </button>
                </div>
              </motion.div>
            ) : (
              <div key="placeholder" className="h-full flex flex-col items-center justify-center opacity-10">
                <div className="w-[56px] h-[76px] md:w-[80px] md:h-[110px] border border-dashed border-ui-border rounded-sm flex items-center justify-center">
                   <div className="text-[8px] font-bold">READY</div>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="flex flex-col items-center gap-2 w-20 md:w-28"
         >
           <div 
             ref={discardPileRef}
             onClick={() => {
               if (state?.game?.drawn_card) {
                 handleMove(0, 'discard_drawn');
               } else if (canDraw) {
                 handleDraw('discard');
               }
             }}
             className={`relative cursor-pointer transition-all small md:normal ${isMyTurn && state?.game?.status !== 'initializing' ? 'border-ui-green' : 'opacity-40'} ${draggingOver?.type === 'discard' ? 'scale-110 ring-4 ring-ui-green ring-offset-4 ring-offset-bg-dark shadow-[0_0_30px_rgba(56,217,115,0.6)]' : ''} ${lastCpuMove?.move_type.includes('discard') ? 'ring-4 ring-ui-green ring-offset-2 ring-offset-bg-dark shadow-[0_0_15px_rgba(56,217,115,0.5)]' : ''}`}
           >
             {lastCpuMove?.move_type.includes('discard') && (
               <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-ui-green text-bg-dark text-[6px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap animate-bounce z-50 shadow-lg">
                 CPU RECLAIMED
               </div>
             )}
             <AnimatePresence mode="popLayout">
              {state?.game?.discard && state.game.discard.length > 0 ? (
                <CardComponent
                  key={state.game.discard[state.game.discard.length-1].id || 'discard'}
                  card={state.game.discard[state.game.discard.length-1]}
                  index={999}
                  style={user.card_style || 'classic'}
                  className="small md:normal"
                  forceFaceUp={true}
                />
              ) : (
                <div className="geometric-card small md:normal border-2 border-dashed border-ui-border flex items-center justify-center opacity-20">
                  <X size={16} />
                </div>
              )}
             </AnimatePresence>
           </div>
           <span className="text-[6px] md:text-[8px] text-ui-green tracking-widest font-bold uppercase">Discard</span>
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
          <span className="text-[6px] text-ui-gray uppercase font-mono">Verifying Session ID: {gameId}</span>
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
          <div className="text-[10px] text-ui-gray mb-8 uppercase text-center leading-loose max-w-xs">{error}</div>
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <button 
              onClick={() => fetchState(false)}
              className="geometric-button text-[10px] w-full border-ui-yellow text-ui-yellow"
            >
              RETRY CONNECTION
            </button>
            <button 
              onClick={onExit}
              className="geometric-button text-[10px] w-full"
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
            <div className="flex flex-col gap-8 select-none touch-none animate-in fade-in zoom-in duration-500 perspective-1000">
            {/* Initialization Banner (Desktop Only) */}
            <AnimatePresence>
              {state.game.status === 'initializing' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="hidden md:block bg-ui-yellow/10 border-4 border-ui-yellow p-4 text-center overflow-hidden"
                >
                  <div className="flex items-center justify-center gap-4">
                     <Info className="text-ui-yellow" size={16} />
                     <span className="text-[10px] text-ui-yellow font-bold uppercase tracking-widest">
                       Game Setup: Select 2 cards to reveal and start the game
                     </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
    
            {/* Simplified Game Header */}
            <div className="flex items-center justify-between px-4 py-2 pointer-events-none relative z-[100]">
              <button 
                onClick={onExit} 
                className="pointer-events-auto p-2 bg-bg-dark/60 border border-ui-border hover:border-ui-orange text-ui-gray hover:text-ui-orange transition-all group shadow-lg"
                title="Exit Game"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center gap-4 bg-bg-dark/40 backdrop-blur-md px-3 py-1.5 border border-ui-border rounded-full shadow-lg">
                <div className="flex flex-col items-center">
                  <span className="text-[5px] text-ui-gray uppercase leading-none mb-0.5">Room</span>
                  <span className="text-[10px] text-ui-yellow font-bold leading-none tracking-tighter">#{state.game.room_code}</span>
                </div>
                
                <div className="w-[1px] h-4 bg-ui-border mx-1" />
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full overflow-hidden border border-ui-green/30">
                      <UserAvatar type={user.avatar} size={8} />
                    </div>
                    <span className="text-[9px] text-ui-green font-black">{userId === state.game.player1_id ? state.game.player1_total_score : state.game.player2_total_score}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full overflow-hidden border border-ui-red/30">
                      <UserAvatar type={(state.game as any).player2_avatar} size={8} />
                    </div>
                    <span className="text-[9px] text-ui-red font-black">{userId === state.game.player1_id ? state.game.player2_total_score : state.game.player1_total_score}</span>
                  </div>
                </div>

                <div className="w-[1px] h-4 bg-ui-border mx-1" />

                <div className="flex flex-col items-end">
                   <div className="flex items-center gap-1">
                      <div className={`w-1 h-1 rounded-full ${state.game.status === 'playing' ? 'bg-ui-green animate-pulse' : 'bg-ui-orange'}`} />
                      <span className="text-[7px] text-white/40 uppercase font-black tracking-widest">{state.game.status === 'playing' ? (isMyTurn ? 'Your Turn' : 'Opponent') : state.game.status}</span>
                   </div>
                </div>
              </div>
            </div>
    
            <div className="flex flex-col xl:flex-row gap-4 md:gap-8">
              {/* Mobile Deck/Discard & Logic */}
              <div className="xl:hidden space-y-4">
                 {DeckAndDiscard}
                 
                 <div className="flex border-2 border-ui-border p-1 bg-bg-dark/40 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
                   <button 
                     onClick={() => setMobileTab('me')}
                     className={`flex-1 py-3 text-[8px] font-bold uppercase tracking-widest transition-all ${mobileTab === 'me' ? 'bg-ui-green text-bg-dark' : 'text-ui-gray hover:text-white'}`}
                   >
                     {myName} ({calculateScore(userId)})
                   </button>
                   <button 
                     onClick={() => setMobileTab('opponent')}
                     className={`flex-1 py-3 text-[8px] font-bold uppercase tracking-widest transition-all ${mobileTab === 'opponent' ? 'bg-ui-red text-white' : 'text-ui-gray hover:text-white'}`}
                   >
                     {opponentName} ({calculateScore(opponentId || 'cpu')})
                   </button>
                 </div>

                 {/* Mobile Drawn Card Slot REMOVED - now integrated in DeckAndDiscard */}
              </div>

              {/* Left Column: Player Boards */}
              <div className="flex-1 space-y-8 md:space-y-12">
          {/* Opponent Area */}
          <div className={`relative p-4 md:p-6 bg-ui-red/5 border-4 transition-all duration-500 ${mobileTab === 'opponent' ? 'block' : 'hidden xl:block'} ${!isMyTurn && state.game.status === 'playing' ? 'border-ui-red shadow-[0_0_15px_rgba(255,82,82,0.2)]' : 'border-dashed border-ui-purple/30'}`}>
            <div className="absolute -top-3 left-6 bg-bg-dark text-[8px] tracking-widest uppercase flex items-center overflow-hidden h-6 border-2 border-ui-red">
               <div className="px-3 flex items-center gap-2 border-r border-white/10">
                <div className={`w-1.5 h-1.5 rounded-full ${isOpponentOnline ? 'bg-ui-green' : 'bg-ui-red'} animate-pulse`} />
                <div className="w-3 h-3 flex items-center justify-center opacity-60 text-ui-red">
                   <UserAvatar type={(state.game as any).player2_avatar} size={10} />
                </div>
                <span className="text-ui-red">{opponentName}</span>
                <span className="opacity-50">::</span>
                <span>{calculateScore(opponentId || 'cpu')} Round Points</span>
              </div>
              {!isMyTurn && state.game.status === 'playing' && turnIndicator('text-ui-orange')}
            </div>
            <motion.div 
              variants={boardVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-3 gap-4 w-fit mx-auto opacity-80 scale-90 md:scale-100"
            >
              {opponentCards.map((card, idx) => (
                <div key={card.id || idx} className="relative">
                  {lastCpuMove?.card_affected_index === idx && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-8 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap"
                    >
                      <div className="bg-ui-yellow text-bg-dark text-[7px] font-black px-2 py-1 border border-bg-dark shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase">
                        CPU Replaced #{idx}
                      </div>
                    </motion.div>
                  )}
                  <CardComponent 
                    card={card}
                    index={idx}
                    style={user.card_style || 'classic'}
                    className={`small ${lastCpuMove?.card_affected_index === idx ? 'ring-4 ring-ui-yellow animate-pulse shadow-[0_0_20px_rgba(255,205,117,0.5)]' : ''}`}
                  />
                </div>
              ))}
            </motion.div>
          </div>

          {/* Player Area */}
          <div className={`relative p-4 md:p-6 bg-ui-green/5 border-4 transition-all duration-500 ${mobileTab === 'me' ? 'block' : 'hidden xl:block'} ${isMyTurn && state.game.status === 'playing' ? 'border-ui-green shadow-[0_0_15px_rgba(56,217,115,0.2)]' : 'border-ui-border'}`}>
            <div className="absolute -top-3 left-6 bg-bg-dark text-[8px] tracking-widest uppercase flex items-center overflow-hidden h-6 border-2 border-ui-green">
              <div className="px-3 flex items-center gap-2 border-r border-white/10">
                <div className="w-3 h-3 flex items-center justify-center opacity-60 text-ui-green">
                   <UserAvatar type={user.avatar} size={10} />
                </div>
                <span className="text-ui-green">{myName}</span>
                <span className="opacity-50">::</span>
                <span>{calculateScore(userId)} Round Points</span>
              </div>
              {isMyTurn && state.game.status === 'playing' && turnIndicator('text-ui-yellow')}
            </div>
            
            <AnimatePresence>
              {state.game.drawn_card && (
                <div className="absolute -left-20 top-1/2 -translate-y-1/2 z-30 hidden xl:flex flex-col items-center gap-4">
                  <span className="text-[7px] text-ui-yellow bg-bg-dark px-2 py-1 border border-ui-yellow animate-pulse mb-2 whitespace-nowrap uppercase tracking-[0.2em]">Active Drawn Card</span>
                  
                  <motion.div 
                    layoutId={state.game.drawn_card.id}
                    drag
                    dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                    dragSnapToOrigin
                    onDragStart={() => {
                      soundService.playDraw();
                    }}
                    onDrag={(e, info) => {
                      // Using viewport-relative coordinates from info.point
                      const x = info.point.x;
                      const y = info.point.y;
                      
                      // Check discard
                      const discardRect = discardPileRef.current?.getBoundingClientRect();
                      if (discardRect && x >= discardRect.left && x <= discardRect.right && y >= discardRect.top && y <= discardRect.bottom) {
                        setDraggingOver({ type: 'discard' });
                        return;
                      }

                      // Check grid
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

                      // Check discard
                      const discardRect = discardPileRef.current?.getBoundingClientRect();
                      if (discardRect && x >= discardRect.left && x <= discardRect.right && y >= discardRect.top && y <= discardRect.bottom) {
                        handleMove(0, 'discard_drawn');
                        return;
                      }

                      // Check grid
                      for (let i = 0; i < gridRefs.current.length; i++) {
                        const rect = gridRefs.current[i]?.getBoundingClientRect();
                        if (rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                          handleMove(i, 'replace');
                          return;
                        }
                      }
                    }}
                    whileHover={{ 
                      scale: 1.05,
                      boxShadow: '0 0 25px rgba(255, 205, 117, 0.6)',
                      transition: { type: 'spring', damping: 10 }
                    }}
                    whileDrag={{ 
                      scale: 1.15, 
                      zIndex: 100,
                      boxShadow: '0 0 40px rgba(255, 205, 117, 0.8)'
                    }}
                    className="cursor-grab active:cursor-grabbing w-24 h-32"
                  >
                    <CardComponent
                      card={state.game.drawn_card}
                      index={-1}
                      style={user.card_style || 'classic'}
                      className="large border-ui-yellow ring-4 ring-ui-yellow/20 shadow-[0_0_20px_rgba(255,205,117,0.3)]"
                      forceFaceUp={true}
                    />
                  </motion.div>

                  <button 
                    onClick={() => handleMove(0, 'discard_drawn')} 
                    className="geometric-button text-[8px] py-2 px-4 border-b-2 border-r-2 whitespace-nowrap bg-bg-dark text-ui-red border-ui-red hover:bg-ui-red hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(220,38,38,0.2)]"
                  >
                    Discard Drawing
                  </button>
                </div>
              )}
            </AnimatePresence>

            <motion.div 
              variants={boardVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-3 gap-4 w-fit mx-auto"
            >
              {myCards.map((card, idx) => (
                <div 
                  key={card.id || idx}
                  ref={el => gridRefs.current[idx] = el}
                  className="relative group"
                >
                  <CardComponent
                    card={card}
                    index={idx}
                    style={user.card_style || 'classic'}
                    onClick={() => {
                      if (state.game.status === 'initializing') {
                        handleReveal(idx);
                      } else if (state.game.drawn_card) {
                        handleMove(idx, 'replace');
                      }
                    }}
                    className={`small md:large cursor-pointer ${state.game.drawn_card ? 'ring-4 ring-ui-yellow ring-offset-4 ring-offset-bg-dark border-ui-yellow scale-105 z-10 shadow-[0_0_20px_rgba(255,205,117,0.4)]' : ''} ${draggingOver?.type === 'grid' && draggingOver.index === idx ? 'scale-110 -translate-y-4 ring-ui-yellow ring-4' : ''} hover:y-[-10px] hover:scale-110 hover:shadow-[0_0_20px_rgba(56,217,115,0.4),8px_8px_0px_0px_rgba(0,0,0,0.4)]`}
                  />
                  
                  {state.game.status === 'initializing' && !card.is_face_up && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[6px] text-ui-yellow font-bold opacity-0 group-hover:opacity-100 uppercase tracking-widest bg-bg-dark/80 px-2 py-1 border border-ui-yellow transition-opacity">Reveal</span>
                    </div>
                  )}

                  {state.game.drawn_card && !card.is_face_up && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-ui-yellow/10 flex items-center justify-center z-20 pointer-events-none"
                    >
                      <div className="text-[8px] text-center text-ui-yellow font-bold bg-bg-dark px-1 border border-ui-yellow">SWAP</div>
                    </motion.div>
                  )}
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Right Column: Deck & Actions (Desktop only for Deck/Discard) */}
        <div className="w-full xl:w-72 space-y-6">
          <div className="hidden xl:block">
            {DeckAndDiscard}
          </div>

          {/* History / Moves List */}
          <div className="geometric-border p-5 flex flex-col bg-bg-dark/20 min-h-[48px]">
            <button 
              onClick={() => setHistoryCollapsed(!historyCollapsed)}
              className="text-[8px] text-ui-gray uppercase tracking-widest border-b border-ui-border pb-3 mb-4 flex items-center justify-between w-full hover:text-ui-yellow transition-colors"
            >
              <div className="flex items-center gap-2 pointer-events-none">
                <History size={12} /> Move History
              </div>
              {historyCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </button>
            <motion.div 
               animate={{ height: historyCollapsed ? 0 : 'auto', opacity: historyCollapsed ? 0 : 1 }}
               className="overflow-hidden"
            >
              <div className="h-96 overflow-y-auto space-y-5 pr-2 custom-scrollbar">
                {state.moves
                  .filter(m => m.move_type !== 'initial_card' && m.move_type !== 'initial_discard' && m.move_type !== 'round_start')
                  .map((move, i) => (
                  <div key={i} className="flex flex-col gap-3 border-l border-ui-border pl-3 pb-3">
                    <div className="flex justify-between items-center text-[7px] uppercase tracking-widest">
                      <span className={move.player_id === userId ? 'text-ui-green font-bold' : 'text-ui-red font-bold'}>
                        {move.player_id === userId ? ':: YOU' : move.player_id === 'cpu' ? ':: CPU' : ':: OPNT'}
                      </span>
                      <span className="text-ui-gray">{formatMatchTime(move.timestamp, { timeZone: user.time_zone, timeFormat: user.time_format, showDate: !!user.show_move_date })}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {move.replaced_card_value && (
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-12 border border-ui-border bg-bg-dark/50 flex flex-col items-center justify-center text-[9px] opacity-40">
                             <span className={move.replaced_card_suit === 'hearts' || move.replaced_card_suit === 'diamonds' ? 'text-ui-red' : ''}>
                              {move.replaced_card_value}
                             </span>
                             <span className="text-xs">{move.replaced_card_suit === 'hearts' ? '♥' : move.replaced_card_suit === 'diamonds' ? '♦' : move.replaced_card_suit === 'clubs' ? '♣' : '♠'}</span>
                          </div>
                          <ArrowLeft size={10} className="rotate-180 opacity-30" />
                        </div>
                      )}
                      <div className="w-12 h-16 border-2 border-ui-border bg-ui-blue flex flex-col items-center justify-center text-[12px] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]">
                         <span className={move.card_suit === 'hearts' || move.card_suit === 'diamonds' ? 'text-ui-red' : ''}>
                          {move.card_value}
                         </span>
                         <span className="text-base">{move.card_suit === 'hearts' ? '♥' : move.card_suit === 'diamonds' ? '♦' : move.card_suit === 'clubs' ? '♣' : '♠'}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[7px] text-ui-yellow font-bold uppercase tracking-tighter">
                          {move.move_type === 'replace' ? 'Swapped Card' : move.move_type === 'discard_drawn' ? 'Discarded' : move.move_type}
                        </span>
                        <span className="text-[6px] text-ui-gray italic uppercase">Index: #{move.card_affected_index}</span>
                      </div>
                    </div>
                  </div>
                ))}
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
                  className="text-[10px] text-ui-gray tracking-widest"
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
                  className="p-6 border-4 border-ui-green/30 bg-ui-green/5"
                 >
                    <h3 className="text-xs text-ui-green mb-6 border-b border-ui-green/50 pb-2">:: YOUR SCORE ::</h3>
                    <div className="grid grid-cols-3 gap-2 mb-6">
                       {myCards.map((c, i) => (
                         <div key={i} className="w-12 h-16 border-2 border-ui-green/50 flex flex-col items-center justify-center text-[10px] bg-bg-dark/50">
                            <span className={c.suit === 'hearts' || c.suit === 'diamonds' ? 'text-ui-red' : ''}>{c.value}</span>
                            <span className="text-lg">{c.suit === 'hearts' ? '♥' : c.suit === 'diamonds' ? '♦' : c.suit === 'clubs' ? '♣' : '♠'}</span>
                         </div>
                       ))}
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-[8px] text-ui-gray uppercase">Round Total</span>
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
                  className="p-6 border-4 border-ui-red/30 bg-ui-red/5"
                 >
                    <h3 className="text-xs text-ui-red mb-6 border-b border-ui-red/50 pb-2">:: OPPONENT SCORE ::</h3>
                    <div className="grid grid-cols-3 gap-2 mb-6">
                       {opponentCards.map((c, i) => (
                         <div key={i} className="w-12 h-16 border-2 border-ui-red/50 flex flex-col items-center justify-center text-[10px] bg-bg-dark/50">
                             <span className={c.suit === 'hearts' || c.suit === 'diamonds' ? 'text-ui-red' : ''}>{c.value}</span>
                             <span className="text-lg">{c.suit === 'hearts' ? '♥' : c.suit === 'diamonds' ? '♦' : c.suit === 'clubs' ? '♣' : '♠'}</span>
                         </div>
                       ))}
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-[8px] text-ui-gray uppercase">Round Total</span>
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
                    <div className="flex justify-between text-[10px] text-ui-gray">
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
                      const res = await fetch(`/api/games/${gameId}/next-round`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                      });
                      if (res.ok) fetchState(true);
                    }}
                    className="geometric-button px-10 py-4 text-[10px] shrink-0"
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
                <span className="text-[8px] opacity-70">{notification.subtitle}</span>
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
                  className="text-[10px] text-ui-yellow tracking-[0.5em] font-black uppercase"
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
                  className={`relative p-8 border-4 flex flex-col gap-4 overflow-hidden transition-all duration-700 ${state.game.winner_player_id === state.game.player1_id ? 'border-ui-yellow bg-ui-yellow/10 shadow-[0_0_30px_rgba(255,205,117,0.2)]' : 'border-ui-border bg-black/40'}`}
                >
                  {state.game.winner_player_id === state.game.player1_id && (
                    <motion.div 
                      animate={{ opacity: [0.1, 0.3, 0.1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 bg-ui-yellow/5 card-pattern"
                    />
                  )}
                  <span className="text-[10px] text-ui-gray uppercase font-black tracking-widest relative z-10">
                    {state.game.player1_id === userId ? ':: YOU' : state.game.player1_name}
                  </span>
                  <div className="flex flex-col relative z-10">
                    <span className={`text-4xl sm:text-6xl font-black italic tracking-tighter ${state.game.winner_player_id === state.game.player1_id ? 'text-ui-yellow' : 'text-ui-border'}`}>
                      {state.game.player1_total_score}
                    </span>
                    <span className="text-[8px] text-ui-gray uppercase font-bold tracking-tighter">Total Points</span>
                  </div>
                  {state.game.winner_player_id === state.game.player1_id && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 1 }}
                      className="absolute top-2 right-2 bg-ui-yellow text-bg-dark text-[8px] font-black px-2 py-0.5 rotate-12 shadow-md z-20"
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
                  className={`relative p-8 border-4 flex flex-col gap-4 overflow-hidden transition-all duration-700 ${state.game.winner_player_id === state.game.player2_id || (state.game.player2_id === 'cpu' && state.game.winner_player_id === 'cpu') ? 'border-ui-yellow bg-ui-yellow/10 shadow-[0_0_30px_rgba(255,205,117,0.2)]' : 'border-ui-border bg-black/40'}`}
                >
                   { (state.game.winner_player_id === state.game.player2_id || (state.game.player2_id === 'cpu' && state.game.winner_player_id === 'cpu')) && (
                    <motion.div 
                      animate={{ opacity: [0.1, 0.3, 0.1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 bg-ui-yellow/5 card-pattern"
                    />
                  )}
                  <span className="text-[10px] text-ui-gray uppercase font-black tracking-widest relative z-10">
                    {state.game.player2_id === userId ? ':: YOU' : state.game.player2_name}
                  </span>
                  <div className="flex flex-col relative z-10">
                    <span className={`text-4xl sm:text-6xl font-black italic tracking-tighter ${state.game.winner_player_id === state.game.player2_id || (state.game.player2_id === 'cpu' && state.game.winner_player_id === 'cpu') ? 'text-ui-yellow' : 'text-ui-border'}`}>
                      {state.game.player2_total_score}
                    </span>
                    <span className="text-[8px] text-ui-gray uppercase font-bold tracking-tighter">Total Points</span>
                  </div>
                  {(state.game.winner_player_id === state.game.player2_id || (state.game.player2_id === 'cpu' && state.game.winner_player_id === 'cpu')) && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 1 }}
                      className="absolute top-2 right-2 bg-ui-yellow text-bg-dark text-[8px] font-black px-2 py-0.5 rotate-12 shadow-md z-20"
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
                <div className="text-[8px] text-ui-gray mt-2 tracking-[0.4em] font-bold uppercase opacity-50">
                  {state.game.winner_player_id === userId ? 'Performance: Exceptional' : 'Performance: Sub-Optimal'}
                </div>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10 pt-4">
                <motion.button 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  onClick={onExit}
                  className="geometric-button py-5 text-[10px] font-black uppercase tracking-widest bg-ui-yellow text-bg-dark border-none"
                >
                  Return to Lobby
                </motion.button>
                <motion.button 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1.7 }}
                  onClick={onExit} // In this app, onExit typically takes you back where you can start a new game
                  className="geometric-button py-5 text-[10px] font-black uppercase tracking-widest border-white/20 hover:border-white opacity-50 hover:opacity-100 transition-all"
                >
                  New Match
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Chat gameId={gameId} userId={userId || ''} user={user} token={token} />
    </div>
    </LayoutGroup>
    </motion.div>
    )}
    </AnimatePresence>
  );
}
