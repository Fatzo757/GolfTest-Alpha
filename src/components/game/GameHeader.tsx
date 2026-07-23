import React from 'react';
import { ArrowLeft, Layers } from 'lucide-react';
import UserAvatar from '../UserAvatar';
import { GameState, User } from '../../types';

interface GameHeaderProps {
  state: GameState;
  user: User;
  onExit: () => void;
  opponentAvatar?: string;
}

export default function GameHeader({ state, user, onExit, opponentAvatar }: GameHeaderProps) {
  const userId = user.id;

  return (
    <div className="flex items-center px-4 py-2 pointer-events-none relative z-[100]">
      <button
        onClick={onExit}
        className="pointer-events-auto secondary-button p-2 bg-bg-dark border-2 border-ui-red text-ui-red hover:bg-ui-red hover:text-white transition-all group shadow-lg flex items-center justify-center shrink-0"
        title="Exit Game"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
      </button>

      <div className="pointer-events-auto flex flex-1 ml-4 items-center justify-between gap-2 md:gap-4 bg-bg-dark/40 backdrop-blur-md px-3 py-2 md:px-5 md:py-2.5 border border-ui-border rounded-xl shadow-lg">
        <div className="hidden md:flex flex-col items-center group relative cursor-help">
          <span className="text-[0.75rem] md:text-[0.875rem] text-ui-yellow uppercase leading-none mb-1 flex items-center gap-1 drop-shadow-sm">
            <Layers size={10} className="md:w-3 md:h-3" />
            Deck
          </span>
          <span className="text-[1.125rem] md:text-[1rem] text-white font-bold leading-none tracking-tighter drop-shadow-sm">
            {state.game.deck_count} LEFT
          </span>
        </div>

        <div className="hidden md:block w-[1px] h-6 bg-ui-border mx-1" />

        <div className="flex items-center gap-4 md:gap-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 md:w-5 md:h-5 rounded-full overflow-hidden border border-ui-green/30 flex items-center justify-center">
              <UserAvatar type={user.avatar} size={20} className="md:hidden" />
              <UserAvatar type={user.avatar} size={16} className="hidden md:block" />
            </div>
            <span className="text-[1.25rem] md:text-[1rem] text-ui-green font-black">
              {userId === state.game.player1_id ? state.game.player1_total_score : state.game.player2_total_score}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 md:w-5 md:h-5 rounded-full overflow-hidden border border-ui-red/30 flex items-center justify-center">
              <UserAvatar type={opponentAvatar} size={20} className="md:hidden" />
              <UserAvatar type={opponentAvatar} size={16} className="hidden md:block" />
            </div>
            <span className="text-[1.25rem] md:text-[1rem] text-ui-red font-black">
              {userId === state.game.player1_id ? state.game.player2_total_score : state.game.player1_total_score}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
