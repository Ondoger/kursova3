import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { computeRPGStats } from '../../utils/gamification';

const STAT_META = {
    STR: { label: 'STR', kanji: '力', color: '#b76e79', description: 'Сила — частота коммітів' },
    INT: { label: 'INT', kanji: '知', color: '#c4956a', description: 'Інтелект — кількість мов' },
    AGI: { label: 'AGI', kanji: '速', color: '#4a7c59', description: 'Спритність — швидкість PR' },
    END: { label: 'END', kanji: '耐', color: '#e8a0b4', description: 'Витривалість — стрік' },
    LUK: { label: 'LUK', kanji: '運', color: '#c4956a', description: 'Удача — зірки + фолловери' },
    CHA: { label: 'CHA', kanji: '魅', color: '#b76e79', description: 'Харизма — фолловери + форки' },
};

export function CharacterStats() {
    const stats = useStore((s) => s.stats);
    const rpg = useMemo(() => (stats ? computeRPGStats(stats) : null), [stats]);
    if (!rpg) return null;

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(rpg).map(([key, value], i) => {
                const meta = STAT_META[key];
                return (
                    <motion.div
                        key={key}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="glass p-4 group"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span
                                className="font-jp font-bold tracking-wider"
                                style={{ color: meta.color, textShadow: `0 0 6px ${meta.color}50` }}
                            >
                                <span className="opacity-40 text-xs mr-1">{meta.kanji}</span>
                                {meta.label}
                            </span>
                            <span className="font-jp text-lg">{value}</span>
                        </div>
                        <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${value}%` }}
                                transition={{ duration: 1, delay: i * 0.06, ease: 'easeOut' }}
                                className="absolute inset-y-0 left-0 rounded-full"
                                style={{
                                    background: `linear-gradient(90deg, ${meta.color}, ${meta.color}aa)`,
                                    boxShadow: `0 0 8px ${meta.color}60`,
                                }}
                            />
                        </div>
                        <p className="text-[11px] text-white/50 mt-2 leading-snug">{meta.description}</p>
                    </motion.div>
                );
            })}
        </div>
    );
}
