import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useStore } from '../../store/useStore';

/**
 * Circular 24-hour coding rhythm visualization.
 * Shows when the user is most active during the day.
 */
const HOUR_LABELS = [
    '00', '', '', '03', '', '', '06', '', '', '09', '', '',
    '12', '', '', '15', '', '', '18', '', '', '21', '', '',
];

const PERIOD_INFO = [
    { start: 0, end: 5, name: 'Нічна сова', icon: '🌙', color: '#4a3060' },
    { start: 5, end: 8, name: 'Ранній птах', icon: '🌅', color: '#c4956a' },
    { start: 8, end: 12, name: 'Ранковий кодер', icon: '☀️', color: '#e8a0b4' },
    { start: 12, end: 14, name: 'Обідня перерва', icon: '🍱', color: '#4a7c59' },
    { start: 14, end: 18, name: 'Денний марафон', icon: '⛩️', color: '#b76e79' },
    { start: 18, end: 22, name: 'Вечірній сеанс', icon: '🏮', color: '#c4956a' },
    { start: 22, end: 24, name: 'Полуничний кодер', icon: '🌸', color: '#b76e79' },
];

export function CodingRhythm() {
    const stats = useStore((s) => s.stats);

    const { hours, max, peakHour, peakPeriod, totalActivity } = useMemo(() => {
        const h = stats?.commitsByHour ?? Array(24).fill(0);
        const m = Math.max(1, ...h);
        const peak = h.indexOf(m);
        const period = PERIOD_INFO.find((p) => peak >= p.start && peak < p.end) ?? PERIOD_INFO[0];
        const total = h.reduce((a, b) => a + b, 0);
        return { hours: h, max: m, peakHour: peak, peakPeriod: period, totalActivity: total };
    }, [stats]);

    const size = 240;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = size * 0.42;
    const innerR = size * 0.22;

    return (
        <div className="space-y-4">
            {/* Circular chart */}
            <div className="flex justify-center">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* Background ring */}
                    <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(232,160,180,0.06)" strokeWidth={outerR - innerR} />

                    {/* Hour bars */}
                    {hours.map((count, i) => {
                        const angle = (Math.PI * 2 * i) / 24 - Math.PI / 2;
                        const nextAngle = (Math.PI * 2 * (i + 1)) / 24 - Math.PI / 2;
                        const ratio = count / max;
                        const barR = innerR + (outerR - innerR) * ratio;

                        // Arc segment
                        const x1i = cx + Math.cos(angle) * innerR;
                        const y1i = cy + Math.sin(angle) * innerR;
                        const x1o = cx + Math.cos(angle) * barR;
                        const y1o = cy + Math.sin(angle) * barR;
                        const x2i = cx + Math.cos(nextAngle) * innerR;
                        const y2i = cy + Math.sin(nextAngle) * innerR;
                        const x2o = cx + Math.cos(nextAngle) * barR;
                        const y2o = cy + Math.sin(nextAngle) * barR;

                        const period = PERIOD_INFO.find((p) => i >= p.start && i < p.end) ?? PERIOD_INFO[0];
                        const opacity = ratio > 0 ? 0.3 + ratio * 0.7 : 0.05;

                        return (
                            <motion.path
                                key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.03, duration: 0.3 }}
                                d={`M${x1i},${y1i} L${x1o},${y1o} A${barR},${barR} 0 0,1 ${x2o},${y2o} L${x2i},${y2i} A${innerR},${innerR} 0 0,0 ${x1i},${y1i}Z`}
                                fill={period.color}
                                opacity={opacity}
                                stroke="rgba(13,11,15,0.5)"
                                strokeWidth="0.5"
                            >
                                <title>{`${String(i).padStart(2, '0')}:00 — ${count} подій`}</title>
                            </motion.path>
                        );
                    })}

                    {/* Hour labels */}
                    {HOUR_LABELS.map((label, i) => {
                        if (!label) return null;
                        const angle = (Math.PI * 2 * i) / 24 - Math.PI / 2;
                        const lR = outerR + 14;
                        const x = cx + Math.cos(angle) * lR;
                        const y = cy + Math.sin(angle) * lR;
                        return (
                            <text
                                key={i}
                                x={x}
                                y={y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="rgba(255,255,255,0.3)"
                                fontSize="9"
                                fontFamily="'Noto Serif JP', serif"
                            >
                                {label}
                            </text>
                        );
                    })}

                    {/* Center info */}
                    <text x={cx} y={cy - 8} textAnchor="middle" fill="#e8a0b4" fontSize="22" fontFamily="'Noto Serif JP', serif" fontWeight="700">
                        {String(peakHour).padStart(2, '0')}:00
                    </text>
                    <text x={cx} y={cy + 10} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="'Noto Serif JP', serif">
                        пік активності
                    </text>
                </svg>
            </div>

            {/* Peak period badge */}
            <div className="flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-2xl">{peakPeriod.icon}</span>
                <div>
                    <div className="font-jp font-bold text-sm" style={{ color: peakPeriod.color }}>
                        {peakPeriod.name}
                    </div>
                    <div className="text-[11px] text-white/40">
                        Найбільше коду о {String(peakHour).padStart(2, '0')}:00 &middot; {totalActivity} подій
                    </div>
                </div>
            </div>
        </div>
    );
}
