import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AchievementCard } from '../components/Achievements/AchievementCard';
import { GlassCard } from '../components/UI/GlassCard';
import { useStore } from '../store/useStore';
import { useAutoLoad } from '../hooks/useGitHub';
import { evaluateAchievements } from '../utils/achievements';
import { SakuraBranch, CloudDecoration, WavePattern } from '../components/UI/JapaneseDecorations';

const FILTERS = [
    { id: 'all', label: 'Усі' },
    { id: 'unlocked', label: 'Розблоковані' },
    { id: 'locked', label: 'Заблоковані' },
    { id: 'common', label: 'Common' },
    { id: 'rare', label: 'Rare' },
    { id: 'epic', label: 'Epic' },
    { id: 'legendary', label: 'Legendary' },
];

export function AchievementsPage() {
    useAutoLoad();
    const username = useStore((s) => s.username);
    const stats = useStore((s) => s.stats);
    const navigate = useNavigate();
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (!username) navigate('/');
    }, [username, navigate]);

    const evals = useMemo(() => (stats ? evaluateAchievements(stats) : []), [stats]);
    const filtered = evals.filter((e) => {
        if (filter === 'all') return true;
        if (filter === 'unlocked') return e.unlocked;
        if (filter === 'locked') return !e.unlocked;
        return e.achievement.rarity === filter;
    });
    const unlocked = evals.filter((e) => e.unlocked).length;
    const total = evals.length;
    const percent = total ? Math.round((unlocked / total) * 100) : 0;

    if (!stats) return null;

    return (
        <div className="relative max-w-7xl mx-auto px-6 py-6 space-y-6 overflow-hidden">
            {/* Decorations */}
            <SakuraBranch className="fixed top-0 left-0 w-[220px] h-auto opacity-30 pointer-events-none z-0" />
            <CloudDecoration className="fixed top-[25%] right-[4%] w-[260px] pointer-events-none z-0" opacity={0.03} />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative rounded-2xl overflow-hidden p-6"
            >
                <div
                    className="absolute inset-0 -z-10"
                    style={{
                        backgroundImage: 'url(/images/jp/fuji.jpg)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center 60%',
                        opacity: 0.06,
                    }}
                />
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-bg-900/90 via-bg-900/70 to-bg-900/90" />

                <div className="flex items-end justify-between gap-4 flex-wrap relative z-10">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-jp-gold/60 font-jp flex items-center gap-2">
                            <span className="text-jp-sakura/40">功</span> Achievements
                        </p>
                        <h1 className="font-jp font-black text-3xl md:text-4xl mt-1">
                            <span className="text-gradient-jp">Зал слави</span>
                        </h1>
                    </div>
                    <div className="text-right">
                        <div className="text-xs uppercase tracking-widest text-white/40 font-jp">
                            Прогрес
                        </div>
                        <div className="font-jp font-black text-3xl text-gradient-jp">
                            {unlocked}/{total}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Progress bar */}
            <GlassCard hoverable={false} glow="sakura" className="relative z-10">
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-white/60 font-jp">Загальний прогрес</span>
                        <span className="font-mono text-jp-sakura">{percent}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 1.4, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{
                                background: 'linear-gradient(90deg, #c4956a, #e8a0b4, #b76e79)',
                                boxShadow: '0 0 12px rgba(232,160,180,0.5), 0 0 24px rgba(196,149,106,0.3)',
                            }}
                        />
                    </div>
                </div>
            </GlassCard>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 relative z-10">
                {FILTERS.map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-3 py-1.5 rounded-full border text-xs font-jp tracking-widest transition-all ${
                            filter === f.id
                                ? 'bg-jp-sakura/15 border-jp-sakura/40 text-white shadow-[0_0_12px_rgba(232,160,180,0.2)]'
                                : 'border-white/10 bg-white/[0.02] text-white/60 hover:text-white hover:border-jp-sakura/20'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                {filtered.map((e, i) => (
                    <AchievementCard
                        key={e.achievement.id}
                        achievement={e.achievement}
                        unlocked={e.unlocked}
                        progress={e.progress}
                        index={i}
                    />
                ))}
                {filtered.length === 0 && (
                    <div className="col-span-full text-center text-white/40 py-12 font-jp">
                        Нічого не знайдено
                    </div>
                )}
            </div>

            <WavePattern className="w-full h-10 mt-6 opacity-60" color="#c4956a" opacity={0.03} />
        </div>
    );
}
