import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  duration: number;
  delay: number;
  color: string;
  size: number;
  rotation: number;
}

export default function Confetti() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Pixel-art inspired colors
    const colors = [
      'bg-ui-yellow', 
      'bg-ui-red', 
      'bg-ui-green', 
      'bg-ui-orange', 
      'bg-[#ffffff]',
      'bg-[#ffcd75]', 
      'bg-[#ff5252]', 
      'bg-[#38d973]'
    ];
    
    // Create boxy/pixelated confetti chunks
    const newParticles: Particle[] = Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // start X vw
      y: -10 - Math.random() * 20, // start Y vh (just above screen)
      tx: (Math.random() - 0.5) * 40, // end X offset
      ty: 110 + Math.random() * 20, // end Y (below screen)
      duration: 2.5 + Math.random() * 3, // fall speed
      delay: Math.random() * 1.5, // stagger start
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.floor(Math.random() * 8), // 4px to 12px chunky pixels
      rotation: Math.random() * 360,
    }));
    
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[5000] overflow-hidden">
      {particles.map((p) => (
         <motion.div
            key={p.id}
            initial={{ 
              x: `${p.x}vw`, 
              y: `${p.y}vh`, 
              rotate: 0,
              opacity: 1
            }}
            animate={{ 
              x: `${p.x + p.tx}vw`, 
              y: `${p.ty}vh`, 
              rotate: p.rotation * 4,
              opacity: [1, 1, 0.8, 0] 
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: 'linear',
              repeat: Infinity,
            }}
            className={`absolute shadow-[2px_2px_0px_#000] ${p.color}`}
            style={{
              width: p.size,
              height: p.size,
              // Keep it completely square to look like pixel art/boxes
              borderRadius: p.size < 6 ? '0px' : '2px', 
            }}
         />
      ))}
    </div>
  );
}
