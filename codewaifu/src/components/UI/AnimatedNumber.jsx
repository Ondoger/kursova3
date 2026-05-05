import { animate } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { formatNumber } from '../../utils/gamification';
export function AnimatedNumber({ value, format = 'plain', duration = 1.6, className }) {
    const ref = useRef(0);
    const [display, setDisplay] = useState(() => format === 'compact' ? formatNumber(0) : '0');
    useEffect(() => {
        const controls = animate(ref.current, value, {
            duration,
            ease: 'easeOut',
            onUpdate: (v) => {
                ref.current = v;
                setDisplay(format === 'compact' ? formatNumber(Math.round(v)) : Math.round(v).toLocaleString('uk-UA'));
            },
        });
        return () => controls.stop();
    }, [value, duration, format]);
    return <span className={className}>{display}</span>;
}
