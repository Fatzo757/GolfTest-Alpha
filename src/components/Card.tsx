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
    <motion.div 
      layout
      layoutId={card.id}
      onClick={onClick}
      className={`geometric-card preserve-3d ${!isFaceUp ? 'geometric-card-back' : ''} ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {!isFaceUp ? (
          <motion.div 
            key="back"
            initial={{ rotateY: 180, opacity: 0, scale: 0.95 }}
            animate={{ rotateY: 0, opacity: 1, scale: 1 }}
            exit={{ rotateY: -180, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
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
            {style === 'retro_grid' && (
              <div className="absolute inset-0 overflow-hidden border border-ui-orange/20 group-hover:border-ui-orange/40 transition-colors">
                <div className="w-12 h-12 absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-ui-yellow/40 bg-ui-orange/20"></div>
                <div className="absolute bottom-0 w-full h-[60%] [perspective:150px]">
                  <div className="w-[200%] h-[200%] absolute -left-[50%] top-0 border-t border-ui-orange/30 [transform:rotateX(75deg)]"
                       style={{backgroundImage: 'linear-gradient(to right, rgba(255,100,0,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,100,0,0.3) 1px, transparent 1px)', backgroundSize: '10px 10px'}}>
                  </div>
                </div>
              </div>
            )}
            {style === 'minimal' && (
              <div className="absolute inset-3 border-[0.5px] border-ui-orange/40 rounded-[1px] flex items-center justify-center">
                <div className="w-1.5 h-1.5 border-[0.5px] border-ui-orange/60 rounded-full"></div>
                <div className="absolute inset-[3px] border-[0.5px] border-ui-orange/20 rounded-[1px]"></div>
              </div>
            )}
            {style === 'cyber' && (
              <div className="absolute inset-0 bg-bg-dark border border-ui-green/30">
                <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border border-ui-green/50"></div>
                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 border border-ui-green/50"></div>
                <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 border border-ui-green/50"></div>
                <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border border-ui-green/50"></div>
                
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border rotate-45 border-ui-green/30 flex items-center justify-center">
                   <div className="w-1 h-1 bg-ui-green/40"></div>
                </div>
                <div className="absolute left-[8px] top-[14px] bottom-[14px] w-[1px] bg-ui-green/20"></div>
                <div className="absolute right-[8px] top-[14px] bottom-[14px] w-[1px] bg-ui-green/20"></div>
                <div className="absolute top-[8px] left-[14px] right-[14px] h-[1px] bg-ui-green/20"></div>
                <div className="absolute bottom-[8px] left-[14px] right-[14px] h-[1px] bg-ui-green/20"></div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="front"
            initial={{ rotateY: -180, opacity: 0, scale: 0.95 }}
            animate={{ rotateY: 0, opacity: 1, scale: 1 }}
            exit={{ rotateY: 180, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
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
    </motion.div>
  );
}
