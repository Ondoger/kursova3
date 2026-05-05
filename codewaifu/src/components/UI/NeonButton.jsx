import { motion } from 'framer-motion';
import { useState, useRef } from 'react';

export function NeonButton({ variant = 'primary', burst = true, className = '', children, onClick, ...rest }) {
    const [particles, setParticles] = useState([]);
    const counter = useRef(0);

    const handleEnter = (e) => {
        if (!burst) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const colors = ['#e8a0b4', '#c4956a', '#b76e79', '#f5c6d0'];
        const newParticles = Array.from({ length: 14 }, () => ({
            id: counter.current++,
            x,
            y,
            angle: Math.random() * Math.PI * 2,
            color: colors[Math.floor(Math.random() * colors.length)],
        }));
        setParticles((p) => [...p, ...newParticles]);
        window.setTimeout(() => {
            setParticles((p) => p.filter((q) => !newParticles.some((n) => n.id === q.id)));
        }, 800);
    };

    const baseStyles =
        variant === 'primary'
            ? 'bg-gradient-to-r from-jp-sakura/15 via-jp-gold/10 to-jp-sakura-dark/15 border-jp-sakura/30 text-white hover:border-jp-sakura/60 shadow-[0_0_20px_rgba(232,160,180,0.15)] hover:shadow-[0_0_30px_rgba(232,160,180,0.3)]'
            : variant === 'pink'
                ? 'bg-gradient-to-r from-jp-sakura-dark/15 via-jp-sakura/10 to-jp-gold/15 border-jp-sakura-dark/30 text-white hover:border-jp-sakura-dark/60 shadow-[0_0_20px_rgba(183,110,121,0.15)] hover:shadow-[0_0_30px_rgba(183,110,121,0.3)]'
                : 'bg-white/[0.02] border-white/10 text-white/80 hover:bg-white/[0.05] hover:border-jp-sakura/20';

    return (
        <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onMouseEnter={handleEnter}
            onClick={onClick}
            className={`relative overflow-visible inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-jp font-bold tracking-wider text-sm border backdrop-blur-md transition-all ${baseStyles} ${className}`}
            {...rest}
        >
            <span className="relative z-10">{children}</span>
            {particles.map((p) => (
                <motion.span
                    key={p.id}
                    initial={{ x: p.x, y: p.y, opacity: 1, scale: 1 }}
                    animate={{
                        x: p.x + Math.cos(p.angle) * 70,
                        y: p.y + Math.sin(p.angle) * 70,
                        opacity: 0,
                        scale: 0,
                    }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
                    style={{
                        background: p.color,
                        boxShadow: `0 0 8px ${p.color}, 0 0 16px ${p.color}`,
                    }}
                />
            ))}
        </motion.button>
    );
}
