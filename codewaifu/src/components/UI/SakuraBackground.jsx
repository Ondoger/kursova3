import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { seededRandom } from '../../utils/random';

function SakuraPetal({ index, delay, duration, startX, startY, size, opacity }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        width: `${size}px`,
        height: `${size}px`,
      }}
      initial={{ y: 0, x: 0, opacity: 0, rotate: 0 }}
      animate={{
        y: [0, 400, 900],
        x: [0, 30 * (index % 2 === 0 ? 1 : -1), 60 * (index % 2 === 0 ? 1 : -1)],
        opacity: [0, opacity, opacity, 0],
        rotate: [0, 180, 360],
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: 'linear',
      }}
    >
      <svg viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M15 2C15 2 20 8 20 13C20 18 15 22 15 22C15 22 10 18 10 13C10 8 15 2 15 2Z"
          fill="currentColor"
          className="text-pink-300/80"
        />
        <path
          d="M15 6C15 6 22 10 22 15C22 20 15 22 15 22C15 22 8 20 8 15C8 10 15 6 15 6Z"
          fill="currentColor"
          className="text-pink-200/60"
        />
      </svg>
    </motion.div>
  );
}

export function SakuraBackground({ count = 25 }) {
  const petals = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      startX: seededRandom(i + 1) * 100,
      startY: -(seededRandom(i + 20) * 20 + 5),
      delay: seededRandom(i + 40) * 12,
      duration: 10 + seededRandom(i + 60) * 10,
      size: 10 + seededRandom(i + 80) * 16,
      opacity: 0.3 + seededRandom(i + 100) * 0.5,
    }));
  }, [count]);

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      {/* Ink wash mountain silhouettes at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[45%] opacity-[0.07]">
        <svg
          viewBox="0 0 1440 400"
          className="w-full h-full"
          preserveAspectRatio="none"
          fill="none"
        >
          {/* Far mountains */}
          <path
            d="M0 400 L0 280 Q120 120 240 200 Q360 100 480 180 Q560 60 680 150 Q800 40 920 160 Q1040 80 1160 140 Q1280 60 1440 180 L1440 400Z"
            fill="url(#mountainFar)"
          />
          {/* Near mountains */}
          <path
            d="M0 400 L0 320 Q180 200 360 280 Q480 180 600 260 Q720 160 840 240 Q960 180 1080 260 Q1200 200 1320 280 Q1380 240 1440 260 L1440 400Z"
            fill="url(#mountainNear)"
          />
          <defs>
            <linearGradient id="mountainFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B7355" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#2C1810" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="mountainNear" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4A3728" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#1a0f0a" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Torii gate silhouette - subtle */}
      <div className="absolute bottom-[12%] right-[8%] opacity-[0.04]">
        <svg width="160" height="200" viewBox="0 0 160 200" fill="none">
          <rect x="15" y="30" width="8" height="170" fill="#8B4513" />
          <rect x="137" y="30" width="8" height="170" fill="#8B4513" />
          <rect x="0" y="20" width="160" height="10" rx="3" fill="#8B4513" />
          <rect x="10" y="45" width="140" height="7" rx="2" fill="#8B4513" />
          <path d="M-5 20 Q80 -5 165 20" stroke="#8B4513" strokeWidth="8" fill="none" />
        </svg>
      </div>

      {/* Subtle bamboo on left side */}
      <div className="absolute top-0 left-[3%] bottom-0 opacity-[0.03]">
        <svg width="40" height="100%" viewBox="0 0 40 800" preserveAspectRatio="none">
          <line x1="12" y1="0" x2="12" y2="800" stroke="#4a7c59" strokeWidth="3" />
          <line x1="28" y1="0" x2="28" y2="800" stroke="#4a7c59" strokeWidth="2" />
          {/* Bamboo nodes */}
          <ellipse cx="12" cy="100" rx="4" ry="2" fill="#4a7c59" />
          <ellipse cx="12" cy="250" rx="4" ry="2" fill="#4a7c59" />
          <ellipse cx="12" cy="400" rx="4" ry="2" fill="#4a7c59" />
          <ellipse cx="12" cy="550" rx="4" ry="2" fill="#4a7c59" />
          <ellipse cx="28" cy="180" rx="3" ry="2" fill="#4a7c59" />
          <ellipse cx="28" cy="360" rx="3" ry="2" fill="#4a7c59" />
          <ellipse cx="28" cy="520" rx="3" ry="2" fill="#4a7c59" />
        </svg>
      </div>

      {/* Falling sakura petals */}
      {petals.map((p) => (
        <SakuraPetal key={p.id} index={p.id} {...p} />
      ))}

      {/* Subtle circular enso / moon */}
      <div className="absolute top-[8%] right-[12%] opacity-[0.06]">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="50"
            stroke="#c4956a"
            strokeWidth="3"
            fill="none"
            strokeDasharray="280 40"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
