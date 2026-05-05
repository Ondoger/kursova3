const DAY_MS = 24 * 60 * 60 * 1000;

const toDayKey = (date) => date.toISOString().slice(0, 10);

function startOfUtcDay(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getWeekStart(date = new Date()) {
  const d = startOfUtcDay(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function countRange(commitsByDay = {}, startDate, days) {
  let total = 0;
  let activeDays = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setUTCDate(startDate.getUTCDate() + i);
    const count = commitsByDay[toDayKey(d)] ?? 0;
    total += count;
    if (count > 0) activeDays += 1;
  }
  return { total, activeDays };
}

function currentMonthRange(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS));
  return { start, days };
}

function progress(value, target) {
  return {
    value,
    target,
    percent: Math.min(100, Math.round((value / Math.max(1, target)) * 100)),
    completed: value >= target,
  };
}

export const QUEST_SHOP = [
  {
    id: 'title_sakura_debugger',
    type: 'title',
    title: 'Сакура Debugger',
    emoji: '🌸',
    price: 120,
    description: 'Ніжно дебажить, але console.log не пробачає.',
  },
  {
    id: 'title_night_tanuki',
    type: 'title',
    title: 'Нічний Танукі',
    emoji: '🦝',
    price: 160,
    description: 'Пушить після опівночі й робить вигляд, що так і треба.',
  },
  {
    id: 'title_no_spec_samurai',
    type: 'title',
    title: 'Кодить без ТЗ',
    emoji: '⚔️',
    price: 220,
    description: 'Коли задача звучить як “ну зроби красиво”.',
  },
  {
    id: 'title_capibara_sensei',
    type: 'title',
    title: 'Капібарний Сенсей',
    emoji: '🧘',
    price: 300,
    description: 'Не панікує навіть коли CI червоний третій день.',
  },
  {
    id: 'title_stackoverflow_ronin',
    type: 'title',
    title: 'Stack Overflow Ronin',
    emoji: '📜',
    price: 420,
    description: 'Мандрує між відповідями 2014 року й виживає.',
  },
  {
    id: 'title_production_yokai',
    type: 'title',
    title: 'Йокай Продакшену',
    emoji: '👺',
    price: 600,
    description: 'З’являється тільки після деплою і питає “а хто це зламав?”.',
  },
];

export function getQuestShopItem(id) {
  return QUEST_SHOP.find((item) => item.id === id) ?? null;
}

export function getActiveTitle(activeTitleId) {
  return getQuestShopItem(activeTitleId);
}

