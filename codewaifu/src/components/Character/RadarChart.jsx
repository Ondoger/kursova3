import { motion } from 'framer-motion';

/**
 * Hexagonal RPG-style radar chart — pure SVG, zero deps.
 * @param {{ stats: Record<string, number>, size?: number }} props
 * stats values should be 0-100.
 */
const LABELS = {
    STR: { full: 'Сила', kanji: '力', color: '#b76e79' },
    INT: { full: 'Інтелект', kanji: '知', color: '#c4956a' },
    AGI: { full: 'Спритність', kanji: '速', color: '#4a7c59' },
    END: { full: 'Витривалість', kanji: '耐', color: '#e8a0b4' },
    LUK: { full: 'Удача', kanji: '運', color: '#c4956a' },
    CHA: { full: 'Харизма', kanji: '魅', color: '#b76e79' },
};

export function RadarChart({ stats, size = 280 }) {
    const keys = Object.keys(stats);
    const n = keys.length;
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.38;

    const angleOf = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
    const pointAt = (i, ratio) => {
        const a = angleOf(i);
        return [cx + Math.cos(a) * r * ratio, cy + Math.sin(a) * r * ratio];
    };

    // Grid rings
    const rings = [0.25, 0.5, 0.75, 1.0];
    const gridPaths = rings.map((ratio) => {
        const pts = keys.map((_, i) => pointAt(i, ratio));
        return pts.map((p) => p.join(',')).join(' ');
    });

    // Data polygon
    const dataPoints = keys.map((k, i) => {
        const val = Math.min(100, Math.max(0, stats[k])) / 100;
        return pointAt(i, val);
    });
    const dataPath = dataPoints.map((p) => p.join(',')).join(' ');

    // Axes
    const axes = keys.map((_, i) => ({
        x1: cx,
        y1: cy,
        x2: pointAt(i, 1)[0],
        y2: pointAt(i, 1)[1],
    }));

    return (
        <div className="flex justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Grid */}
                {gridPaths.map((pts, i) => (
                    <polygon
                        key={i}
                        points={pts}
                        fill="none"
                        stroke="rgba(232,160,180,0.08)"
                        strokeWidth={i === rings.length - 1 ? 1.2 : 0.6}
                    />
                ))}

                {/* Axes */}
                {axes.map((a, i) => (
                    <line
                        key={i}
                        {...a}
                        stroke="rgba(196,149,106,0.1)"
                        strokeWidth="0.6"
                    />
                ))}

                {/* Filled area */}
                <motion.polygon
                    initial={{ opacity: 0, scale: 0.3 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ transformOrigin: `${cx}px ${cy}px` }}
                    points={dataPath}
                    fill="url(#radarGradient)"
                    stroke="url(#radarStroke)"
                    strokeWidth="2"
                    strokeLinejoin="round"
                />

                {/* Data point dots */}
                {dataPoints.map(([x, y], i) => (
                    <motion.circle
                        key={i}
                        initial={{ r: 0 }}
                        animate={{ r: 4 }}
                        transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                        cx={x}
                        cy={y}
                        fill={LABELS[keys[i]]?.color ?? '#e8a0b4'}
                        stroke="#0d0b0f"
                        strokeWidth="2"
                    />
                ))}

                {/* Labels */}
                {keys.map((k, i) => {
                    const [lx, ly] = pointAt(i, 1.22);
                    const meta = LABELS[k] ?? { full: k, kanji: '', color: '#e8a0b4' };
                    return (
                        <g key={k}>
                            <text
                                x={lx}
                                y={ly - 7}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill={meta.color}
                                fontSize="11"
                                fontWeight="700"
                                fontFamily="'Noto Serif JP', serif"
                            >
                                {meta.kanji}
                            </text>
                            <text
                                x={lx}
                                y={ly + 7}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="rgba(255,255,255,0.5)"
                                fontSize="9"
                                fontFamily="'Noto Serif JP', serif"
                            >
                                {k} {stats[k]}
                            </text>
                        </g>
                    );
                })}

                {/* Gradients */}
                <defs>
                    <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#e8a0b4" stopOpacity="0.2" />
                        <stop offset="50%" stopColor="#c4956a" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#b76e79" stopOpacity="0.25" />
                    </linearGradient>
                    <linearGradient id="radarStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#e8a0b4" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#c4956a" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#b76e79" stopOpacity="0.8" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
}
