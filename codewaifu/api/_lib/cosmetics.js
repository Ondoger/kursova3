export const COSMETIC_CATALOG = [
  {
    id: "title-code-samurai",
    type: "title",
    title: "Code Samurai",
    description: "Титул для тих, хто ріже баги без жалю.",
    cost: 0,
    payload: { title: "Code Samurai", emoji: "⚔️", color: "#d29922" },
  },
  {
    id: "title-bug-hunter",
    type: "title",
    title: "Bug Hunter",
    description: "Для мисливців на баги й edge cases.",
    cost: 120,
    payload: { title: "Bug Hunter", emoji: "🐞", color: "#f85149" },
  },
  {
    id: "title-readme-master",
    type: "title",
    title: "README Master",
    description: "Коли документація не на останньому місці.",
    cost: 160,
    payload: { title: "README Master", emoji: "📘", color: "#58a6ff" },
  },
  {
    id: "banner-neon-ocean",
    type: "banner",
    title: "Neon Ocean",
    description: "Синій tech-банер для профілю.",
    cost: 0,
    payload: {
      label: "Neon Ocean",
      bannerStyle: "linear-gradient(135deg,#1f6feb 0%,#161b22 55%,#0d1117 100%)",
    },
  },
  {
    id: "banner-forest-xp",
    type: "banner",
    title: "Forest XP",
    description: "Зелений банер для стабільного грінду.",
    cost: 140,
    payload: {
      label: "Forest XP",
      bannerStyle: "linear-gradient(135deg,#238636 0%,#161b22 55%,#0d1117 100%)",
    },
  },
  {
    id: "banner-purple-rank",
    type: "banner",
    title: "Purple Rank",
    description: "Фіолетовий банер для топів leaderboard.",
    cost: 180,
    payload: {
      label: "Purple Rank",
      bannerStyle: "linear-gradient(135deg,#6e40c9 0%,#1f2733 55%,#0d1117 100%)",
    },
  },
  {
    id: "frame-cyan",
    type: "frame",
    title: "Cyan Frame",
    description: "Неонова рамка аватарки.",
    cost: 80,
    payload: { label: "Cyan Frame", frameColor: "#58a6ff", color: "#58a6ff" },
  },
  {
    id: "frame-gold",
    type: "frame",
    title: "Gold Frame",
    description: "Золота рамка для легенд курсу.",
    cost: 220,
    payload: { label: "Gold Frame", frameColor: "#d29922", color: "#d29922" },
  },
  {
    id: "accent-green",
    type: "accent",
    title: "Success Green",
    description: "Зелений акцент для статусу й деталей.",
    cost: 60,
    payload: { label: "Success Green", accentColor: "#3fb950", color: "#3fb950" },
  },
  {
    id: "accent-pink",
    type: "accent",
    title: "Hot Pink",
    description: "Яскравий акцент для профілю.",
    cost: 100,
    payload: { label: "Hot Pink", accentColor: "#ff7bcb", color: "#ff7bcb" },
  },
];

export function getCosmetic(id) {
  return COSMETIC_CATALOG.find((item) => item.id === id) ?? null;
}

export function publicCosmetic(item, ownedIds = []) {
  if (!item) return null;
  return {
    ...item,
    owned: ownedIds.includes(item.id),
  };
}
