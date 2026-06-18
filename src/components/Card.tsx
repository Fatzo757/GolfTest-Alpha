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
        <div className={`absolute inset-2 border-2 ${cMap.border} flex flex-col items-center justify-center`}>
           <div className={`w-1/2 h-1/2 border-2 ${cMap.border} rotate-45`} />
        </div>
      )}
      {backStyle === 'modern' && (
        <div className={`absolute inset-1.5 rounded-[6px] border-2 ${cMap.border} opacity-80 shadow-[inset_0_0_10px_rgba(0,0,0,0.2)] flex items-center justify-center`}>
           <div className={`w-2/3 h-2/3 rounded-[4px] border ${cMap.border30} opacity-50`} />
        </div>
      )}
      {backStyle === 'sketch' && (
        <div className={`absolute inset-2 border-2 border-dashed ${cMap.border} flex items-center justify-center`}>
           <span className={`font-handdrawn text-[8px] ${cMap.text} opacity-50`}>?</span>
        </div>
      )}
      {backStyle === 'retro_grid' && (
        <div className={`absolute inset-0 overflow-hidden border ${cMap.border} group-hover:${cMap.border} transition-colors`}>
          <div className={`w-12 h-12 absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border ${cMap.border} ${cMap.bg20}`}></div>
          <div className="absolute bottom-0 w-full h-[60%] [perspective:150px]">
            <div className={`w-[200%] h-[200%] absolute -left-[50%] top-0 border-t ${cMap.border30} [transform:rotateX(75deg)]`}
                 style={{backgroundImage: `linear-gradient(to right, ${cMap.hex} 1px, transparent 1px), linear-gradient(to bottom, ${cMap.hex} 1px, transparent 1px)`, opacity: 0.3, backgroundSize: '10px 10px'}}>
            </div>
          </div>
        </div>
      )}
      {backStyle === 'minimal' && (
        <div className={`absolute inset-3 border-[0.5px] ${cMap.border} rounded-[1px] flex items-center justify-center`}>
          <div className={`w-1.5 h-1.5 border-[0.5px] ${cMap.border} rounded-full`}></div>
          <div className={`absolute inset-[3px] border-[0.5px] ${cMap.border50} rounded-[1px]`}></div>
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
