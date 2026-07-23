import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { RefreshCw, ArrowLeft, History, Info, ChevronRight, X, ChevronDown, ChevronUp, Layers, Star } from 'lucide-react';
import { User, GameState } from '../types';
import { Chat } from './Chat';
import UserAvatar from './UserAvatar';
import Confetti from './Confetti';
import { useGameState } from '../hooks/useGameState';
import GameHeader from './game/GameHeader';
import GameControls from './game/GameControls';
import GameBoard from './game/GameBoard';

interface GameProps {
  gameId: string;
  token: string;
  user: User;
  onExit: () => void;
  onRematch?: (newGameId: string) => void;
}

export default function Game({ gameId, token, user, onExit, onRematch }: GameProps) {
  const {
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
  } = useGameState(gameId, token, user);

  const userId = user.id;
  const opponentId = state?.game.player1_id === userId ? state?.game.player2_id : state?.game.player1_id;

  const [draggingOver, setDraggingOver] = useState<{ type: 'grid' | 'discard'; index?: number } | null>(null);
  const [mobileTab, setMobileTab] = useState<'me' | 'opponent' | 'history'>('me');
  const [nudgeCooldown, setNudgeCooldown] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [moveFilter, setMoveFilter] = useState<'ALL' | 'ME' | 'OPPONENT'>('ALL');

  const discardPileRef = useRef<HTMLDivElement>(null);
  const gridRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleRematchClick = async () => {
    if (!state || !onRematch) {
      onExit();
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/games/${gameId}/rematch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        onRematch(data.gameId);
      } else {
        console.error('Rematch failed:', data.error);
        onExit();
      }
    } catch (err) {
      console.error(err);
      onExit();
    }
  };

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
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="h-full bg-ui-yellow shadow-[0_0_10px_rgba(255,205,117,0.5)]"
            />
          </div>
          <span className="text-[0.5rem] text-ui-gray uppercase font-mono">Verifying Session ID: {gameId}</span>
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
          <div className="text-[0.75rem] text-ui-gray mb-8 uppercase text-center leading-loose max-w-xs">{error}</div>
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <button onClick={() => revalidateState()} className="geometric-button text-[0.75rem] w-full border-ui-yellow text-ui-yellow">
              RETRY CONNECTION
            </button>
            <button onClick={onExit} className="geometric-button text-[0.75rem] w-full">
              ABANDON MISSION
            </button>
          </div>
        </motion.div>
      ) : (
        state && (
          <motion.div key="game-content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <LayoutGroup>
              <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
                {/* Initialization Banner */}
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
                          <span className="text-xs md:text-sm text-ui-yellow font-bold uppercase tracking-widest">
                            {myCards.filter((c) => c.is_face_up).length < 2
                              ? 'Game Setup: Select 2 cards to reveal'
                              : 'Ready: Waiting for opponent...'}
                          </span>
                        </div>
                        {myCards.filter((c) => c.is_face_up).length >= 2 && !state.game.is_vs_cpu && (
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
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({ content: '*NUDGES YOU* Please select your starting cards!' }),
                                });
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            disabled={nudgeCooldown}
                            className="geometric-button px-4 py-1 text-xs disabled:opacity-50"
                          >
                            {nudgeCooldown ? 'Nudged!' : 'Nudge Opponent'}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Game Header */}
                <GameHeader state={state} user={user} onExit={onExit} opponentAvatar={opponentAvatar} />

                {/* Mobile Tab Switcher */}
                <div className="lg:hidden flex border-2 border-ui-border p-1 bg-bg-dark/40 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] w-full">
                  <button
                    onClick={() => setMobileTab('me')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-all truncate px-1 ${
                      mobileTab === 'me' ? 'bg-ui-green text-black opacity-100' : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    {user.username} ({calculateScore(userId)})
                  </button>
                  <button
                    onClick={() => setMobileTab('opponent')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-all truncate px-1 ${
                      mobileTab === 'opponent' ? 'bg-ui-red text-white opacity-100' : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    {opponentName} ({calculateScore(opponentId || 'cpu')})
                  </button>
                  <button
                    onClick={() => setMobileTab('history')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                      mobileTab === 'history' ? 'bg-ui-yellow text-black opacity-100' : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    HISTORY
                  </button>
                </div>

                {/* Game Main Layout */}
                <div className="flex flex-col lg:flex-row gap-4 md:gap-6 items-start justify-center px-4">
                  {/* Center Column: Deck & Discard */}
                  <div className="w-full lg:w-36 xl:w-48 2xl:w-64 order-last lg:order-2 mt-2 lg:mt-0 relative z-40">
                    <GameControls
                      state={state}
                      user={user}
                      userId={userId}
                      isMyTurn={isMyTurn}
                      canDraw={canDraw}
                      latestMove={latestMove}
                      draggingOver={draggingOver}
                      setDraggingOver={setDraggingOver}
                      discardPileRef={discardPileRef}
                      gridRefs={gridRefs}
                      handleDraw={handleDraw}
                      handleMove={handleMove}
                    />
                  </div>

                  {/* Left & Right Columns: Game Board Grids */}
                  <div className="flex-1 w-full order-1 lg:order-1">
                    <GameBoard
                      state={state}
                      user={user}
                      userId={userId}
                      isMyTurn={isMyTurn}
                      canDraw={canDraw}
                      myName={myName}
                      opponentName={opponentName}
                      opponentAvatar={opponentAvatar}
                      opponentId={opponentId}
                      myCards={myCards}
                      opponentCards={opponentCards}
                      latestGridMove={latestGridMove}
                      draggingOver={draggingOver}
                      mobileTab={mobileTab}
                      gridRefs={gridRefs}
                      calculateScore={calculateScore}
                      handleDraw={handleDraw}
                      handleReveal={handleReveal}
                      handleMove={handleMove}
                    />
                  </div>
                </div>
              </div>
            </LayoutGroup>

            {/* Chat Drawer */}
            <Chat gameId={gameId} userId={userId} token={token} user={user} />

            {/* Confetti & Winner Screen */}
            {state.game.status === 'finished' && state.game.winner_player_id === userId && <Confetti />}
          </motion.div>
        )
      )}
    </AnimatePresence>
  );
}
