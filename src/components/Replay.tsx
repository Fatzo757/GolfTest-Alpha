import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Move, Card, User } from '../types.ts';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, X, SkipForward, SkipBack, Clock, FastForward } from 'lucide-react';
import UserAvatar from './UserAvatar.tsx';
import CardComponent from './Card.tsx';

interface ReplayProps {
  gameId: string;
  token: string;
  user: User;
  onExit: () => void;
}

export default function Replay({ gameId, token, user, onExit }: ReplayProps) {
  const [gameData, setGameData] = useState<any>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);
  const [loading, setLoading] = useState(true);

  const [displayState, setDisplayState] = useState<{
    p1Cards: Card[];
    p2Cards: Card[];
    discard: Card[];
    lastMove: string;
  }>({
    p1Cards: [],
    p2Cards: [],
    discard: [],
    lastMove: 'Waiting to start...'
  });

  useEffect(() => {
    const fetchReplay = async () => {
      try {
        const res = await fetch(`/api/games/${gameId}/replay`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setGameData(data.game);
          setMoves(data.moves);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchReplay();
  }, [gameId, token]);

  const reconstruct = useCallback((idx: number) => {
    if (!gameData || moves.length === 0) return;

    let p1Cards: Card[] = Array(9).fill({ suit: '', value: '', is_face_up: false });
    let p2Cards: Card[] = Array(9).fill({ suit: '', value: '', is_face_up: false });
    let discard: Card[] = [];
    let lastMove = 'Initial State';

    for (let i = 0; i <= idx; i++) {
      const m = moves[i];
      const targetCards = m.player_id === gameData.player1_id ? p1Cards : p2Cards;
      
      switch (m.move_type) {
        case 'round_start':
          p1Cards = p1Cards.map(c => ({...c, is_face_up: false}));
          p2Cards = p2Cards.map(c => ({...c, is_face_up: false}));
          lastMove = 'New Round Started';
          break;
        case 'initial_card':
          targetCards[m.card_affected_index] = { suit: m.card_suit, value: m.card_value, is_face_up: false };
          lastMove = `Dealing cards...`;
          break;
        case 'initial_discard':
          discard = [{ suit: m.card_suit, value: m.card_value, is_face_up: true }];
          lastMove = `Initial discard: ${m.card_value} of ${m.card_suit}`;
          break;
        case 'reveal':
          if (targetCards[m.card_affected_index]) {
            targetCards[m.card_affected_index].is_face_up = true;
          }
          lastMove = `${m.player_id === 'cpu' ? 'CPU' : 'Player'} revealed a card`;
          break;
        case 'replace':
          const oldCard = targetCards[m.card_affected_index];
          targetCards[m.card_affected_index] = { suit: m.card_suit, value: m.card_value, is_face_up: true };
          if (oldCard) {
            discard.push({...oldCard, is_face_up: true});
          }
          lastMove = `${m.player_id === 'cpu' ? 'CPU' : 'Player'} replaced a card at index ${m.card_affected_index}`;
          break;
        case 'discard_drawn':
          discard.push({ suit: m.card_suit, value: m.card_value, is_face_up: true });
          if (targetCards[m.card_affected_index]) {
            targetCards[m.card_affected_index].is_face_up = true;
          }
          lastMove = `${m.player_id === 'cpu' ? 'CPU' : 'Player'} discarded drawn card and revealed another`;
          break;
      }
    }

    setDisplayState({ p1Cards: [...p1Cards], p2Cards: [...p2Cards], discard: [...discard], lastMove });
  }, [gameData, moves]);

  useEffect(() => {
    reconstruct(currentIdx);
  }, [currentIdx, reconstruct]);

  useEffect(() => {
    let timer: any;
    if (isPlaying && currentIdx < moves.length - 1) {
      const nextMove = moves[currentIdx + 1];
      let delay = 800 / playbackSpeed;
      if (['initial_card', 'initial_discard'].includes(nextMove.move_type)) {
        delay = 0;
      }
      timer = setTimeout(() => {
        setCurrentIdx(prev => prev + 1);
      }, delay);
    } else if (currentIdx >= moves.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentIdx, moves, playbackSpeed]);

  const getPoints = (value: string) => {
    if (value === 'J') return -2;
    if (value === 'K') return 0;
    if (value === 'Q') return 10;
    if (value === 'A') return 1;
    const num = parseInt(value);
    return isNaN(num) ? 10 : num;
  };

  const calculateScore = (cards: Card[]) => {
    const partOfSet = new Set<number>();
    const rows = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
    const cols = [[0, 3, 6], [1, 4, 7], [2, 5, 8]];

    rows.forEach(indices => {
      const row = indices.map(i => cards[i]);
      if (row.every(c => c && c.is_face_up) && row[0].value === row[1].value && row[1].value === row[2].value) {
        indices.forEach(i => partOfSet.add(i));
      }
    });

    cols.forEach(indices => {
      const col = indices.map(i => cards[i]);
      if (col.every(c => c && c.is_face_up) && col[0].value === col[1].value && col[1].value === col[2].value) {
        indices.forEach(i => partOfSet.add(i));
      }
    });

    let total = 0;
    cards.forEach((card, index) => {
      if (card && card.is_face_up && !partOfSet.has(index)) {
        total += getPoints(card.value);
      }
    });
    return total;
  };

  const roundNavigation = useMemo(() => {
    const rounds: { startIdx: number; endIdx: number }[] = [];
    if (!moves.length) return rounds;
    
    let currentRoundStart = 0;
    for (let i = 0; i < moves.length; i++) {
      if (moves[i].move_type === 'round_start') {
        if (rounds.length > 0) {
          rounds[rounds.length - 1].endIdx = i - 1;
        }
        currentRoundStart = i;
        while (currentRoundStart < moves.length && ['round_start', 'initial_card', 'initial_discard'].includes(moves[currentRoundStart].move_type)) {
          currentRoundStart++;
        }
        rounds.push({ startIdx: currentRoundStart - 1, endIdx: moves.length - 1 });
      }
    }
    return rounds;
  }, [moves]);

  if (loading) return <div className="p-12 text-center text-ui-yellow animate-pulse uppercase">Accessing Memory...</div>;
  if (!gameData) return <div className="p-12 text-center text-ui-red uppercase">Memory Corrupted</div>;

  const renderCard = (card: Card, index: number) => {
    return (
      <CardComponent
        key={index}
        card={card}
        index={index}
        style={user.card_style || 'classic'}
        className="w-16 h-24 md:w-20 md:h-28"
      />
    );
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center border-b-4 border-ui-border pb-4">
        <div className="flex items-center gap-4">
          <Clock className="text-ui-yellow" />
          <div>
            <h2 className="text-sm font-bold text-ui-yellow uppercase tracking-widest">Match Record: {gameId.substring(0,8)}</h2>
            <div className="text-[8px] text-ui-gray uppercase flex items-center gap-1">
              <div className="w-3 h-3 flex items-center justify-center opacity-60">
                 <UserAvatar type={gameData.player1_avatar} size={10} />
              </div>
              <span className="truncate max-w-[80px]">{gameData.player1_name}</span>
              <span className="mx-1 opacity-30">VS</span>
              <div className="w-3 h-3 flex items-center justify-center opacity-60">
                 <UserAvatar type={gameData.player2_avatar} size={10} />
              </div>
              <span className="truncate max-w-[80px]">{gameData.player2_name}</span>
            </div>
          </div>
        </div>
        <button onClick={onExit} className="p-2 bg-ui-red/20 border-2 border-ui-red text-ui-red hover:bg-ui-red hover:text-white transition-all">
          <X size={20} />
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-8">
        <div className="space-y-12 bg-black/20 p-8 geometric-border">
          {/* Opponent Area */}
          <div className="flex flex-col items-center gap-4">
             <div className="flex items-center gap-2 text-[8px] text-ui-gray uppercase px-4 py-1 border border-ui-gray">
                <div className="w-3 h-3 flex items-center justify-center opacity-70">
                   <UserAvatar type={gameData.player2_avatar} size={10} />
                </div>
                {gameData.player2_name}
                <span className="ml-2 font-bold text-ui-red">{calculateScore(displayState.p2Cards)} PTS</span>
             </div>
             <div className="grid grid-cols-3 gap-2">
                {displayState.p2Cards.map((c, i) => renderCard(c, i))}
             </div>
          </div>

          {/* Central Discard Pile */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -left-12 top-1/2 -translate-y-1/2 text-[10px] text-ui-yellow font-bold uppercase rotate-90 origin-center whitespace-nowrap opacity-50 tracking-widest">Discard Pile</div>
              {displayState.discard.length > 0 ? renderCard(displayState.discard[displayState.discard.length - 1], 999) : (
                <div className="w-20 h-28 border-2 border-dashed border-ui-border flex items-center justify-center opacity-20">
                  <X />
                </div>
              )}
            </div>
          </div>

          {/* Player Area */}
          <div className="flex flex-col items-center gap-4">
             <div className="grid grid-cols-3 gap-2">
                {displayState.p1Cards.map((c, i) => renderCard(c, i))}
             </div>
             <div className="flex items-center gap-2 text-[8px] text-ui-gray uppercase px-4 py-1 border border-ui-gray">
                <div className="w-3 h-3 flex items-center justify-center opacity-70">
                   <UserAvatar type={gameData.player1_avatar} size={10} />
                </div>
                {gameData.player1_name}
                <span className="ml-2 font-bold text-ui-green">{calculateScore(displayState.p1Cards)} PTS</span>
             </div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="space-y-6">
          <div className="p-6 bg-bg-dark border-4 border-ui-border space-y-6">
            <div className="text-[10px] text-ui-yellow uppercase font-bold border-b border-ui-yellow/20 pb-2 flex justify-between">
              <span>Playback Status</span>
              <span>{Math.max(0, currentIdx + 1)} / {moves.length}</span>
            </div>
            
            <div className="h-24 bg-black/40 p-4 border-2 border-ui-border flex flex-col justify-center">
              <div className="text-[8px] text-ui-orange uppercase font-bold mb-2">Last Action:</div>
              <div className="text-[10px] text-white uppercase leading-tight italic">
                {displayState.lastMove}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setCurrentIdx(prev => Math.max(-1, prev - 1))}
                className="geometric-button py-3 text-[8px] uppercase flex items-center justify-center gap-2"
              >
                <ChevronLeft size={14} /> Back
              </button>
              <button 
                onClick={() => setCurrentIdx(prev => Math.min(moves.length - 1, prev + 1))}
                className="geometric-button py-3 text-[8px] uppercase flex items-center justify-center gap-2"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>

            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className={`w-full py-4 text-[10px] uppercase font-bold border-4 transition-all flex items-center justify-center gap-3 ${
                isPlaying ? 'border-ui-orange text-ui-orange bg-ui-orange/10' : 'border-ui-green text-ui-green bg-ui-green/10'
              }`}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              <span>{isPlaying ? 'Pause Playback' : 'Auto Play'}</span>
            </button>

            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 4].map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed as 1 | 2 | 4)}
                  className={`py-2 text-[8px] uppercase font-bold border-2 transition-all flex items-center justify-center gap-1 ${
                    playbackSpeed === speed ? 'border-ui-yellow text-ui-yellow bg-ui-yellow/10' : 'border-ui-border text-ui-gray hover:bg-white/5'
                  }`}
                >
                  <FastForward size={10} /> {speed}x
                </button>
              ))}
            </div>

            {roundNavigation.length > 0 && (
              <div className="space-y-2 border-t border-ui-border pt-4">
                <div className="text-[8px] text-ui-yellow uppercase font-bold">Round Jumps</div>
                <div className="grid grid-cols-2 gap-2">
                  {roundNavigation.map((round, idx) => (
                    <React.Fragment key={idx}>
                      <button 
                        onClick={() => { setCurrentIdx(round.startIdx); setIsPlaying(false); }}
                        className="py-2 text-[8px] uppercase border border-ui-border text-ui-gray hover:text-white hover:border-ui-gray transition-all flex items-center justify-center gap-1"
                      >
                        <SkipBack size={10} /> R{idx + 1} Start
                      </button>
                      <button 
                        onClick={() => { setCurrentIdx(round.endIdx); setIsPlaying(false); }}
                        className="py-2 text-[8px] uppercase border border-ui-border text-ui-gray hover:text-white hover:border-ui-gray transition-all flex items-center justify-center gap-1"
                      >
                        R{idx + 1} End <SkipForward size={10} />
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            <button 
              onClick={() => { setCurrentIdx(-1); setIsPlaying(false); }}
              className="w-full py-4 text-[8px] uppercase text-ui-gray border-4 border-ui-border hover:bg-white/5 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} />
              Reset Record
            </button>
          </div>

          <div className="p-4 bg-ui-purple/5 border border-ui-purple/20 text-[6px] text-ui-purple/60 uppercase leading-relaxed text-center">
            Warning: Replay data reconstructed from move sequence logs. Minor discrepancies may occur.
          </div>
        </div>
      </div>
    </div>
  );
}
