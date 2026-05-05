import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useStore } from '../../store/useStore';

const WEEKS = 26;
const DAYS = 7;

function dateKey(d) {
    return d.toISOString().slice(0, 10);
}

export function CommitHeatmap() {
    const stats = useStore((s) => s.stats);
    const { grid, max, totals } = useMemo(() => {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const dayOfWeek = today.getUTCDay();
        const lastSunday = new Date(today);
        lastSunday.setUTCDate(today.getUTCDate() - dayOfWeek);
        const cells = [];
        let max = 0;
        let totals = 0;
        for (let w = 0; w < WEEKS; w++) {
            const col = [];
            for (let d = 0; d < DAYS; d++) {
                const date = new Date(lastSunday);
                date.setUTCDate(lastSunday.getUTCDate() - (WEEKS - 1 - w) * 7 + d);
                const key = dateKey(date);
                const count = stats?.commitsByDay[key] ?? 0;
                max = Math.max(max, count);
                totals += count;
                col.push({ date: key, count, weekIdx: w, dayIdx: d });
            }
            cells.push(col);
        }
        return { grid: cells, max, totals };
    }, [stats]);

    const colorFor = (count) => {
        if (count <= 0) return 'rgba(255,255,255,0.04)';
        const ratio = max ? Math.min(1, count / max) : 0;
        const intensity = 0.3 + ratio * 0.7;
        if (ratio < 0.25) return `rgba(196, 149, 106, ${intensity})`;   // gold
        if (ratio < 0.5) return `rgba(183, 110, 121, ${intensity})`;    // sakura-dark
        if (ratio < 0.75) return `rgba(232, 160, 180, ${intensity})`;   // sakura
        return `rgba(179, 58, 58, ${intensity})`;                        // red accent
    };

    const shadowFor = (count) => {
        if (count <= 0) return 'none';
        const ratio = max ? Math.min(1, count / max) : 0;
        if (ratio < 0.5) return `0 0 4px rgba(196,149,106,0.4)`;
        return `0 0 6px rgba(232,160,180,0.5), 0 0 12px rgba(183,110,121,0.3)`;
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-jp font-bold text-lg neon-text">
                        <span className="opacity-40 text-sm mr-1">献</span> Контриб'юшени
                    </h3>
                    <p className="text-xs text-white/40">
                        Останні {WEEKS} тижнів &middot; активних подій: {totals}
                    </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-white/40">
                    <span>менше</span>
                    {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
                        <span
                            key={i}
                            className="w-3 h-3 rounded-sm"
                            style={{
                                background:
                                    r === 0
                                        ? 'rgba(255,255,255,0.04)'
                                        : r < 0.4
                                            ? `rgba(196, 149, 106, ${0.3 + r * 0.7})`
                                            : r < 0.75
                                                ? `rgba(232, 160, 180, ${0.3 + r * 0.7})`
                                                : `rgba(179, 58, 58, ${0.3 + r * 0.7})`,
                            }}
                        />
                    ))}
                    <span>більше</span>
                </div>
            </div>

            <div className="overflow-x-auto scrollbar-hidden">
                <div className="flex gap-1 min-w-max">
                    {grid.map((col, w) => (
                        <div key={w} className="flex flex-col gap-1">
                            {col.map((cell) => (
                                <motion.div
                                    key={cell.date}
                                    initial={{ opacity: 0, scale: 0.4 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{
                                        delay: (w * 7 + cell.dayIdx) * 0.003,
                                        duration: 0.25,
                                    }}
                                    className="w-3 h-3 rounded-[3px] cursor-pointer"
                                    style={{
                                        background: colorFor(cell.count),
                                        boxShadow: shadowFor(cell.count),
                                    }}
                                    title={`${cell.date}: ${cell.count} подій`}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
