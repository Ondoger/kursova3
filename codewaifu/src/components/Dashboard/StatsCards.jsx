import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { AnimatedNumber } from '../UI/AnimatedNumber';

export function StatsCards() {
    const stats = useStore((s) => s.stats);
    if (!stats) return null;

    const cards = [
        {
            label: 'Коміти',
            value: stats.totalCommits,
            color: '#e8a0b4',
            kanji: '献',
            caption: 'усього',
        },
        {
            label: 'Серія',
            value: stats.currentStreak,
            color: '#c4956a',
            kanji: '火',
            caption: `рекорд: ${stats.longestStreak} днів`,
        },
        {
            label: 'Мови',
            value: stats.languagesCount,
            color: '#b76e79',
            kanji: '語',
            caption: 'мов програмування',
        },
        {
            label: 'Репозиторії',
            value: stats.totalRepos,
            color: '#4a7c59',
            kanji: '庫',
            caption: `${stats.publicRepos} публічних`,
        },
        {
            label: 'Зірки',
            value: stats.totalStars,
            color: '#c4956a',
            kanji: '星',
            caption: `${stats.totalForks} форків`,
        },
        {
            label: 'Підписники',
            value: stats.followers,
            color: '#e8a0b4',
            kanji: '友',
            caption: `${stats.following} підписок`,
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {cards.map((c, i) => (
                <motion.div
                    key={c.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="glass p-4 relative overflow-hidden group"
                    whileHover={{ y: -3, scale: 1.02 }}
                >
                    {/* Warm ambient glow */}
                    <div
                        className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 blur-2xl group-hover:opacity-40 transition-opacity"
                        style={{ background: c.color }}
                    />

                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs uppercase tracking-widest text-white/50 font-jp">
                            {c.label}
                        </span>
                        <span
                            className="text-lg font-jp font-bold opacity-20 group-hover:opacity-40 transition-opacity"
                            style={{ color: c.color }}
                        >
                            {c.kanji}
                        </span>
                    </div>
                    <div
                        className="font-jp font-black text-3xl"
                        style={{
                            color: c.color,
                            textShadow: `0 0 12px ${c.color}60`,
                        }}
                    >
                        <AnimatedNumber value={c.value} format="compact" />
                    </div>
                    {c.caption && (
                        <div className="text-[11px] text-white/40 mt-1">{c.caption}</div>
                    )}
                </motion.div>
            ))}
        </div>
    );
}
