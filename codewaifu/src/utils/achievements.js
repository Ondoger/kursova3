export const ACHIEVEMENTS = [
    {
        id: 'first-blood',
        title: 'First Blood',
        description: 'Перший комміт у житті',
        icon: '/achievements/first-blood.svg',
        rarity: 'common',
        check: (s) => s.totalCommits >= 1,
        progress: (s) => ({ current: Math.min(1, s.totalCommits), goal: 1 }),
    },
    {
        id: 'century',
        title: 'Century',
        description: '100 коммітів  ти серйозно взявся',
        icon: '/achievements/century.svg',
        rarity: 'rare',
        check: (s) => s.totalCommits >= 100,
        progress: (s) => ({ current: Math.min(100, s.totalCommits), goal: 100 }),
    },
    {
        id: 'millennium',
        title: 'Millennium',
        description: '1000 коммітів  справжній код-наркоман',
        icon: '/achievements/millennium.svg',
        rarity: 'legendary',
        check: (s) => s.totalCommits >= 1000,
        progress: (s) => ({ current: Math.min(1000, s.totalCommits), goal: 1000 }),
    },
    {
        id: 'on-fire',
        title: 'On Fire',
        description: 'Стрік 7 днів поспіль',
        icon: '/achievements/on-fire.svg',
        rarity: 'rare',
        check: (s) => s.currentStreak >= 7 || s.longestStreak >= 7,
        progress: (s) => ({
            current: Math.min(7, Math.max(s.currentStreak, s.longestStreak)),
            goal: 7,
        }),
    },
    {
        id: 'unstoppable',
        title: 'Unstoppable',
        description: 'Стрік 30 днів поспіль  машина',
        icon: '/achievements/unstoppable.svg',
        rarity: 'epic',
        check: (s) => s.currentStreak >= 30 || s.longestStreak >= 30,
        progress: (s) => ({
            current: Math.min(30, Math.max(s.currentStreak, s.longestStreak)),
            goal: 30,
        }),
    },
    {
        id: 'polyglot',
        title: 'Polyglot',
        description: '5+ мов програмування',
        icon: '/achievements/polyglot.svg',
        rarity: 'rare',
        check: (s) => s.languagesCount >= 5,
        progress: (s) => ({ current: Math.min(5, s.languagesCount), goal: 5 }),
    },
    {
        id: 'language-master',
        title: 'Language Master',
        description: 'Одна мова домінує (>60% коду)',
        icon: '/achievements/language-master.svg',
        rarity: 'rare',
        check: (s) => {
            const total = Object.values(s.languages).reduce((a, b) => a + b, 0);
            if (!total)
                return false;
            return Object.values(s.languages).some((v) => v / total >= 0.6);
        },
    },
    {
        id: 'open-source-hero',
        title: 'Open Source Hero',
        description: '5+ публічних репозиторіїв',
        icon: '/achievements/open-source-hero.svg',
        rarity: 'common',
        check: (s) => s.publicRepos >= 5,
        progress: (s) => ({ current: Math.min(5, s.publicRepos), goal: 5 }),
    },
    {
        id: 'star-collector',
        title: 'Star Collector',
        description: '10+ зірок на репозиторіях',
        icon: '/achievements/star-collector.svg',
        rarity: 'rare',
        check: (s) => s.totalStars >= 10,
        progress: (s) => ({ current: Math.min(10, s.totalStars), goal: 10 }),
    },
    {
        id: 'supernova',
        title: 'Supernova',
        description: '100+ зірок  справжня зірка',
        icon: '/achievements/supernova.svg',
        rarity: 'epic',
        check: (s) => s.totalStars >= 100,
        progress: (s) => ({ current: Math.min(100, s.totalStars), goal: 100 }),
    },
    {
        id: 'night-owl',
        title: 'Night Owl',
        description: 'Комміти з 00:00 до 04:00',
        icon: '/achievements/night-owl.svg',
        rarity: 'epic',
        check: (s) => s.nightOwlCommits >= 5,
        progress: (s) => ({ current: Math.min(5, s.nightOwlCommits), goal: 5 }),
    },
    {
        id: 'early-bird',
        title: 'Early Bird',
        description: 'Комміти з 05:00 до 08:00',
        icon: '/achievements/early-bird.svg',
        rarity: 'rare',
        check: (s) => s.earlyBirdCommits >= 3,
        progress: (s) => ({ current: Math.min(3, s.earlyBirdCommits), goal: 3 }),
    },
    {
        id: 'pull-master',
        title: 'Pull Master',
        description: '10+ змерджених PR-ів',
        icon: '/achievements/pull-master.svg',
        rarity: 'epic',
        check: (s) => s.prsMerged >= 10,
        progress: (s) => ({ current: Math.min(10, s.prsMerged), goal: 10 }),
    },
    {
        id: 'social-coder',
        title: 'Social Coder',
        description: '50+ фолловерів',
        icon: '/achievements/social-coder.svg',
        rarity: 'epic',
        check: (s) => s.followers >= 50,
        progress: (s) => ({ current: Math.min(50, s.followers), goal: 50 }),
    },
    {
        id: 'fork-lord',
        title: 'Fork Lord',
        description: 'Твої проєкти форкнули 10+ разів',
        icon: '/achievements/fork-lord.svg',
        rarity: 'rare',
        check: (s) => s.totalForks >= 10,
        progress: (s) => ({ current: Math.min(10, s.totalForks), goal: 10 }),
    },
    {
        id: 'veteran',
        title: 'Veteran',
        description: '5+ років на GitHub',
        icon: '/achievements/veteran.svg',
        rarity: 'epic',
        check: (s) => {
            const created = new Date(s.user.created_at).getTime();
            const years = (Date.now() - created) / (365.25 * 24 * 3600 * 1000);
            return years >= 5;
        },
    },
];
export const evaluateAchievements = (stats) => {
    return ACHIEVEMENTS.map((a) => ({
        achievement: a,
        unlocked: a.check(stats),
        progress: a.progress?.(stats),
    }));
};
export const RARITY_COLORS = {
    common: { from: '#94a3b8', to: '#475569', ring: 'rgba(148,163,184,0.5)' },
    rare: { from: '#22d3ee', to: '#0ea5e9', ring: 'rgba(34,211,238,0.6)' },
    epic: { from: '#a855f7', to: '#7c3aed', ring: 'rgba(168,85,247,0.7)' },
    legendary: { from: '#fbbf24', to: '#f59e0b', ring: 'rgba(251,191,36,0.8)' },
};
