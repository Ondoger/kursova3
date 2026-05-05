import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchLeaderboard } from '../../utils/github';
import { useStore } from '../../store/useStore';

export function Leaderboard() {
    const token = useStore((s) => s.token);
    const [entries, setEntries] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        fetchLeaderboard(token ?? undefined)
            .then((data) => { if (!cancelled) setEntries(data); })
            .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Не вдалось завантажити'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [token]);

    if (loading) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-xl skeleton" />
                ))}
            </div>
        );
    }
    if (error) return <div className="text-xs text-white/40">{error}</div>;
    if (!entries) return null;

    return (
        <ol className="space-y-2">
            {entries.slice(0, 10).map((e, i) => {
                const medal = i === 0 ? '#c4956a' : i === 1 ? '#cbd5e1' : i === 2 ? '#b76e79' : null;
                return (
                    <motion.li
                        key={e.login}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 hover:border-jp-sakura/30 hover:bg-white/[0.04] transition-colors"
                    >
                        <span
                            className="w-6 text-center font-jp font-bold"
                            style={{
                                color: medal ?? '#9ca3af',
                                textShadow: medal ? `0 0 8px ${medal}` : 'none',
                            }}
                        >
                            {i + 1}
                        </span>
                        <img
                            src={e.avatar_url}
                            alt={e.login}
                            className="w-8 h-8 rounded-full ring-1 ring-jp-sakura/15"
                        />
                        <a
                            href={e.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 truncate hover:text-jp-sakura transition-colors text-sm font-jp"
                        >
                            {e.login}
                        </a>
                        <span className="text-xs text-white/50 font-mono">
                            {e.followers.toLocaleString('uk-UA')}
                        </span>
                    </motion.li>
                );
            })}
        </ol>
    );
}
