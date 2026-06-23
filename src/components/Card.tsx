import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card as CardType } from '../types.ts';

interface CardProps {
  card: CardType;
  index: number;
  style: string;
  backStyle?: string;
  backColor?: string;
  onClick?: () => void;
  className?: string;
  isDragging?: boolean;
  forceFaceUp?: boolean;
  key?: any;
}

export const getCardBackColors = (backColor: string) => {
  const colorMap: Record<string, any> = {
    'ui-red': { border: 'border-red-600', border30: 'border-red-600/30', border50: 'border-red-600/50', bg20: 'bg-red-600/20', bg50: 'bg-red-600/50', bg: 'bg-red-600', text: 'text-red-600', hex: '#dc2626' },
    'red': { border: 'border-red-600', border30: 'border-red-600/30', border50: 'border-red-600/50', bg20: 'bg-red-600/20', bg50: 'bg-red-600/50', bg: 'bg-red-600', text: 'text-red-600', hex: '#dc2626' },
    'blue': { border: 'border-blue-600', border30: 'border-blue-600/30', border50: 'border-blue-600/50', bg20: 'bg-blue-600/20', bg50: 'bg-blue-600/50', bg: 'bg-blue-600', text: 'text-blue-600', hex: '#2563eb' },
    'green': { border: 'border-green-600', border30: 'border-green-600/30', border50: 'border-green-600/50', bg20: 'bg-green-600/20', bg50: 'bg-green-600/50', bg: 'bg-green-600', text: 'text-green-600', hex: '#16a34a' },
    'yellow': { border: 'border-yellow-500', border30: 'border-yellow-500/30', border50: 'border-yellow-500/50', bg20: 'bg-yellow-500/20', bg50: 'bg-yellow-500/50', bg: 'bg-yellow-500', text: 'text-yellow-500', hex: '#eab308' },
    'orange': { border: 'border-orange-500', border30: 'border-orange-500/30', border50: 'border-orange-500/50', bg20: 'bg-orange-500/20', bg50: 'bg-orange-500/50', bg: 'bg-orange-500', text: 'text-orange-500', hex: '#f97316' },
    'purple': { border: 'border-purple-600', border30: 'border-purple-600/30', border50: 'border-purple-600/50', bg20: 'bg-purple-600/20', bg50: 'bg-purple-600/50', bg: 'bg-purple-600', text: 'text-purple-600', hex: '#9333ea' },
  };
  return colorMap[backColor] || colorMap['red'];
};

