import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CodingRhythm } from "../components/Character/CodingRhythm";
import { ShareableCard } from "../components/Character/ShareableCard";
import { GlassCard } from "../components/UI/GlassCard";
import { useStore } from "../store/useStore";
import { useAutoLoad } from "../hooks/useGitHub";
import { useCharacterLevel } from "../hooks/useCharacterLevel";
import { formatNumber } from "../utils/gamification";
import { getActiveTitle } from "../utils/quests";
import {
  SakuraBranch,
  CloudDecoration,
  Lantern,
  WavePattern,
  BrushStroke,
  IchimatsuPattern,
} from "../components/UI/JapaneseDecorations";

export function CharacterPage() {
  useAutoLoad();

  const username = useStore((s) => s.username);
  const stats = useStore((s) => s.stats);
  const characterName = useStore((s) => s.characterName);
  const setCharacterName = useStore((s) => s.setCharacterName);
  const data = useCharacterLevel();
  const activeTitleId = useStore((s) => s.activeTitleId);
  const navigate = useNavigate();
  const [nameDraft, setNameDraft] = useState(characterName);

  useEffect(() => {
    if (!username) navigate("/");
  }, [username, navigate]);

  useEffect(() => {
    setNameDraft(characterName);
  }, [characterName]);

  const topLanguages = useMemo(() => {
    if (!stats?.languages) return [];
    return Object.entries(stats.languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name]) => name);
  }, [stats]);

  const activeTitle = useMemo(
    () => getActiveTitle(activeTitleId),
    [activeTitleId],
  );

  const summaryStats = useMemo(() => {
    if (!stats) return [];
    return [
      { label: "Коміти", value: stats.totalCommits, kanji: "献" },
      { label: "Репозиторії", value: stats.totalRepos, kanji: "庫" },
      { label: "Зірки", value: stats.totalStars, kanji: "星" },
      { label: "Стрік", value: stats.longestStreak, kanji: "火" },
    ];
  }, [stats]);

  const sessionPlan = useMemo(() => {
    if (!stats) return null;

    const hours = stats.commitsByHour ?? Array(24).fill(0);
    const maxHourValue = Math.max(0, ...hours);
    const peakHour = maxHourValue > 0 ? hours.indexOf(maxHourValue) : 19;
    const peakEndHour = (peakHour + 2) % 24;
    const formatHour = (hour) => `${String(hour).padStart(2, "0")}:00`;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const last14Days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() - index);
      return date.toISOString().slice(0, 10);
    });

    const activeDays = last14Days.filter(
      (day) => (stats.commitsByDay?.[day] ?? 0) > 0,
    ).length;
    const activePercent = Math.round((activeDays / 14) * 100);
    const currentStreak = stats.currentStreak ?? 0;

    let priority;
    let focus;
    let tone;

    if (currentStreak === 0) {
      priority = "Повернути streak";
      focus =
        "Зроби маленький, але завершений коміт: README, bugfix, refactor або одну закриту issue.";
      tone = "Сьогодні головне не обсяг, а повернути ритм.";
    } else if (activeDays < 5) {
      priority = "Стабілізувати графік";
      focus = "Заплануй 3 короткі сесії по 25–40 хв за наступні 7 днів.";
      tone = "У тебе вже є активність, але її варто зробити регулярнішою.";
    } else if (stats.prsOpened > stats.prsMerged + 2) {
      priority = "Закрити хвости";
      focus =
        "Візьми один відкритий PR або стару гілку й доведи її до merge/close.";
      tone = "Найбільший буст зараз — не новий старт, а завершення.";
    } else if (topLanguages.length > 0) {
      priority = `Поглибити ${topLanguages[0]}`;
      focus = `Зроби невелику фічу або refactor у проєкті на ${topLanguages[0]}, поки контекст ще свіжий.`;
      tone = "Краще посилити основний стек, ніж розпорошуватись.";
    } else {
      priority = "Почати з малого";
      focus =
        "Створи невеликий репозиторій або онови існуючий проєкт одним конкретним покращенням.";
      tone =
        "Навіть один якісний коміт уже дасть сторінці більше реальних даних.";
    }

    return {
      activeDays,
      activePercent,
      currentStreak,
      peakWindow: `${formatHour(peakHour)}–${formatHour(peakEndHour)}`,
      priority,
      focus,
      tone,
    };
  }, [stats, topLanguages]);

  if (!stats || !data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-[520px] rounded-2xl skeleton" />
          <div className="h-[520px] rounded-2xl skeleton" />
        </div>
      </div>
    );
  }

  const { level, xp, tier } = data;

  const saveName = () => {
    const cleanName = nameDraft.trim();
    if (cleanName && cleanName !== characterName) {
      setCharacterName(cleanName);
    }
  };

  return (
    <div className="relative max-w-7xl mx-auto px-6 py-6 space-y-6 overflow-hidden">
      {/* Decorative background */}
      <SakuraBranch className="fixed top-0 left-0 w-[240px] h-auto opacity-30 pointer-events-none z-0" />
      <CloudDecoration
        className="fixed top-[18%] right-[4%] w-[300px] pointer-events-none z-0"
        opacity={0.04}
      />
      <Lantern
        className="fixed top-24 right-12 pointer-events-none z-0 hidden lg:block"
        size={30}
      />

      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden p-6"
      >
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: "url(/images/jp/temple.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center 42%",
            opacity: 0.08,
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-bg-900/95 via-bg-900/80 to-bg-900/95" />
        <IchimatsuPattern className="absolute inset-0 opacity-[0.025] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <h1 className="font-calligraphy font-black text-4xl md:text-5xl leading-tight">
              <span className="text-gradient-jp">{characterName}</span>
            </h1>
            {activeTitle && (
              <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-jp-gold/[0.08] border border-jp-gold/20 text-jp-gold/80 font-jp text-sm">
                <span>{activeTitle.emoji}</span>
                <span>{activeTitle.title}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/5 text-white/45 font-mono">
              {formatNumber(xp)} XP
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/5 text-white/45 font-jp">
              @{stats.user.login}
            </span>
          </div>
        </div>
      </motion.section>

      <div className="grid lg:grid-cols-[0.92fr_1.08fr] gap-6 relative z-10">
        {/* Coding rhythm */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <GlassCard
            glow="sakura"
            hoverable={false}
            className="relative overflow-hidden h-full"
          >
            <CloudDecoration
              className="absolute -right-8 top-8 w-48 pointer-events-none opacity-50"
              opacity={0.05}
            />
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-jp-gold/45 font-jp">
                    時間分析
                  </p>
                  <h2 className="font-jp font-bold text-2xl neon-text mt-1">
                    <span className="opacity-40 text-base mr-1">時</span> Ритм
                    кодінгу
                  </h2>
                </div>
                <span className="text-3xl opacity-80">🏮</span>
              </div>
              <BrushStroke
                className="w-full h-3 opacity-35 mb-3"
                color="#b76e79"
              />
              <CodingRhythm />
            </div>
          </GlassCard>
        </motion.div>

        {/* Share card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
        >
          <GlassCard
            glow="gold"
            hoverable={false}
            className="relative overflow-hidden h-full"
          >
            <IchimatsuPattern className="absolute inset-0 opacity-[0.035] pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-jp-gold/45 font-jp">
                    Share ready
                  </p>
                  <h2
                    className="font-jp font-bold text-2xl text-jp-gold"
                    style={{ textShadow: "0 0 10px rgba(196,149,106,0.35)" }}
                  >
                    <span className="opacity-40 text-base mr-1">札</span> Картка
                    для шерингу
                  </h2>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveName();
                    }}
                    placeholder="Ім'я персонажа"
                    className="min-w-0 flex-1 md:w-56 px-3 py-2 rounded-lg bg-white/[0.04] border text-sm focus:outline-none transition-all font-jp text-white/80 placeholder:text-white/25"
                    style={{ borderColor: "rgba(232,160,180,0.15)" }}
                  />
                  <button
                    onClick={saveName}
                    disabled={
                      !nameDraft.trim() || nameDraft.trim() === characterName
                    }
                    className="btn-brush px-4 py-2 rounded-lg text-xs font-jp font-bold border border-jp-gold/30 bg-jp-gold/10 text-white/70 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Зберегти
                  </button>
                </div>
              </div>

              <BrushStroke className="w-full h-3 opacity-35" color="#c4956a" />

              <ShareableCard
                user={stats.user}
                characterName={characterName}
                level={level}
                tier={tier}
                xp={xp}
                topLanguages={topLanguages}
                summaryStats={summaryStats}
                activeTitle={activeTitle}
              />
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {sessionPlan && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="relative z-10"
        >
          <GlassCard
            glow="sakura"
            hoverable={false}
            className="relative overflow-hidden"
          >
            <CloudDecoration
              className="absolute -left-10 bottom-2 w-56 pointer-events-none opacity-40"
              opacity={0.045}
            />
            <div
              className="absolute right-6 top-6 text-7xl font-calligraphy text-jp-sakura/5 pointer-events-none"
              aria-hidden="true"
            >
              次
            </div>
            <div className="relative z-10 grid lg:grid-cols-[0.85fr_1.15fr] gap-6 items-center">
              <div>
                <p className="text-xs uppercase tracking-widest text-jp-gold/45 font-jp">
                  Next useful step
                </p>
                <h2 className="font-jp font-bold text-2xl neon-text-pink mt-1">
                  <span className="opacity-40 text-base mr-1">次</span> План
                  наступної сесії
                </h2>
                <p className="text-sm text-white/45 mt-2 leading-relaxed">
                  Автоматична підказка на основі твого ритму, streak і останньої
                  активності.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-widest text-white/30 font-jp mb-1">
                    Найкращий час
                  </div>
                  <div className="font-jp font-bold text-xl text-gradient-jp">
                    {sessionPlan.peakWindow}
                  </div>
                  <div className="text-xs text-white/35 mt-1">
                    за твоїм ритмом комітів
                  </div>
                </div>
                <div className="rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-widest text-white/30 font-jp mb-1">
                    Активність 14 днів
                  </div>
                  <div className="font-jp font-bold text-xl text-gradient-jp">
                    {sessionPlan.activeDays}/14
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mt-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${sessionPlan.activePercent}%` }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-jp-gold to-jp-sakura"
                    />
                  </div>
                </div>
                <div className="rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-widest text-white/30 font-jp mb-1">
                    Поточний streak
                  </div>
                  <div className="font-jp font-bold text-xl text-gradient-jp">
                    {sessionPlan.currentStreak} дн.
                  </div>
                  <div className="text-xs text-white/35 mt-1">
                    підтримай серію сьогодні
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 rounded-2xl bg-jp-sakura/[0.045] border border-jp-sakura/10 p-4">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="text-3xl">🎯</div>
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-widest text-jp-gold/45 font-jp">
                      Пріоритет
                    </div>
                    <h3 className="font-jp font-bold text-lg text-white/85 mt-1">
                      {sessionPlan.priority}
                    </h3>
                    <p className="text-sm text-white/55 mt-1 leading-relaxed">
                      {sessionPlan.focus}
                    </p>
                    <p className="text-xs text-white/35 mt-2 leading-relaxed">
                      {sessionPlan.tone}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.section>
      )}

      {/* Small plain summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
        {summaryStats.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 + i * 0.04 }}
            className="rounded-xl bg-white/[0.025] border border-white/5 px-4 py-3 text-center"
          >
            <div className="text-[10px] text-jp-gold/35 font-jp mb-0.5">
              {item.kanji}
            </div>
            <div className="font-jp font-bold text-xl text-gradient-jp">
              {formatNumber(item.value)}
            </div>
            <div className="text-xs text-white/35 uppercase tracking-widest">
              {item.label}
            </div>
          </motion.div>
        ))}
      </div>

      <WavePattern
        className="w-full h-10 mt-6 opacity-60"
        color="#e8a0b4"
        opacity={0.03}
      />
    </div>
  );
}
