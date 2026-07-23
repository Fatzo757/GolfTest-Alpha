import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { GameState, Move, User } from '../../types';
import CardComponent, { CardPattern, getCardBackColors } from '../Card';
import { soundService } from '../../services/soundService';

interface GameControlsProps {
  state: GameState;
  user: User;
  userId: string;
  isMyTurn: boolean;
  canDraw: boolean;
  latestMove: Move | null;
  draggingOver: { type: 'grid' | 'discard'; index?: number } | null;
  setDraggingOver: (val: { type: 'grid' | 'discard'; index?: number } | null) => void;
  discardPileRef: React.RefObject<HTMLDivElement | null>;
  gridRefs: React.RefObject<(HTMLDivElement | null)[]>;
  handleDraw: (source: 'deck' | 'discard') => void;
  handleMove: (cardIndex: number, moveType: 'replace' | 'discard_drawn') => void;
}

export default function GameControls({
  state,
  user,
  userId,
  isMyTurn,
  canDraw,
  latestMove,
  draggingOver,
  setDraggingOver,
  discardPileRef,
  gridRefs,
  handleDraw,
  handleMove,
}: GameControlsProps) {
  return (
    <div className="h-[145px] md:h-[200px] lg:h-auto p-2 md:p-6 geometric-border bg-black/10 grid grid-cols-3 place-items-center lg:flex lg:flex-col gap-2 md:gap-4 lg:gap-8 min-w-fit w-full">
      {/* Deck Slot */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-1 flex-1 max-w-[110px]">
        <motion.div
          onClick={() => canDraw && handleDraw('deck')}
          whileHover={canDraw ? { scale: 1.1, rotate: 5, boxShadow: '8px 8px 0px 0px rgba(255,123,82,0.4)' } : {}}
          whileTap={canDraw ? { scale: 0.9 } : {}}
          className={`w-full aspect-[3/4] geometric-card geometric-card-back cursor-pointer transition-all relative small md:normal ${
            canDraw ? '!border-black ring-2 ring-ui-yellow ring-offset-2 ring-offset-bg-dark' : 'opacity-60 !border-black'
          } ${
            latestMove?.player_id !== userId && latestMove?.move_type.includes('deck')
              ? 'ring-2 ring-ui-orange ring-offset-2 ring-offset-bg-dark shadow-[0_0_10px_rgba(255,123,82,0.5)]'
              : ''
          }`}
          style={{ backgroundColor: getCardBackColors(user.card_back_color || 'ui-red').hex }}
        >
          {latestMove?.player_id !== userId && latestMove?.move_type.includes('deck') && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-ui-orange text-white text-[0.625rem] font-bold px-1 py-0.5 rounded-full whitespace-nowrap animate-bounce z-50">
              {latestMove.player_id === 'cpu' ? 'CPU' : 'OPPONENT'}
            </div>
          )}
          <div className={`card-pattern absolute inset-0 z-0 overflow-hidden rounded-[inherit] border-2 ${getCardBackColors(user.card_back_color || 'ui-red').border} bg-transparent`}>
            <CardPattern backStyle={user.card_back_style || 'classic'} backColor={user.card_back_color || 'ui-red'} backSecondaryColor={user.card_back_secondary_color || 'white'} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div
              className={`text-[0.875rem] md:text-[1.125rem] font-bold drop-shadow-lg text-center transition-colors ${
                state?.game?.deck_count && state.game.deck_count < 10 ? 'text-ui-red animate-pulse' : 'text-ui-orange'
              }`}
            >
              {state?.game?.deck_count}
            </div>
          </div>
        </motion.div>
        <span className="text-xs md:text-sm text-ui-orange tracking-widest font-bold uppercase">Deck</span>
      </motion.div>

      {/* Active Card Slot */}
      <div className="w-full flex flex-col items-center justify-center min-h-[140px] md:h-[160px] lg:h-auto">
        <AnimatePresence mode="wait" initial={false}>
          {state?.game?.drawn_card ? (
            <motion.div
              key="active-card"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center relative w-full"
            >
              <span className="text-[10px] md:text-xs text-ui-yellow font-black uppercase tracking-[0.2em] animate-pulse absolute -top-5 md:-top-6 whitespace-nowrap">
                Active
              </span>
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="relative z-50 flex items-center justify-center w-full"
              >
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

                    if (gridRefs.current) {
                      for (let i = 0; i < gridRefs.current.length; i++) {
                        const rect = gridRefs.current[i]?.getBoundingClientRect();
                        if (rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                          setDraggingOver({ type: 'grid', index: i });
                          return;
                        }
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
                    if (gridRefs.current) {
                      for (let i = 0; i < gridRefs.current.length; i++) {
                        const rect = gridRefs.current[i]?.getBoundingClientRect();
                        if (rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                          handleMove(i, 'replace');
                          return;
                        }
                      }
                    }
                  }}
                  whileHover={isMyTurn ? { scale: 1.05 } : {}}
                  whileDrag={{ scale: 1.15, zIndex: 100 }}
                  className={`${isMyTurn ? 'cursor-grab active:cursor-grabbing' : ''} w-full aspect-[3/4] min-w-[70px] max-w-[120px]`}
                >
                  <CardComponent
                    key={state.game.drawn_card.id}
                    card={state.game.drawn_card}
                    index={-1}
                    style={user.card_style || 'classic'}
                    backStyle={user.card_back_style || 'classic'}
                    backColor={user.card_back_color || 'ui-red'}
                    backSecondaryColor={user.card_back_secondary_color || 'white'}
                    showPoints={user.show_card_points !== 0}
                    className={`small md:normal !border-black ${isMyTurn ? 'ring-2 ring-ui-yellow/50 shadow-[0_0_20px_rgba(255,205,117,0.3)]' : ''}`}
                    forceFaceUp={true}
                  />
                </motion.div>
                {isMyTurn && (
                  <button
                    onClick={() => handleMove(0, 'discard_drawn')}
                    className="absolute -right-3 -top-3 md:-right-4 md:-top-4 p-1.5 md:p-2 bg-bg-dark border-2 border-ui-red text-ui-red hover:bg-ui-red hover:text-white transition-all shadow-[1px_1px_0px_0px_rgba(220,38,38,0.2)] rounded-full z-[60]"
                    title="Discard Active Card"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                )}
              </motion.div>
            </motion.div>
          ) : (
            <div key="placeholder" className="h-full flex flex-col items-center justify-center opacity-40 w-full min-w-[70px] max-w-[120px]">
              <div className="w-full aspect-[3/4] border border-dashed border-ui-border rounded-sm flex items-center justify-center bg-ui-blue/5">
                <div className="text-xs font-bold uppercase tracking-widest text-ui-yellow">READY</div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Discard Slot */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col items-center gap-1 flex-1 max-w-[110px]">
        <div
          ref={discardPileRef}
          onClick={() => {
            if (state.game.drawn_card) {
              handleMove(0, 'discard_drawn');
            } else if (canDraw) {
              handleDraw('discard');
            }
          }}
          className={`w-full aspect-[3/4] relative cursor-pointer transition-all small md:normal ${
            isMyTurn && state?.game?.status !== 'initializing' ? 'ring-2 ring-ui-green ring-offset-2 ring-offset-bg-dark' : 'opacity-40'
          } ${
            draggingOver?.type === 'discard'
              ? 'scale-110 ring-2 ring-ui-green ring-offset-2 ring-offset-bg-dark shadow-[0_0_15px_rgba(56,217,115,0.6)]'
              : ''
          } ${
            latestMove?.player_id !== userId && latestMove?.move_type.includes('discard')
              ? 'ring-2 ring-ui-green ring-offset-1 ring-offset-bg-dark shadow-[0_0_10px_rgba(56,217,115,0.5)]'
              : ''
          }`}
        >
          {latestMove?.player_id !== userId && latestMove?.move_type.includes('discard') && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-ui-green text-bg-dark text-[0.625rem] font-bold px-1 py-0.5 rounded-full whitespace-nowrap animate-bounce z-50">
              {latestMove.player_id === 'cpu' ? 'CPU' : 'OPPONENT'}
            </div>
          )}
          <AnimatePresence mode="popLayout">
            {state?.game?.discard && state.game.discard.length > 0 ? (
              <CardComponent
                key={state.game.discard[state.game.discard.length - 1].id || 'discard'}
                card={state.game.discard[state.game.discard.length - 1]}
                index={999}
                style={user.card_style || 'classic'}
                backStyle={user.card_back_style || 'classic'}
                backColor={user.card_back_color || 'ui-red'}
                backSecondaryColor={user.card_back_secondary_color || 'white'}
                showPoints={user.show_card_points !== 0}
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
        <span className="text-xs md:text-sm text-ui-green tracking-widest font-bold uppercase">Discard</span>
      </motion.div>
    </div>
  );
}