export function getQuestEvaluations(stats, now = new Date()) {
  if (!stats) return [];

  const today = startOfUtcDay(now);
  const todayKey = toDayKey(today);
  const yesterday = new Date(today);
  yesterday.setUTCDate(today.getUTCDate() - 1);
  const yesterdayKey = toDayKey(yesterday);
  const weekStart = getWeekStart(now);
  const month = currentMonthRange(now);

  const todayCommits = stats.commitsByDay?.[todayKey] ?? 0;
  const yesterdayCommits = stats.commitsByDay?.[yesterdayKey] ?? 0;
  const week = countRange(stats.commitsByDay, weekStart, 7);
  const monthStats = countRange(stats.commitsByDay, month.start, month.days);
  const weekendDays = [0, 6];
  const currentMonthWeekendActivity = Array.from({ length: month.days }, (_, index) => {
    const d = new Date(month.start);
    d.setUTCDate(month.start.getUTCDate() + index);
    return weekendDays.includes(d.getUTCDay()) && (stats.commitsByDay?.[toDayKey(d)] ?? 0) > 0;
  }).filter(Boolean).length;

  const commitsByHour = stats.commitsByHour ?? Array(24).fill(0);
  const midnightCommits = commitsByHour.slice(0, 4).reduce((sum, value) => sum + value, 0);
  const morningCommits = commitsByHour.slice(5, 9).reduce((sum, value) => sum + value, 0);

  const periodKeys = {
    daily: todayKey,
    weekly: toDayKey(weekStart),
    monthly: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
    global: 'forever',
  };

  const quests = [
    {
      id: 'daily_first_sakura',
      category: 'daily',
      title: 'Сакура-мікро-коміт',
      emoji: '🌸',
      reward: 20,
      description: 'Зроби хоча б 1 contribution сьогодні. Маленький коміт теж коміт, не соромся.',
      funny: 'Пелюстка впала — GitHub позеленів.',
      ...progress(todayCommits, 1),
    },
    {
      id: 'daily_second_braincell',
      category: 'daily',
      title: 'Друга жива клітина мозку',
      emoji: '🧠',
      reward: 35,
      description: 'Зроби 2+ contributions за день. Не геройствуй, просто не кидай після першого.',
      funny: 'Перша клітина відкрила IDE, друга натиснула commit.',
      ...progress(todayCommits, 2),
    },
    {
      id: 'daily_streak_soup',
      category: 'daily',
      title: 'Місо для streak',
      emoji: '🍜',
      reward: 30,
      description: 'Підтримай серію: активність має бути сьогодні та була вчора.',
      funny: 'Streak не їсть сам себе — його треба годувати.',
      ...progress(todayCommits > 0 && yesterdayCommits > 0 ? 1 : 0, 1),
    },
    {
      id: 'weekly_three_dojo_visits',
      category: 'weekly',
      title: 'Три візити в додзьо',
      emoji: '⛩️',
      reward: 90,
      description: 'Будь активним хоча б 3 різні дні цього тижня.',
      funny: 'Не обов’язково перемагати дракона. Просто приходь у зал.',
      ...progress(week.activeDays, 3),
    },
    {
      id: 'weekly_ten_green_dots',
      category: 'weekly',
      title: 'Зелений чай GitHub',
      emoji: '🍵',
      reward: 120,
      description: 'Набери 10 contributions за тиждень.',
      funny: 'Як матча, тільки замість порошку — коміти.',
      ...progress(week.total, 10),
    },
    {
      id: 'weekly_cleanup_goblin',
      category: 'weekly',
      title: 'Гоблін прибирання',
      emoji: '🧹',
      reward: 110,
      description: 'Відкрий issue або змерджи PR. Це рахується як “я не просто пушу в void”.',
      funny: 'Гоблін задоволений, backlog плаче.',
      ...progress((stats.issuesOpened ?? 0) + (stats.prsMerged ?? 0), 1),
    },
    {
      id: 'monthly_ten_active_days',
      category: 'monthly',
      title: 'Календарний ніндзя',
      emoji: '🥷',
      reward: 260,
      description: 'Будь активним 10 різних днів цього місяця.',
      funny: 'Тихо, регулярно, без пафосу. Як справжній ніндзя.',
      ...progress(monthStats.activeDays, 10),
    },
    {
      id: 'monthly_forty_contributions',
      category: 'monthly',
      title: 'Сорок зелених ронінів',
      emoji: '🟩',
      reward: 320,
      description: 'Набери 40 contributions за місяць.',
      funny: '47 ронінів було б канонічніше, але ми не монстри.',
      ...progress(monthStats.total, 40),
    },
    {
      id: 'monthly_weekend_gremlin',
      category: 'monthly',
      title: 'Вихідний ґремлін',
      emoji: '🧌',
      reward: 180,
      description: 'Зроби активність у 2 різні вихідні дні цього місяця.',
      funny: 'Не рекомендовано, але дуже впізнавано.',
      ...progress(currentMonthWeekendActivity, 2),
    },
    {
      id: 'global_repo_garden',
      category: 'global',
      title: 'Сад репозиторіїв',
      emoji: '🌱',
      reward: 150,
      description: 'Мати 5+ публічних репозиторіїв.',
      funny: 'Деякі квітнуть, деякі archived, але всі твої.',
      ...progress(stats.totalRepos ?? 0, 5),
    },
    {
      id: 'global_language_bento',
      category: 'global',
      title: 'Бенто зі стеків',
      emoji: '🍱',
      reward: 220,
      description: 'Мати активність у 3+ мовах. Без примусу писати Java, чесно.',
      funny: 'Трошки frontend, трошки backend, трошки “чому це YAML?”.',
      ...progress(stats.languagesCount ?? Object.keys(stats.languages ?? {}).length, 3),
    },
    {
      id: 'global_night_creature',
      category: 'global',
      title: 'Істота після опівночі',
      emoji: '🌙',
      reward: 180,
      description: 'Назбирай 5 комітів у проміжку 00:00–04:00 UTC.',
      funny: 'Сон для слабких, але все одно висипайся.',
      ...progress(midnightCommits, 5),
    },
    {
      id: 'global_morning_myth',
      category: 'global',
      title: 'Міфічний ранковий кодер',
      emoji: '🌅',
      reward: 180,
      description: 'Назбирай 5 комітів у проміжку 05:00–09:00 UTC.',
      funny: 'Кажуть, такі люди існують. GitHub підтвердить.',
      ...progress(morningCommits, 5),
    },
    {
      id: 'global_star_magnet',
      category: 'global',
      title: 'Магніт для зірочок',
      emoji: '⭐',
      reward: 260,
      description: 'Отримай 10+ stars сумарно по репозиторіях.',
      funny: 'Мама казала, що ти зірочка. GitHub нарешті погодився.',
      ...progress(stats.totalStars ?? 0, 10),
    },
    {
      id: 'global_100_commits',
      category: 'global',
      title: 'Сто маленьких катан',
      emoji: '🗡️',
      reward: 420,
      description: 'Набери 100 contributions.',
      funny: 'Один коміт — одна міні-катана в README серця.',
      ...progress(stats.totalCommits ?? 0, 100),
    },
  ];

  return quests.map((quest) => ({
    ...quest,
    periodKey: periodKeys[quest.category],
    claimKey: `${quest.id}:${periodKeys[quest.category]}`,
  }));
}
