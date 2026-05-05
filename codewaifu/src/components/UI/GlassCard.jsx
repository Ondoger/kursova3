import { motion } from 'framer-motion';
import { forwardRef } from 'react';

const glowMap = {
    sakura: 'hover:shadow-[0_0_30px_rgba(232,160,180,0.2)]',
    gold: 'hover:shadow-[0_0_30px_rgba(196,149,106,0.2)]',
    red: 'hover:shadow-[0_0_25px_rgba(179,58,58,0.2)]',
    bamboo: 'hover:shadow-[0_0_25px_rgba(74,124,89,0.2)]',
    cyan: 'hover:shadow-[0_0_25px_rgba(232,160,180,0.15)]',
    pink: 'hover:shadow-[0_0_25px_rgba(183,110,121,0.2)]',
    purple: 'hover:shadow-[0_0_25px_rgba(183,110,121,0.15)]',
    none: '',
};

export const GlassCard = forwardRef(function GlassCard(
    { className = '', glow = 'sakura', hoverable = true, children, ...props },
    ref
) {
    return (
        <motion.div
            ref={ref}
            className={`glass p-5 transition-all duration-300 ${hoverable ? glowMap[glow] ?? glowMap.sakura : ''} ${className}`}
            {...props}
        >
            {children}
        </motion.div>
    );
});
