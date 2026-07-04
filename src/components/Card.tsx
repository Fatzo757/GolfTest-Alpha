import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card as CardType } from '../types.ts';

interface CardProps {
  card: CardType;
  index: number;
  style: string;
  backStyle?: string;
  backColor?: string;
  backSecondaryColor?: string;
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

export const getSecondaryColors = (color: string) => {
  const colorMap: Record<string, any> = {
    'white': { border: 'border-white', border80: 'border-white/80', border70: 'border-white/70', border60: 'border-white/60', border50: 'border-white/50', border40: 'border-white/40', border30: 'border-white/30', border20: 'border-white/20', bg60: 'bg-white/60', bg50: 'bg-white/50', bg40: 'bg-white/40', bg20: 'bg-white/20', stroke: 'text-white/60', hex: '#ffffff' },
    'black': { border: 'border-black', border80: 'border-black/80', border70: 'border-black/70', border60: 'border-black/60', border50: 'border-black/50', border40: 'border-black/40', border30: 'border-black/30', border20: 'border-black/20', bg60: 'bg-black/60', bg50: 'bg-black/50', bg40: 'bg-black/40', bg20: 'bg-black/20', stroke: 'text-black/60', hex: '#000000' },
    'red': { border: 'border-red-600', border80: 'border-red-600/80', border70: 'border-red-600/70', border60: 'border-red-600/60', border50: 'border-red-600/50', border40: 'border-red-600/40', border30: 'border-red-600/30', border20: 'border-red-600/20', bg60: 'bg-red-600/60', bg50: 'bg-red-600/50', bg40: 'bg-red-600/40', bg20: 'bg-red-600/20', stroke: 'text-red-600/60', hex: '#dc2626' },
    'blue': { border: 'border-blue-600', border80: 'border-blue-600/80', border70: 'border-blue-600/70', border60: 'border-blue-600/60', border50: 'border-blue-600/50', border40: 'border-blue-600/40', border30: 'border-blue-600/30', border20: 'border-blue-600/20', bg60: 'bg-blue-600/60', bg50: 'bg-blue-600/50', bg40: 'bg-blue-600/40', bg20: 'bg-blue-600/20', stroke: 'text-blue-600/60', hex: '#2563eb' },
    'green': { border: 'border-green-600', border80: 'border-green-600/80', border70: 'border-green-600/70', border60: 'border-green-600/60', border50: 'border-green-600/50', border40: 'border-green-600/40', border30: 'border-green-600/30', border20: 'border-green-600/20', bg60: 'bg-green-600/60', bg50: 'bg-green-600/50', bg40: 'bg-green-600/40', bg20: 'bg-green-600/20', stroke: 'text-green-600/60', hex: '#16a34a' },
    'yellow': { border: 'border-yellow-500', border80: 'border-yellow-500/80', border70: 'border-yellow-500/70', border60: 'border-yellow-500/60', border50: 'border-yellow-500/50', border40: 'border-yellow-500/40', border30: 'border-yellow-500/30', border20: 'border-yellow-500/20', bg60: 'bg-yellow-500/60', bg50: 'bg-yellow-500/50', bg40: 'bg-yellow-500/40', bg20: 'bg-yellow-500/20', stroke: 'text-yellow-500/60', hex: '#eab308' },
    'orange': { border: 'border-orange-500', border80: 'border-orange-500/80', border70: 'border-orange-500/70', border60: 'border-orange-500/60', border50: 'border-orange-500/50', border40: 'border-orange-500/40', border30: 'border-orange-500/30', border20: 'border-orange-500/20', bg60: 'bg-orange-500/60', bg50: 'bg-orange-500/50', bg40: 'bg-orange-500/40', bg20: 'bg-orange-500/20', stroke: 'text-orange-500/60', hex: '#f97316' },
    'purple': { border: 'border-purple-600', border80: 'border-purple-600/80', border70: 'border-purple-600/70', border60: 'border-purple-600/60', border50: 'border-purple-600/50', border40: 'border-purple-600/40', border30: 'border-purple-600/30', border20: 'border-purple-600/20', bg60: 'bg-purple-600/60', bg50: 'bg-purple-600/50', bg40: 'bg-purple-600/40', bg20: 'bg-purple-600/20', stroke: 'text-purple-600/60', hex: '#9333ea' },
  };
  return colorMap[color] || colorMap['white'];
};

export const CardPattern = ({ backStyle, backColor, backSecondaryColor = 'white' }: { backStyle: string, backColor: string, backSecondaryColor?: string }) => {
  const cMap = getCardBackColors(backColor);
  const sMap = getSecondaryColors(backSecondaryColor);
  
  return (
    <>
      {backStyle === 'classic' && (
        <div className={`absolute inset-2 border-[4px] ${sMap.border80} flex flex-col items-center justify-center`}>
           <div className={`w-1/2 h-1/2 border-[4px] ${sMap.border80} rotate-45`} />
        </div>
      )}
      {backStyle === 'modern' && (
        <div className={`absolute inset-1.5 rounded-[6px] border-[4px] ${sMap.border80} opacity-90 shadow-[inset_0_0_10px_rgba(0,0,0,0.3)] flex items-center justify-center`}>
           <div className={`w-2/3 h-2/3 rounded-[4px] border-[3px] ${sMap.border60} opacity-80`} />
        </div>
      )}
      {backStyle === 'sketch' && (
        <div className={`absolute inset-2 border-[4px] ${sMap.border70} rounded-lg flex items-center justify-center opacity-90`}>
           <div className="w-full h-full relative">
              <svg className={`w-full h-full ${sMap.stroke}`} viewBox="0 0 100 100" preserveAspectRatio="none">
                 <path d="M10,10 Q50,0 90,10 Q100,50 90,90 Q50,100 10,90 Q0,50 10,10 Z" fill="none" stroke="currentColor" strokeWidth="4" />
                 <path d="M20,20 L80,80 M80,20 L20,80" stroke="currentColor" strokeWidth="3" opacity="0.8" />
              </svg>
           </div>
        </div>
      )}
      {backStyle === 'geometric' && (
        <div className={`absolute inset-1 border-[2px] ${sMap.border60} grid grid-cols-2 grid-rows-2 gap-1.5 p-1.5`}>
           <div className={`${sMap.bg40} rounded-tl-lg`} />
           <div className={`${sMap.bg60} rounded-tr-sm`} />
           <div className={`${sMap.bg60} rounded-bl-sm`} />
           <div className={`${sMap.bg40} rounded-br-lg`} />
        </div>
      )}
      {backStyle === 'retro_grid' && (
        <div className={`absolute inset-0 overflow-hidden border-[3px] ${sMap.border60} group-hover:${sMap.border80} transition-colors`}>
          <div className={`w-12 h-12 absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border-[3px] ${sMap.border60} ${sMap.bg20}`}></div>
          <div className="absolute bottom-0 w-full h-[60%] [perspective:150px]">
            <div className={`w-[200%] h-[200%] absolute -left-[50%] top-0 border-t-[3px] ${sMap.border50} [transform:rotateX(75deg)]`}
                 style={{backgroundImage: `linear-gradient(to right, ${sMap.hex}80 2px, transparent 2px), linear-gradient(to bottom, ${sMap.hex}80 2px, transparent 2px)`, backgroundSize: '12px 12px'}}>
            </div>
          </div>
        </div>
      )}
      {backStyle === 'minimal' && (
        <div className={`absolute inset-3 border-[2px] ${sMap.border80} rounded-[2px] flex items-center justify-center`}>
          <div className={`w-2 h-2 border-[2px] ${sMap.border80} ${sMap.bg40} rounded-full`}></div>
          <div className={`absolute inset-[4px] border-[2px] ${sMap.border50} rounded-[2px]`}></div>
        </div>
      )}
      {backStyle === 'cyber' && (
        <div className={`absolute inset-0 border ${sMap.border30}`}>
          <div className={`absolute top-1.5 left-1.5 w-1.5 h-1.5 border ${sMap.border30}`}></div>
          <div className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 border ${sMap.border30}`}></div>
          <div className={`absolute bottom-1.5 left-1.5 w-1.5 h-1.5 border ${sMap.border30}`}></div>
          <div className={`absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border ${sMap.border30}`}></div>
          
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border rotate-45 ${sMap.border40} flex items-center justify-center`}>
             <div className={`w-1 h-1 ${sMap.bg50}`}></div>
          </div>
          <div className={`absolute left-[8px] top-[14px] bottom-[14px] w-[1px] ${sMap.bg20}`}></div>
          <div className={`absolute right-[8px] top-[14px] bottom-[14px] w-[1px] ${sMap.bg20}`}></div>
          <div className={`absolute top-[8px] left-[14px] right-[14px] h-[1px] ${sMap.bg20}`}></div>
          <div className={`absolute bottom-[8px] left-[14px] right-[14px] h-[1px] ${sMap.bg20}`}></div>
        </div>
      )}
    </>
  );
};

