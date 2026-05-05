import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, } from 'recharts';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
const LANG_COLORS = {
    TypeScript: '#3178c6',
    JavaScript: '#f7df1e',
    Python: '#3572A5',
    Go: '#00ADD8',
    Rust: '#dea584',
    Java: '#b07219',
    Kotlin: '#A97BFF',
    Swift: '#FA7343',
    C: '#555555',
    'C++': '#f34b7d',
    'C#': '#178600',
    Ruby: '#701516',
    PHP: '#4F5D95',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Vue: '#41b883',
    Shell: '#89e051',
    Dart: '#00B4AB',
    Lua: '#000080',
    Scala: '#c22d40',
    Haskell: '#5e5086',
    Elixir: '#6e4a7e',
};
const FALLBACK_PALETTE = [
    '#e8a0b4',
    '#c4956a',
    '#b76e79',
    '#4a7c59',
    '#d4a574',
    '#9e7b6b',
    '#c08090',
    '#7a9e7e',
];
function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LanguageChart() {
    const stats = useStore((s) => s.stats);
    const isByteData = stats?.languageSource === 'bytes';
    const data = useMemo(() => {
        if (!stats)
            return [];
        const arr = Object.entries(stats.languages)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
        return arr;
    }, [stats]);
    if (!data.length) {
        return (<div className="flex items-center justify-center h-48 text-white/40 text-sm">
        Немає даних про мови
      </div>);
    }
    const colorOf = (lang, idx) => LANG_COLORS[lang] ?? FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
    const total = data.reduce((a, b) => a + b.count, 0);
    return (<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
      <div className="h-56">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3} stroke="rgba(255,255,255,0.1)" animationDuration={1200}>
              {data.map((d, i) => (<Cell key={d.name} fill={colorOf(d.name, i)} style={{
                filter: `drop-shadow(0 0 6px ${colorOf(d.name, i)}aa)`,
            }}/>))}
            </Pie>
            <Tooltip contentStyle={{
            background: 'rgba(13,11,15,0.95)',
            border: '1px solid rgba(232,160,180,0.2)',
            borderRadius: 12,
            color: '#fff',
            backdropFilter: 'blur(12px)',
        }} formatter={(value, name) => {
            const pct = Math.round((Number(value) / total) * 100);
            const label = isByteData
                ? `${formatBytes(Number(value))} (${pct}%)`
                : `${value} репо (${pct}%)`;
            return [label, name];
        }}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        {data.map((d, i) => {
            const percent = Math.round((d.count / total) * 100);
            const color = colorOf(d.name, i);
            return (<motion.div key={d.name} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }}/>
                  <span className="font-medium">{d.name}</span>
                </span>
                <span className="text-white/50 font-mono">{percent}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 0.9, delay: i * 0.05, ease: 'easeOut' }} className="h-full rounded-full" style={{
                    background: `linear-gradient(90deg, ${color}, ${color}66)`,
                    boxShadow: `0 0 8px ${color}80`,
                }}/>
              </div>
            </motion.div>);
        })}
      </div>
    </div>);
}
