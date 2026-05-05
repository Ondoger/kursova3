import { useMemo } from 'react';
import {
    Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useStore } from '../../store/useStore';

export function ActivityGraph() {
    const stats = useStore((s) => s.stats);
    const data = useMemo(() => {
        const months = [];
        const today = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = d.toISOString().slice(0, 7);
            const monthShort = d.toLocaleDateString('uk-UA', { month: 'short' });
            const count = stats?.commitsByMonth[key] ?? 0;
            months.push({ name: monthShort, key, commits: count });
        }
        return months;
    }, [stats]);

    return (
        <div className="h-64">
            <ResponsiveContainer>
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#e8a0b4" stopOpacity={0.8} />
                            <stop offset="50%" stopColor="#b76e79" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#c4956a" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="strokeActivity" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#c4956a" />
                            <stop offset="50%" stopColor="#e8a0b4" />
                            <stop offset="100%" stopColor="#b76e79" />
                        </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                    <XAxis
                        dataKey="name"
                        stroke="rgba(255,255,255,0.35)"
                        tick={{ fontSize: 11, fontFamily: '"Noto Serif JP", serif' }}
                        axisLine={{ stroke: 'rgba(232,160,180,0.1)' }}
                    />
                    <YAxis
                        stroke="rgba(255,255,255,0.35)"
                        tick={{ fontSize: 11, fontFamily: '"Noto Serif JP", serif' }}
                        axisLine={{ stroke: 'rgba(232,160,180,0.1)' }}
                        width={32}
                    />
                    <Tooltip
                        contentStyle={{
                            background: 'rgba(13,11,15,0.95)',
                            border: '1px solid rgba(232,160,180,0.25)',
                            borderRadius: 12,
                            color: '#fff',
                            backdropFilter: 'blur(12px)',
                        }}
                        labelStyle={{ color: '#e8a0b4', fontFamily: '"Noto Serif JP", serif' }}
                        formatter={(v) => [`${v} коммітів`, '']}
                    />
                    <Area
                        type="monotone"
                        dataKey="commits"
                        stroke="url(#strokeActivity)"
                        strokeWidth={3}
                        fill="url(#colorActivity)"
                        animationDuration={1400}
                        dot={{ stroke: '#e8a0b4', fill: '#0d0b0f', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#b76e79', fill: '#0d0b0f' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
