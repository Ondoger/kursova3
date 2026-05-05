export const calculateXP = (stats) => {
    return (stats.totalCommits * 10 +
        stats.currentStreak * 50 +
        stats.totalRepos * 100 +
        stats.totalStars * 25 +
        stats.languagesCount * 75 +
        stats.followers * 5 +
        stats.prsMerged * 60);
};
export const calculateLevel = (xp) => {
    const lvl = Math.floor(Math.sqrt(xp / 100)) + 1;
    return Math.min(100, Math.max(1, lvl));
};
export const xpForLevel = (level) => {
    // inverse of calculateLevel: xp = (level-1)^2 * 100
    return Math.pow(level - 1, 2) * 100;
};
export const xpProgress = (xp) => {
    const level = calculateLevel(xp);
    const currentLevelXP = xpForLevel(level);
    const nextLevelXP = xpForLevel(level + 1);
    const into = xp - currentLevelXP;
    const span = Math.max(1, nextLevelXP - currentLevelXP);
    return {
        level,
        currentLevelXP,
        nextLevelXP,
        into,
        span,
        percent: Math.min(100, Math.round((into / span) * 100)),
    };
};
export const CHARACTER_TIERS = [
    {
        min: 1,
        max: 10,
        name: 'Новачок',
        color: '#7dd3fc',
        accent: '#0ea5e9',
        hasAura: false,
        hasWings: false,
        hasParticles: false,
        description: 'Перші кроки в коді. Базовий стрій, спокійна анімація.',
    },
    {
        min: 11,
        max: 30,
        name: 'Учень',
        color: '#a78bfa',
        accent: '#7c3aed',
        hasAura: false,
        hasWings: false,
        hasParticles: true,
        description: 'Світіння волосся, новий колір строю, слабкі частинки.',
    },
    {
        min: 31,
        max: 60,
        name: 'Майстер',
        color: '#22d3ee',
        accent: '#06b6d4',
        hasAura: true,
        hasWings: false,
        hasParticles: true,
        description: 'Сяюча аура, активні частинки, посилені рухи.',
    },
    {
        min: 61,
        max: 100,
        name: 'Легенда',
        color: '#fbbf24',
        accent: '#f59e0b',
        hasAura: true,
        hasWings: true,
        hasParticles: true,
        description: 'Легендарний стрій, крила, драматичні ефекти.',
    },
];
export const getTierForLevel = (level) => {
    return (CHARACTER_TIERS.find((t) => level >= t.min && level <= t.max) ??
        CHARACTER_TIERS[0]);
};
export const computeRPGStats = (stats) => {
    const recentCommits = Object.values(stats.commitsByDay).reduce((a, b) => a + b, 0);
    const str = Math.min(100, Math.round(recentCommits * 1.5));
    const int = Math.min(100, stats.languagesCount * 12);
    const agi = Math.min(100, Math.round((stats.prsMerged * 8 + stats.prsOpened * 4) || stats.totalRepos * 4));
    const end = Math.min(100, stats.longestStreak * 4 + stats.currentStreak * 2);
    const luck = Math.min(100, stats.totalStars * 3 + stats.followers * 2);
    const cha = Math.min(100, stats.followers * 4 + stats.totalForks * 3);
    return { STR: str, INT: int, AGI: agi, END: end, LUK: luck, CHA: cha };
};
export const formatNumber = (n) => {
    if (n >= 1_000_000)
        return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)
        return (n / 1_000).toFixed(1) + 'K';
    return String(n);
};
