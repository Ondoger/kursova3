/**
 * Analyzes GitHub stats and determines a "coding personality" archetype.
 * Returns a title, description, traits, and JP-styled flavor text.
 */

const ARCHETYPES = [
    {
        id: 'ronin',
        title: 'Ронін',
        titleJp: '浪人',
        emoji: '⚔️',
        description: 'Одинокий воїн коду. Мало зірок, мало фолловерів — але безперервна робота. Ти не шукаєш визнання, ти шукаєш досконалість.',
        color: '#b76e79',
        condition: (s, rpg) => rpg.STR >= 40 && rpg.CHA < 30 && rpg.LUK < 30,
    },
    {
        id: 'sensei',
        title: 'Сенсей',
        titleJp: '先生',
        emoji: '📜',
        description: 'Мудрий наставник. Багато мов, багато досвіду, твої репозиторії — це бібліотека знань для інших.',
        color: '#c4956a',
        condition: (s, rpg) => rpg.INT >= 60 && s.languagesCount >= 6 && s.totalStars >= 5,
    },
    {
        id: 'shinobi',
        title: 'Шінобі',
        titleJp: '忍',
        emoji: '🥷',
        description: 'Тіньовий кодер. Пишеш багато, але тихо. Величезна кількість коммітів, мінімум публічності.',
        color: '#4a3060',
        condition: (s, rpg) => rpg.STR >= 50 && rpg.CHA < 25 && s.totalCommits >= 200,
    },
    {
        id: 'daimyo',
        title: 'Даймьо',
        titleJp: '大名',
        emoji: '👑',
        description: 'Лорд open-source. Зірки, фолловери, форки — у тебе є справжній вплив у спільноті.',
        color: '#c4956a',
        condition: (s, rpg) => rpg.CHA >= 50 && rpg.LUK >= 40 && s.totalStars >= 20,
    },
    {
        id: 'samurai',
        title: 'Самурай',
        titleJp: '侍',
        emoji: '🗡️',
        description: 'Дисциплінований воїн. Тримаєш стрік, тримаєш слово. Кожен день — це бій, і ти ніколи не здаєшся.',
        color: '#b33a3a',
        condition: (s, rpg) => rpg.END >= 50 && s.longestStreak >= 14,
    },
    {
        id: 'miko',
        title: 'Міко',
        titleJp: '巫女',
        emoji: '⛩️',
        description: 'Хранитель коду. Все ідеально організовано, багато мов, структура та гармонія в кожному проєкті.',
        color: '#e8a0b4',
        condition: (s, rpg) => rpg.INT >= 40 && rpg.AGI >= 40 && s.languagesCount >= 4,
    },
    {
        id: 'tanuki',
        title: 'Тануки',
        titleJp: '狸',
        emoji: '🦝',
        description: 'Хитрий і різнобічний. Трішки того, трішки цього — експериментатор, який пробує все підряд.',
        color: '#7a9e7e',
        condition: (s, rpg) => s.languagesCount >= 5 && s.totalRepos >= 10 && rpg.STR < 50,
    },
    {
        id: 'kitsune',
        title: 'Кіцуне',
        titleJp: '狐',
        emoji: '🦊',
        description: 'Розумний і вправний. Мало коммітів, але кожен — точний і ефективний. PR-и замерджені, код чистий.',
        color: '#c4956a',
        condition: (s, rpg) => rpg.AGI >= 45 && rpg.INT >= 35 && s.prsMerged >= 3,
    },
];

// Fallback archetype
const GENIN = {
    id: 'genin',
    title: 'Генін',
    titleJp: '下忍',
    emoji: '🌱',
    description: 'Початківець на шляху коду. Кожен майстер колись був учнем — твоя подорож тільки починається!',
    color: '#7dd3fc',
};

export function analyzeCodingPersonality(stats, rpgStats) {
    if (!stats || !rpgStats) return GENIN;

    for (const arch of ARCHETYPES) {
        if (arch.condition(stats, rpgStats)) return arch;
    }
    return GENIN;
}

/**
 * Compute coding "traits" — short stat-based descriptors.
 */
export function computeTraits(stats) {
    const traits = [];

    if (stats.longestStreak >= 30) traits.push({ label: 'Незупинний', desc: `${stats.longestStreak}д стрік`, icon: '🔥' });
    else if (stats.longestStreak >= 7) traits.push({ label: 'Дисциплінований', desc: `${stats.longestStreak}д стрік`, icon: '📿' });

    if (stats.nightOwlCommits >= 10) traits.push({ label: 'Нічна сова', desc: `${stats.nightOwlCommits} нічних коммітів`, icon: '🌙' });
    if (stats.earlyBirdCommits >= 5) traits.push({ label: 'Ранній птах', desc: `${stats.earlyBirdCommits} ранніх коммітів`, icon: '🌅' });

    if (stats.languagesCount >= 8) traits.push({ label: 'Поліглот', desc: `${stats.languagesCount} мов`, icon: '🌐' });
    else if (stats.languagesCount >= 4) traits.push({ label: 'Мультимовний', desc: `${stats.languagesCount} мов`, icon: '📚' });

    if (stats.totalStars >= 50) traits.push({ label: 'Зірковий', desc: `${stats.totalStars} зірок`, icon: '⭐' });
    else if (stats.totalStars >= 10) traits.push({ label: 'Помічений', desc: `${stats.totalStars} зірок`, icon: '✨' });

    if (stats.prsMerged >= 20) traits.push({ label: 'PR Машина', desc: `${stats.prsMerged} злитих PR`, icon: '🔀' });
    else if (stats.prsMerged >= 5) traits.push({ label: 'Командний гравець', desc: `${stats.prsMerged} злитих PR`, icon: '🤝' });

    if (stats.totalCommits >= 2000) traits.push({ label: 'Легенда', desc: `${stats.totalCommits} коммітів`, icon: '🏯' });
    else if (stats.totalCommits >= 500) traits.push({ label: 'Ветеран', desc: `${stats.totalCommits} коммітів`, icon: '🎋' });
    else if (stats.totalCommits >= 100) traits.push({ label: 'Активіст', desc: `${stats.totalCommits} коммітів`, icon: '🌿' });

    if (stats.followers >= 100) traits.push({ label: 'Інфлюенсер', desc: `${stats.followers} фолловерів`, icon: '🏮' });

    // Account age
    const created = new Date(stats.user.created_at).getTime();
    const years = Math.floor((Date.now() - created) / (365.25 * 24 * 3600 * 1000));
    if (years >= 5) traits.push({ label: 'Старожил', desc: `${years} років на GitHub`, icon: '🏛️' });
    else if (years >= 2) traits.push({ label: 'Досвідчений', desc: `${years} р. на GitHub`, icon: '📅' });

    return traits.slice(0, 6);
}
