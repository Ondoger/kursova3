import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "../components/UI/GlassCard";
import { useAutoLoad } from "../hooks/useGitHub";
import { useStore } from "../store/useStore";
import { formatNumber } from "../utils/gamification";
import { getQuestEvaluations, QUEST_SHOP } from "../utils/quests";
import {
  BrushStroke,
  CloudDecoration,
  IchimatsuPattern,
  Lantern,
  SakuraBranch,
  WavePattern,
} from "../components/UI/JapaneseDecorations";

const CATEGORIES = [
  { id: "daily", label: "Денні", kanji: "日", note: "скидаються щодня" },
  {
    id: "weekly",
    label: "Тижневі",
    kanji: "週",
    note: "скидаються щопонеділка",
  },
  { id: "monthly", label: "Місячні", kanji: "月", note: "скидаються щомісяця" },
  { id: "global", label: "Глобальні", kanji: "永", note: "одноразові" },
];

export function QuestsPage() {
  useAutoLoad();

  const navigate = useNavigate();
  const username = useStore((s) => s.username);
  const stats = useStore((s) => s.stats);
  const loading = useStore((s) => s.loading);
  const refresh = useStore((s) => s.refresh);
  const coins = useStore((s) => s.coins);
  const claimedQuests = useStore((s) => s.claimedQuests);
  const claimQuest = useStore((s) => s.claimQuest);
  const ownedShopItems = useStore((s) => s.ownedShopItems);
  const activeTitleId = useStore((s) => s.activeTitleId);
  const buyShopItem = useStore((s) => s.buyShopItem);
  const equipShopItem = useStore((s) => s.equipShopItem);
  const [category, setCategory] = useState("daily");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!username) navigate("/");
  }, [username, navigate]);

  const quests = useMemo(() => getQuestEvaluations(stats), [stats]);
  const visibleQuests = quests.filter((quest) => quest.category === category);
  const completedCount = quests.filter((quest) => quest.completed).length;
  const claimedCount = quests.filter(
    (quest) => claimedQuests?.[quest.claimKey],
  ).length;
  const availableCoins = quests
    .filter((quest) => quest.completed && !claimedQuests?.[quest.claimKey])
    .reduce((sum, quest) => sum + quest.reward, 0);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  const handleClaim = (quest) => {
    if (!quest.completed || claimedQuests?.[quest.claimKey]) return;
    const ok = claimQuest(quest.claimKey, quest.reward);
    if (ok) showToast(`+${quest.reward} коінів · ${quest.title}`);
  };

  const handleBuy = (item) => {
    if (ownedShopItems.includes(item.id)) {
      equipShopItem(item.id);
      showToast(`${item.emoji} Титул екіповано: ${item.title}`);
      return;
    }

    const ok = buyShopItem(item);
    showToast(
      ok
        ? `${item.emoji} Куплено: ${item.title}`
        : "Не вистачає коінів. Йди муч GitHub 😤",
    );
  };

  if (!stats) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="h-[560px] rounded-2xl skeleton" />
      </div>
    );
  }

  return (
    <div className="relative max-w-7xl mx-auto px-6 py-6 space-y-6 overflow-hidden">
      <SakuraBranch className="fixed top-0 left-0 w-[240px] h-auto opacity-30 pointer-events-none z-0" />
      <CloudDecoration
        className="fixed top-[18%] right-[4%] w-[320px] pointer-events-none z-0"
        opacity={0.04}
      />
      <Lantern
        className="fixed top-24 right-12 pointer-events-none z-0 hidden lg:block"
        size={30}
      />

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-bg-900/90 border border-jp-sakura/25 text-sm text-white/80 font-jp shadow-[0_0_24px_rgba(232,160,180,0.18)]"
        >
          {toast}
        </motion.div>
      )}

      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden p-6"
      >
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: "url(/images/jp/torii.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center 45%",
            opacity: 0.08,
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-bg-900/95 via-bg-900/78 to-bg-900/95" />
        <IchimatsuPattern className="absolute inset-0 opacity-[0.025] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-jp-gold/60 font-jp flex items-center gap-2">
              <span className="text-jp-sakura/50">任</span>
              Квести за реальну GitHub-активність
            </p>
            <h1 className="font-calligraphy font-black text-4xl md:text-5xl mt-2 leading-tight">
              <span className="text-gradient-jp">Квести & Коіни</span>
            </h1>
            <p className="text-sm text-white/45 mt-2 max-w-2xl leading-relaxed">
              Виконуй завдання, отримуй коіни та відкривай титули для свого
              профілю.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 min-w-[280px]">
            <HeaderStat label="Баланс" value={formatNumber(coins)} kanji="硬" />
            <HeaderStat label="Готово" value={completedCount} kanji="済" />
            <HeaderStat label="Забрано" value={claimedCount} kanji="取" />
          </div>
        </div>
      </motion.section>

      <div className="grid xl:grid-cols-[1fr_360px] gap-6 relative z-10">
        <div className="space-y-4">
          <GlassCard
            glow="sakura"
            hoverable={false}
            className="relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h2 className="font-jp font-bold text-2xl neon-text-pink">
                  <span className="opacity-40 text-base mr-1">巻</span> Дошка
                  завдань
                </h2>
                <p className="text-sm text-white/40 mt-1">
                  Доступно до збору:{" "}
                  <span className="text-jp-gold font-bold">
                    {formatNumber(availableCoins)}
                  </span>{" "}
                  коінів
                </p>
              </div>
              <button
                onClick={() => refresh()}
                disabled={loading}
                className="btn-brush px-4 py-2 rounded-xl text-sm font-jp font-bold border border-jp-sakura/25 bg-jp-sakura/10 text-white/65 hover:text-white disabled:opacity-40 transition-all"
              >
                {loading ? "Оновлюю..." : "↻ Оновити GitHub"}
              </button>
            </div>

            <div className="grid md:grid-cols-4 gap-2 mb-4">
              {CATEGORIES.map((item) => {
                const isActive = category === item.id;
                const categoryQuests = quests.filter(
                  (quest) => quest.category === item.id,
                );
                const ready = categoryQuests.filter(
                  (quest) =>
                    quest.completed && !claimedQuests?.[quest.claimKey],
                ).length;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCategory(item.id)}
                    className={`relative rounded-xl border px-3 py-3 text-left transition-all ${
                      isActive
                        ? "bg-jp-sakura/10 border-jp-sakura/30 text-white"
                        : "bg-white/[0.025] border-white/5 text-white/45 hover:text-white/70 hover:border-jp-sakura/15"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-jp font-bold text-sm">
                        <span className="opacity-40 mr-1">{item.kanji}</span>
                        {item.label}
                      </span>
                      {ready > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-jp-gold/15 border border-jp-gold/25 text-jp-gold">
                          +{ready}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-white/30 mt-1">
                      {item.note}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              {visibleQuests.map((quest, index) => (
                <QuestCard
                  key={quest.claimKey}
                  quest={quest}
                  index={index}
                  claimed={Boolean(claimedQuests?.[quest.claimKey])}
                  onClaim={() => handleClaim(quest)}
                />
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard
            glow="gold"
            hoverable={false}
            className="relative overflow-hidden"
          >
            <CloudDecoration
              className="absolute -right-10 top-8 w-48 pointer-events-none opacity-50"
              opacity={0.05}
            />
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-jp-gold/45 font-jp">
                    Coin shop
                  </p>
                  <h2
                    className="font-jp font-bold text-2xl text-jp-gold"
                    style={{ textShadow: "0 0 10px rgba(196,149,106,0.35)" }}
                  >
                    <span className="opacity-40 text-base mr-1">店</span>{" "}
                    Магазин титулів
                  </h2>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/30 font-jp">Баланс</div>
                  <div className="font-jp font-bold text-xl text-gradient-jp">
                    {formatNumber(coins)}
                  </div>
                </div>
              </div>
              <BrushStroke
                className="w-full h-3 opacity-35 mb-4"
                color="#c4956a"
              />

              <div className="space-y-3">
                {QUEST_SHOP.map((item) => {
                  const owned = ownedShopItems.includes(item.id);
                  const active = activeTitleId === item.id;
                  const affordable = coins >= item.price;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-3 bg-white/[0.025] transition-all ${
                        active
                          ? "border-jp-sakura/35 shadow-[0_0_18px_rgba(232,160,180,0.12)]"
                          : "border-white/5"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-jp-gold/10 border border-jp-gold/20 flex items-center justify-center text-xl">
                          {item.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-jp font-bold text-sm text-white/80">
                              {item.title}
                            </h3>
                            <span className="text-[10px] text-jp-gold font-mono whitespace-nowrap">
                              {item.price} 硬
                            </span>
                          </div>
                          <p className="text-xs text-white/38 mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleBuy(item)}
                        disabled={!owned && !affordable}
                        className={`mt-3 w-full py-2 rounded-xl text-xs font-jp font-bold border transition-all ${
                          active
                            ? "bg-jp-sakura/12 border-jp-sakura/30 text-jp-sakura"
                            : owned
                              ? "bg-white/[0.035] border-white/8 text-white/55 hover:text-white/80"
                              : affordable
                                ? "btn-brush bg-jp-gold/10 border-jp-gold/25 text-white/70 hover:text-white"
                                : "bg-white/[0.02] border-white/5 text-white/25 cursor-not-allowed"
                        }`}
                      >
                        {active
                          ? "✓ Активний титул"
                          : owned
                            ? "Екіпірувати"
                            : affordable
                              ? "Купити"
                              : "Не вистачає коінів"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      <WavePattern
        className="w-full h-10 mt-6 opacity-60"
        color="#e8a0b4"
        opacity={0.03}
      />
    </div>
  );
}

function HeaderStat({ label, value, kanji }) {
  return (
    <div className="rounded-xl bg-white/[0.035] border border-white/5 px-3 py-2 text-center">
      <div className="text-[10px] text-jp-gold/35 font-jp mb-0.5">{kanji}</div>
      <div className="font-jp font-bold text-xl text-gradient-jp">{value}</div>
      <div className="text-[10px] text-white/35 uppercase tracking-widest">
        {label}
      </div>
    </div>
  );
}

function QuestCard({ quest, index, claimed, onClaim }) {
  const locked = !quest.completed;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`rounded-2xl border p-4 transition-all ${
        claimed
          ? "bg-jp-gold/[0.035] border-jp-gold/18 opacity-75"
          : quest.completed
            ? "bg-jp-sakura/[0.045] border-jp-sakura/18 shadow-[0_0_18px_rgba(232,160,180,0.08)]"
            : "bg-white/[0.025] border-white/5"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.035] border border-white/5 flex items-center justify-center text-2xl flex-shrink-0">
          {quest.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-jp font-bold text-white/85">{quest.title}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-jp-gold/10 border border-jp-gold/20 text-jp-gold font-mono">
              +{quest.reward} 硬
            </span>
            {claimed && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.035] border border-white/5 text-white/35 font-jp">
                забрано
              </span>
            )}
          </div>
          <p className="text-sm text-white/50 mt-1 leading-relaxed">
            {quest.description}
          </p>
          <p className="text-xs text-white/30 mt-1 leading-relaxed italic">
            {quest.funny}
          </p>

          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-white/35 font-mono mb-1">
              <span>{formatNumber(quest.value)}</span>
              <span>{formatNumber(quest.target)}</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${quest.percent}%` }}
                transition={{ duration: 0.85, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background: quest.completed
                    ? "linear-gradient(90deg, #c4956a, #e8a0b4)"
                    : "linear-gradient(90deg, rgba(196,149,106,0.35), rgba(232,160,180,0.35))",
                  boxShadow: quest.completed
                    ? "0 0 10px rgba(232,160,180,0.35)"
                    : "none",
                }}
              />
            </div>
          </div>
        </div>
        <button
          onClick={onClaim}
          disabled={locked || claimed}
          className={`md:w-32 py-2.5 px-4 rounded-xl text-xs font-jp font-bold border transition-all ${
            claimed
              ? "bg-white/[0.025] border-white/5 text-white/25 cursor-not-allowed"
              : locked
                ? "bg-white/[0.025] border-white/5 text-white/25 cursor-not-allowed"
                : "btn-brush bg-jp-sakura/10 border-jp-sakura/25 text-white/70 hover:text-white"
          }`}
        >
          {claimed ? "Забрано" : locked ? "Не готово" : "Забрати"}
        </button>
      </div>
    </motion.div>
  );
}
