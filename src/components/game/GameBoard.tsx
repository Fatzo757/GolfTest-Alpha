import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Star, History } from 'lucide-react';
import { GameState, Card, Move, User } from '../../types';
import CardComponent from '../Card';
import UserAvatar from '../UserAvatar';

interface GameBoardProps {
  state: GameState;
  user: User;
  userId: string;
  isMyTurn: boolean;
  canDraw: boolean;
  myName: string;
  opponentName: string;
  opponentAvatar?: string;
  opponentId?: string | null;
  myCards: Card[];
  opponentCards: Card[];
  latestGridMove: Move | null;
  draggingOver: { type: 'grid' | 'discard'; index?: number } | null;
  mobileTab: 'me' | 'opponent' | 'history';
  gridRefs: React.RefObject<(HTMLDivElement | null)[]>;
  calculateScore: (playerId: string) => number;
  handleDraw: (source: 'deck' | 'discard') => void;
  handleReveal: (cardIndex: number) => void;
  handleMove: (cardIndex: number, moveType: 'replace' | 'discard_drawn') => void;
}

const boardVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export default function GameBoard({
  state,
  user,
  userId,
  isMyTurn,
  canDraw,
  myName,
  opponentName,
  opponentAvatar,
  opponentId,
  myCards,
  opponentCards,
  latestGridMove,
  draggingOver,
  mobileTab,
  gridRefs,
  calculateScore,
  handleDraw,
  handleReveal,
  handleMove,
}: GameBoardProps) {
  // Keyboard Shortcuts Listener (1-6 to reveal/replace, 'd' deck, 's' discard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  const turnIndicator = (color: string) => (
    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} className={`px-2 md:px-3 py-1 flex items-center h-full gap-1.5 ${color} shrink-0`}>
      <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 0.6 }}>
        <ChevronRight size={12} strokeWidth={3} />
      </motion.div>
      <span className="text-[0.6rem] sm:text-xs tracking-[0.2em] animate-pulse whitespace-nowrap">ACTIVE_TURN</span>
    </motion.div>
  );

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Opponent's Grid */}
        <div className={`flex-1 w-full max-w-2xl transition-all duration-500 ${mobileTab === 'opponent' ? 'block' : 'hidden lg:block'}`}>
          <div
            className={`relative px-4 pb-4 pt-10 md:px-6 md:pb-6 md:pt-16 bg-ui-red/20 border-4 transition-all duration-500 ${
              !isMyTurn && state.game.status === 'playing' ? 'border-ui-red shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-ui-border'
            }`}
          >
            <div className="absolute top-0 -translate-y-1/2 left-4 md:left-6 max-w-[calc(100%-2rem)] md:max-w-[calc(100%-3rem)] bg-bg-dark tracking-widest uppercase flex items-stretch overflow-hidden border-2 border-ui-red z-10">
              <div className="px-2 md:px-3 py-1 md:py-1.5 flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-1.5 text-ui-red">
                  <UserAvatar type={opponentAvatar} size={14} className="hidden md:block shrink-0" />
                  <UserAvatar type={opponentAvatar} size={10} className="md:hidden shrink-0" />
                  <span className="text-[0.65rem] sm:text-xs md:text-sm lg:text-base font-bold truncate block max-w-[90px] sm:max-w-[130px] md:max-w-[180px] lg:max-w-[220px]">
                    {opponentName}
                  </span>
                </div>
                <div className="text-[0.55rem] sm:text-[0.65rem] md:text-xs text-white/70 font-black mt-0.5">
                  {opponentId ? calculateScore(opponentId) : calculateScore('cpu')} PTS
                </div>
              </div>
              {!isMyTurn && state.game.status === 'playing' && (
                <div className="shrink-0 flex items-center border-l border-white/10 bg-ui-red/10">{turnIndicator('text-ui-red')}</div>
              )}
            </div>

            <motion.div
              variants={boardVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-3 gap-3 w-full max-w-[320px] sm:max-w-[400px] md:max-w-[480px] mx-auto place-items-center opacity-85"
              style={{ transform: 'scale(var(--card-scale, 1))', transformOrigin: 'center center' }}
            >
              {opponentCards.map((card, idx) => (
                <div key={card.id || idx} className="relative w-full">
                  {latestGridMove?.player_id === opponentId && latestGridMove?.card_affected_index === idx && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0, rotate: -45 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      className="absolute -top-3 -right-3 text-ui-yellow drop-shadow-[0_0_5px_rgba(255,205,117,0.8)] z-30"
                    >
                      <Star size={24} fill="currentColor" />
                    </motion.div>
                  )}
                  <CardComponent
                    card={card}
                    index={idx}
                    style={user.card_style || 'classic'}
                    backStyle={user.card_back_style || 'classic'}
                    backColor={user.card_back_color || 'ui-red'}
                    backSecondaryColor={user.card_back_secondary_color || 'white'}
                    showPoints={user.show_card_points !== 0}
                    className={`fluid ${
                      latestGridMove?.player_id === opponentId && latestGridMove?.card_affected_index === idx
                        ? 'ring-4 ring-ui-yellow shadow-[0_0_20px_rgba(255,205,117,0.5)]'
                        : ''
                    }`}
                  />
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Player's Grid */}
        <div className={`flex-1 w-full max-w-2xl transition-all duration-500 ${mobileTab === 'me' ? 'block' : 'hidden lg:block'}`}>
          <div
            className={`relative px-4 pb-4 pt-10 md:px-6 md:pb-6 md:pt-16 bg-ui-green/20 border-4 transition-all duration-500 ${
              isMyTurn && state.game.status === 'playing' ? 'border-ui-green shadow-[0_0_15px_rgba(56,217,115,0.2)]' : 'border-ui-border'
            }`}
          >
            <div className="absolute top-0 -translate-y-1/2 left-4 md:left-6 max-w-[calc(100%-2rem)] md:max-w-[calc(100%-3rem)] bg-bg-dark tracking-widest uppercase flex items-stretch overflow-hidden border-2 border-ui-green z-10">
              <div className="px-2 md:px-3 py-1 md:py-1.5 flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-1.5 text-ui-green">
                  <UserAvatar type={user.avatar} size={14} className="hidden md:block shrink-0" />
                  <UserAvatar type={user.avatar} size={10} className="md:hidden shrink-0" />
                  <span className="text-[0.65rem] sm:text-xs md:text-sm lg:text-base font-bold truncate block max-w-[90px] sm:max-w-[130px] md:max-w-[180px] lg:max-w-[220px]">
                    {myName}
                  </span>
                </div>
                <div className="text-[0.55rem] sm:text-[0.65rem] md:text-xs text-white/70 font-black mt-0.5">
                  {calculateScore(userId)} PTS
                </div>
              </div>
              {isMyTurn && state.game.status === 'playing' && (
                <div className="shrink-0 flex items-center border-l border-white/10 bg-ui-green/10">{turnIndicator('text-ui-yellow')}</div>
              )}
            </div>

            <motion.div
              variants={boardVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-3 gap-3 w-full max-w-[320px] sm:max-w-[400px] md:max-w-[480px] mx-auto place-items-center"
              style={{ transform: 'scale(var(--card-scale, 1))', transformOrigin: 'center center' }}
            >
              {myCards.map((card, idx) => (
                <div
                  key={card.id || idx}
                  ref={(el) => {
                    if (gridRefs.current) gridRefs.current[idx] = el;
                  }}
                  className="relative group w-full"
                >
                  {latestGridMove?.player_id === userId && latestGridMove?.card_affected_index === idx && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0, rotate: -45 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      className="absolute -top-3 -right-3 text-ui-yellow drop-shadow-[0_0_5px_rgba(255,205,117,0.8)] z-30"
                    >
                      <Star size={24} fill="currentColor" />
                    </motion.div>
                  )}
                  <CardComponent
                    card={card}
                    index={idx}
                    style={user.card_style || 'classic'}
                    backStyle={user.card_back_style || 'classic'}
                    backColor={user.card_back_color || 'ui-red'}
                    backSecondaryColor={user.card_back_secondary_color || 'white'}
                    showPoints={user.show_card_points !== 0}
                    onClick={() => {
                      if (state.game.status === 'initializing') {
                        handleReveal(idx);
                      } else if (state.game.drawn_card) {
                        handleMove(idx, 'replace');
                      }
                    }}
                    className={`fluid cursor-pointer ${
                      latestGridMove?.player_id === userId && latestGridMove?.card_affected_index === idx
                        ? 'ring-4 ring-ui-yellow shadow-[0_0_20px_rgba(255,205,117,0.5)]'
                        : ''
                    } ${
                      state.game.drawn_card
                        ? 'ring-4 ring-ui-yellow ring-offset-4 ring-offset-bg-dark border-ui-yellow scale-105 z-10 shadow-[0_0_20px_rgba(255,205,117,0.4)]'
                        : ''
                    } ${draggingOver?.type === 'grid' && draggingOver.index === idx ? 'scale-110 -translate-y-4 ring-ui-yellow ring-4' : ''} hover:y-[-10px] hover:scale-110 hover:shadow-[0_0_20px_rgba(56,217,115,0.4),8px_8px_0px_0px_rgba(0,0,0,0.4)]`}
                  />

                  {state.game.status === 'initializing' && !card.is_face_up && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-xs text-ui-yellow font-bold opacity-0 group-hover:opacity-100 uppercase tracking-widest bg-bg-dark/80 px-2 py-1 border border-ui-yellow transition-opacity">
                        Reveal
                      </span>
                    </div>
                  )}

                  {state.game.drawn_card && !card.is_face_up && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-ui-yellow/10 flex items-center justify-center z-20 pointer-events-none">
                      <div className="text-xs text-center text-ui-yellow font-bold bg-bg-dark px-1 border border-ui-yellow">SWAP</div>
                    </motion.div>
                  )}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Move History Panel (Rendered when mobileTab === 'history' on mobile, or in desktop layout) */}
      <div className={`w-full max-w-2xl mx-auto transition-all duration-500 mt-4 ${mobileTab === 'history' ? 'block' : 'hidden lg:block'}`}>
        <div className="p-4 md:p-6 bg-bg-dark/90 geometric-border border-ui-yellow space-y-4 shadow-[8px_8px_0px_0px_rgba(255,205,117,0.2)]">
          <div className="flex items-center justify-between border-b-2 border-ui-border pb-3">
            <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-ui-yellow flex items-center gap-2">
              <History size={16} /> MATCH MOVE HISTORY
            </h3>
            <span className="text-[10px] text-ui-gray font-mono">{state.moves?.length || 0} MOVES</span>
          </div>

          <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1 font-mono text-[10px] md:text-xs">
            {!state.moves || state.moves.length === 0 ? (
              <div className="text-center text-ui-gray py-6 uppercase">No moves recorded yet</div>
            ) : (
              [...state.moves].reverse().map((m: any, idx: number) => {
                const isMe = m.player_id === userId;
                const senderName = isMe ? myName : m.player_id === (opponentId || 'cpu') ? opponentName : m.player_id;
                return (
                  <div
                    key={m.id || idx}
                    className="p-2.5 bg-black/50 border border-ui-border flex items-center justify-between gap-2 transition-all hover:border-ui-yellow/50"
                  >
                    <span className="text-ui-gray shrink-0 font-bold">R{m.round_number || 1}</span>
                    <span className={`font-bold truncate max-w-[110px] ${isMe ? 'text-ui-green' : 'text-ui-red'}`}>
                      {senderName}
                    </span>
                    <span className="text-ui-yellow shrink-0 uppercase">
                      {m.move_type ? m.move_type.replace('_', ' ') : 'MOVE'}
                      {m.card_value ? ` (${m.card_suit || ''}${m.card_value})` : ''}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
