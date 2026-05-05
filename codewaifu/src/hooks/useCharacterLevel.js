import { useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { calculateXP, calculateLevel, xpProgress, getTierForLevel } from '../utils/gamification';
import { evaluateAchievements } from '../utils/achievements';
export function useCharacterLevel() {
    const stats = useStore((s) => s.stats);
    const lastSeenLevel = useStore((s) => s.lastSeenLevel);
    const setLastSeenLevel = useStore((s) => s.setLastSeenLevel);
    const unlockedAchievements = useStore((s) => s.unlockedAchievements);
    const setUnlocked = useStore((s) => s.setUnlocked);
    const triggerMood = useStore((s) => s.triggerMood);
    const data = useMemo(() => {
        if (!stats)
            return null;
        const xp = calculateXP(stats);
        const level = calculateLevel(xp);
        const progress = xpProgress(xp);
        const tier = getTierForLevel(level);
        return { xp, level, progress, tier };
    }, [stats]);
    // Detect level-up
    useEffect(() => {
        if (!data)
            return;
        if (data.level > lastSeenLevel) {
            triggerMood('levelup', 3500);
            setLastSeenLevel(data.level);
        }
    }, [data, lastSeenLevel, setLastSeenLevel, triggerMood]);
    // Detect newly unlocked achievements
    useEffect(() => {
        if (!stats)
            return;
        const evals = evaluateAchievements(stats);
        const ids = evals.filter((e) => e.unlocked).map((e) => e.achievement.id);
        const newOnes = ids.filter((id) => !unlockedAchievements.includes(id));
        if (newOnes.length > 0) {
            if (unlockedAchievements.length > 0)
                triggerMood('victory', 2400);
            setUnlocked(ids);
        }
        else if (ids.length !== unlockedAchievements.length) {
            setUnlocked(ids);
        }
    }, [stats, unlockedAchievements, setUnlocked, triggerMood]);
    return data;
}