export default function Card({ card, index, style, backStyle = 'classic', backColor = 'ui-red', backSecondaryColor = 'white', onClick, className = '', isDragging = false, forceFaceUp = false }: CardProps) {
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
            <CardPattern backStyle={backStyle} backColor={backColor} backSecondaryColor={backSecondaryColor} />
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
            <span className={`font-bold ${isRed ? 'text-ui-red' : 'text-black'} ${style === 'sketch' ? 'text-2xl sm:text-lg italic' : style === 'modern' ? 'text-4xl sm:text-2xl' : 'text-xl sm:text-sm'} ${style === 'classic' ? 'tracking-tighter' : ''}`}>
              {card.value}
            </span>
            
            <div className={`flex-1 flex items-center justify-center w-full ${style === 'modern' ? 'scale-110' : ''}`}>
               {style === 'modern' ? (
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isRed ? 'bg-ui-red text-white shadow-sm' : 'bg-black text-white shadow-sm'}`}>
                    <span className="text-5xl sm:text-4xl">{symbol}</span>
                </div>
               ) : style === 'sketch' ? (
                <div className={`text-5xl sm:text-4xl ${isRed ? 'text-ui-red' : 'text-black'} rotate-3`}>
                    {symbol}
                </div>
               ) : (
                <span className={`text-5xl sm:text-3xl ${isRed ? 'text-ui-red' : 'text-black'} ${style === 'classic' ? 'image-rendering-pixelated' : ''}`}>
                    {symbol}
                </span>
               )}
            </div>
            
            <div className="w-full flex justify-between items-center mt-auto">
               <span className={`${style === 'modern' ? 'text-[12px] sm:text-[10px]' : 'text-[10px] sm:text-[8px]'} opacity-30 ${style === 'sketch' ? 'font-handdrawn' : ''}`}>{getPoints(card.value)} PT</span>
               <span className={`${style === 'modern' ? 'text-sm sm:text-xs' : 'text-xs sm:text-[10px]'} font-bold self-end rotate-180 opacity-20 ${isRed ? 'text-ui-red' : 'text-black'}`}>{card.value}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