export const CardPattern = ({ backStyle, backColor }: { backStyle: string, backColor: string }) => {
  const cMap = getCardBackColors(backColor);
  return (
    <>
      {backStyle === 'classic' && (
        <div className="absolute inset-2 border-[4px] border-white/80 flex flex-col items-center justify-center">
           <div className="w-1/2 h-1/2 border-[4px] border-white/80 rotate-45" />
        </div>
      )}
      {backStyle === 'modern' && (
        <div className="absolute inset-1.5 rounded-[6px] border-[4px] border-white/80 opacity-90 shadow-[inset_0_0_10px_rgba(0,0,0,0.3)] flex items-center justify-center">
           <div className="w-2/3 h-2/3 rounded-[4px] border-[3px] border-white/60 opacity-80" />
        </div>
      )}
      {backStyle === 'sketch' && (
        <div className="absolute inset-2 border-[4px] border-white/70 rounded-lg flex items-center justify-center opacity-90">
           <div className="w-full h-full relative">
              <svg className="w-full h-full text-white/60" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <path d="M10,10 Q50,0 90,10 Q100,50 90,90 Q50,100 10,90 Q0,50 10,10 Z" fill="none" stroke="currentColor" strokeWidth="4" />
                 <path d="M20,20 L80,80 M80,20 L20,80" stroke="currentColor" strokeWidth="3" opacity="0.8" />
              </svg>
           </div>
        </div>
      )}
      {backStyle === 'geometric' && (
        <div className="absolute inset-1 border-[2px] border-white/60 grid grid-cols-2 grid-rows-2 gap-1.5 p-1.5">
           <div className="bg-white/40 rounded-tl-lg" />
           <div className="bg-white/60 rounded-tr-sm" />
           <div className="bg-white/60 rounded-bl-sm" />
           <div className="bg-white/40 rounded-br-lg" />
        </div>
      )}
      {backStyle === 'retro_grid' && (
        <div className="absolute inset-0 overflow-hidden border-[3px] border-white/60 group-hover:border-white/80 transition-colors">
          <div className="w-12 h-12 absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border-[3px] border-white/60 bg-white/20"></div>
          <div className="absolute bottom-0 w-full h-[60%] [perspective:150px]">
            <div className="w-[200%] h-[200%] absolute -left-[50%] top-0 border-t-[3px] border-white/50 [transform:rotateX(75deg)]"
                 style={{backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.5) 2px, transparent 2px), linear-gradient(to bottom, rgba(255,255,255,0.5) 2px, transparent 2px)`, backgroundSize: '12px 12px'}}>
            </div>
          </div>
        </div>
      )}
      {backStyle === 'minimal' && (
        <div className="absolute inset-3 border-[2px] border-white/80 rounded-[2px] flex items-center justify-center">
          <div className="w-2 h-2 border-[2px] border-white/80 bg-white/40 rounded-full"></div>
          <div className="absolute inset-[4px] border-[2px] border-white/50 rounded-[2px]"></div>
        </div>
      )}
      {backStyle === 'cyber' && (
        <div className={`absolute inset-0 bg-bg-dark border ${cMap.border}`}>
          <div className={`absolute top-1.5 left-1.5 w-1.5 h-1.5 border ${cMap.border}`}></div>
          <div className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 border ${cMap.border}`}></div>
          <div className={`absolute bottom-1.5 left-1.5 w-1.5 h-1.5 border ${cMap.border}`}></div>
          <div className={`absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border ${cMap.border}`}></div>
          
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border rotate-45 ${cMap.border} flex items-center justify-center`}>
             <div className={`w-1 h-1 ${cMap.bg}`}></div>
          </div>
          <div className={`absolute left-[8px] top-[14px] bottom-[14px] w-[1px] ${cMap.bg50}`}></div>
          <div className={`absolute right-[8px] top-[14px] bottom-[14px] w-[1px] ${cMap.bg50}`}></div>
          <div className={`absolute top-[8px] left-[14px] right-[14px] h-[1px] ${cMap.bg50}`}></div>
          <div className={`absolute bottom-[8px] left-[14px] right-[14px] h-[1px] ${cMap.bg50}`}></div>
        </div>
      )}
    </>
  );
};

export default function Card({ card, index, style, backStyle = 'classic', backColor = 'ui-red', onClick, className = '', isDragging = false, forceFaceUp = false }: CardProps) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const symbol = card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠';
  const isFaceUp = card.is_face_up || forceFaceUp;

  const cMap = getCardBackColors(backColor);

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
      style={{ transformStyle: 'preserve-3d', ...(!isFaceUp ? { backgroundColor: cMap.hex } : {}) }}
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
            <CardPattern backStyle={backStyle} backColor={backColor} />
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
            <span className={`font-bold ${isRed ? 'text-ui-red' : 'text-bg-dark'} ${style === 'sketch' ? 'text-lg italic' : style === 'modern' ? 'text-2xl' : 'text-sm'} ${style === 'classic' ? 'tracking-tighter' : ''}`}>
              {card.value}
            </span>
            
            <div className={`flex-1 flex items-center justify-center w-full ${style === 'modern' ? 'scale-110' : ''}`}>
               {style === 'modern' ? (
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isRed ? 'bg-ui-red text-white shadow-sm' : 'bg-bg-dark text-white shadow-sm'}`}>
                    <span className="text-4xl">{symbol}</span>
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
               <span className={`${style === 'modern' ? 'text-[8px]' : 'text-[6px]'} opacity-30 ${style === 'sketch' ? 'font-handdrawn' : ''}`}>{getPoints(card.value)} PT</span>
               <span className={`${style === 'modern' ? 'text-xs' : 'text-[8px]'} font-bold self-end rotate-180 opacity-20 ${isRed ? 'text-ui-red' : 'text-bg-dark'}`}>{card.value}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
