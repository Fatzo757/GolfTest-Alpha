import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card as CardType } from '../types.ts';

interface CardProps {
  card: CardType;
  index: number;
  style: string;
  onClick?: () => void;
  className?: string;
  isDragging?: boolean;
  forceFaceUp?: boolean;
  key?: any;
}

export default function Card({ card, index, style, onClick, className = '', isDragging = false, forceFaceUp = false }: CardProps) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const symbol = card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠';
  const isFaceUp = card.is_face_up || forceFaceUp;

  const getPoints = (value: string) => {
    if (value === 'J') return -2;
    if (value === 'K') return 0;
    if (value === 'Q') return 10;
    if (value === 'A') return 1;
    const num = parseInt(value);
    return isNaN(num) ? 10 : num;
  };

  return (
    <div 
      onClick={onClick}
      className={`geometric-card preserve-3d ${!isFaceUp ? 'geometric-card-back' : ''} ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {!isFaceUp ? (
          <motion.div 
            key="back"
            initial={{ rotateY: 180, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -180, opacity: 0 }}
            className="card-pattern w-full h-full relative"
          >
            {/* Retro Back Pattern based on style */}
            {style === 'classic' && (
              <div className="absolute inset-2 border-2 border-ui-orange/20 flex flex-col items-center justify-center">
                 <div className="w-1/2 h-1/2 border-2 border-ui-orange/20 rotate-45" />
              </div>
            )}
            {style === 'modern' && (
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-8 h-8 rounded-full border-2 border-ui-orange/20" />
              </div>
            )}
            {style === 'sketch' && (
              <div className="absolute inset-2 border-2 border-dashed border-ui-orange/30 flex items-center justify-center">
                 <span className="font-handdrawn text-[8px] opacity-20">?</span>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="front"
            initial={{ rotateY: -180, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: 180, opacity: 0 }}
            className={`w-full h-full flex flex-col items-start justify-between ${style === 'sketch' ? 'font-handdrawn' : ''}`}
          >
            <span className={`font-bold ${isRed ? 'text-ui-red' : 'text-bg-dark'} ${style === 'sketch' ? 'text-lg italic' : 'text-sm'} ${style === 'classic' ? 'tracking-tighter' : ''}`}>
              {card.value}
            </span>
            
            <div className={`flex-1 flex items-center justify-center w-full ${style === 'modern' ? 'scale-110' : ''}`}>
               {style === 'modern' ? (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isRed ? 'bg-ui-red text-white shadow-sm' : 'bg-bg-dark text-white shadow-sm'}`}>
                    <span className="text-xl">{symbol}</span>
                </div>
               ) : style === 'sketch' ? (
                <div className={`text-4xl ${isRed ? 'text-ui-red' : 'text-bg-dark'} rotate-3`}>
                    {symbol}
                </div>
               ) : (
                <span className={`text-3xl ${isRed ? 'text-ui-red' : 'text-bg-dark'} ${style === 'classic' ? 'image-rendering-pixelated' : ''}`}>
                    {symbol}
                </span>
               )}
            </div>
            
            <div className="w-full flex justify-between items-center mt-auto">
               <span className={`text-[6px] opacity-30 ${style === 'sketch' ? 'font-handdrawn' : ''}`}>{getPoints(card.value)} PT</span>
               <span className={`text-[8px] font-bold self-end rotate-180 opacity-20 ${isRed ? 'text-ui-red' : 'text-bg-dark'}`}>{card.value}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
