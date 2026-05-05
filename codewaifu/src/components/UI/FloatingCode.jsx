import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { seededRandom } from '../../utils/random';
const SNIPPETS = [
    'const waifu = useGitHub();',
    'while(coding) { level++; }',
    'git commit -m "feat: power-up"',
    'await commit.push();',
    'function levelUp() { return hero; }',
    'export const xp = stats * 10;',
    'if (streak > 7) onFire();',
    '<Character glow="neon" />',
    'npm run dev',
    'git push origin main',
    'class Hero extends Coder {}',
    'return <Waifu level={99} />;',
    '// TODO: become legendary',
    'const stars = await getStars();',
    'commit && coffee',
];
export function FloatingCode({ count = 16 }) {
    const items = useMemo(() => {
        return Array.from({ length: count }, (_, i) => ({
            id: i,
            text: SNIPPETS[i % SNIPPETS.length],
            x: seededRandom(i + 1) * 100,
            y: seededRandom(i + 31) * 100,
            delay: seededRandom(i + 61) * 8,
            duration: 14 + seededRandom(i + 91) * 14,
            size: 11 + seededRandom(i + 121) * 5,
            opacity: 0.18 + seededRandom(i + 151) * 0.25,
            color: ['#00ffff', '#a855f7', '#ff00ff', '#10ffa5'][i % 4],
        }));
    }, [count]);
    return (<div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      {items.map((it) => (<motion.div key={it.id} className="absolute font-mono whitespace-nowrap" style={{
                left: `${it.x}%`,
                top: `${it.y}%`,
                color: it.color,
                fontSize: `${it.size}px`,
                opacity: it.opacity,
                textShadow: `0 0 8px ${it.color}`,
            }} initial={{ y: 30 }} animate={{ y: [-20, 20, -20] }} transition={{
                duration: it.duration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: it.delay,
            }}>
          {it.text}
        </motion.div>))}
    </div>);
}
