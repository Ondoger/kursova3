import { motion } from "framer-motion";
import { useMemo } from "react";
import { seededRandom } from "../../utils/random";

const SNIPPETS = [
  "const stats = await fetch('/api/user');",
  "while (coding) { commits++; }",
  "git commit -m 'feat: ship it'",
  "await commit.push();",
  "function levelUp() { return xp + 1; }",
  "export const xp = stats * 10;",
  "if (streak > 7) onFire();",
  "<Profile level={99} />",
  "npm run dev",
  "git push origin main",
  "class Hero extends Coder {}",
  "return <Stats data={user} />;",
  "// TODO: become legendary",
  "const stars = await getStars();",
  "commit && coffee",
];

// Subtle GitHub-style monochrome floating code — used as a soft background
// behind hero sections. No neon glow.
export function FloatingCode({ count = 16 }) {
  const items = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      text: SNIPPETS[i % SNIPPETS.length],
      x: seededRandom(i + 1) * 100,
      y: seededRandom(i + 31) * 100,
      delay: seededRandom(i + 61) * 8,
      duration: 14 + seededRandom(i + 91) * 14,
      size: 11 + seededRandom(i + 121) * 4,
      opacity: 0.06 + seededRandom(i + 151) * 0.08,
    }));
  }, [count]);

  return (
    <div
      className="absolute inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden
    >
      {items.map((it) => (
        <motion.div
          key={it.id}
          className="absolute font-mono whitespace-nowrap text-gh-muted"
          style={{
            left: `${it.x}%`,
            top: `${it.y}%`,
            fontSize: `${it.size}px`,
            opacity: it.opacity,
          }}
          initial={{ y: 30 }}
          animate={{ y: [-20, 20, -20] }}
          transition={{
            duration: it.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: it.delay,
          }}
        >
          {it.text}
        </motion.div>
      ))}
    </div>
  );
}
