import { motion } from "framer-motion";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { VideoCharacter } from "../components/Character/VideoCharacter";
import { StatsCards } from "../components/Dashboard/StatsCards";
import { CommitHeatmap } from "../components/Dashboard/CommitHeatmap";
import { LanguageChart } from "../components/Dashboard/LanguageChart";
import { ActivityGraph } from "../components/Dashboard/ActivityGraph";
import { Leaderboard } from "../components/Dashboard/Leaderboard";
import { TopRepos } from "../components/Dashboard/TopRepos";
import { useStore } from "../store/useStore";
import { useAutoLoad } from "../hooks/useGitHub";
import { useCharacterLevel } from "../hooks/useCharacterLevel";
import { evaluateAchievements } from "../utils/achievements";
import { GlassCard } from "../components/UI/GlassCard";
import { AnimatedNumber } from "../components/UI/AnimatedNumber";
import {
  SakuraBranch,
  CloudDecoration,
  Lantern,
  WavePattern,
  IchimatsuPattern,
} from "../components/UI/JapaneseDecorations";

export function Dashboard() {
  useAutoLoad();
  const username = useStore((s) => s.username);
  const stats = useStore((s) => s.stats);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.error);
  const characterName = useStore((s) => s.characterName);
  const data = useCharacterLevel();
  const navigate = useNavigate();

  useEffect(() => {
    if (!username) navigate("/");
  }, [username, navigate]);

  if (!stats) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[minmax(320px,30%)_1fr] gap-6">
          <div className="h-[60vh] rounded-2xl skeleton" />
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl skeleton" />
              ))}
            </div>
            <div className="h-48 rounded-2xl skeleton" />
            <div className="h-64 rounded-2xl skeleton" />
          </div>
        </div>
        {loading && (
          <div className="text-center mt-6 text-white/50 font-jp">
            Завантажуємо GitQuest...
          </div>
        )}
        {error && <div className="mt-6 text-center text-jp-red">{error}</div>}
      </div>
    );
  }

  const evals = evaluateAchievements(stats);
  const unlockedCount = evals.filter((e) => e.unlocked).length;

  return (
    <div className="relative max-w-7xl mx-auto px-6 py-6 space-y-6 overflow-hidden">
      {/* ── Decorative elements ────────────────────────────── */}
      <SakuraBranch className="fixed top-0 left-0 w-[280px] h-auto opacity-40 pointer-events-none z-0" />
      <SakuraBranch
        className="fixed top-0 right-0 w-[220px] h-auto opacity-30 pointer-events-none z-0"
        flip
      />
      <CloudDecoration
        className="fixed top-[15%] right-[5%] w-[300px] pointer-events-none z-0"
        opacity={0.04}
      />
      <CloudDecoration
        className="fixed top-[60%] left-[2%] w-[250px] pointer-events-none z-0"
        opacity={0.03}
      />
      <Lantern
        className="fixed top-20 right-16 pointer-events-none z-0 hidden lg:block"
        size={32}
      />
      <Lantern
        className="fixed top-32 right-8 pointer-events-none z-0 hidden lg:block"
        size={24}
      />

      {/* ── Header with background image ─────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden p-6"
      >
        {/* Background image */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: "url(/images/jp/sakura.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center 30%",
            opacity: 0.08,
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-bg-900/90 via-bg-900/70 to-bg-900/90" />

        <div className="flex items-end justify-between gap-4 flex-wrap relative z-10">
          <div>
            <p className="text-xs uppercase tracking-widest text-jp-gold/60 font-jp flex items-center gap-2">
              <span className="text-jp-sakura/40">桜</span>
              Привіт, {stats.user.name ?? stats.user.login}
            </p>
            <h1 className="font-jp font-black text-3xl md:text-4xl mt-1">
              <span className="text-gradient-jp font-calligraphy">
                {characterName}
              </span>
            </h1>
          </div>
          {data && (
            <div className="text-right">
              <div className="text-xs text-jp-gold/50 uppercase tracking-widest font-jp">
                経験値 XP
              </div>
              <div className="font-jp text-2xl font-bold text-gradient-jp">
                <AnimatedNumber value={data.xp} format="compact" />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-[minmax(320px,30%)_1fr] gap-6 relative z-10">
        {/* ── LEFT: Character ──────────────────────────── */}
        <div className="space-y-4">
          <VideoCharacter height="50vh" />

          {/* Level + XP bar */}
          {data && (
            <GlassCard glow="sakura">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/40 font-jp">
                    <span className="text-jp-sakura/30 mr-1">級</span> Рівень
                  </div>
                  <div className="font-jp font-black text-3xl text-gradient-jp">
                    {data.level}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-widest text-white/40 font-jp">
                    Тір
                  </div>
                  <div
                    className="font-jp font-bold text-lg"
                    style={{
                      color: data.tier.color,
                      textShadow: `0 0 8px ${data.tier.color}40`,
                    }}
                  >
                    {data.tier.name}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-white/40 font-mono">
                  <span>{data.progress.into} XP</span>
                  <span>
                    {data.progress.span} XP до Lvl {data.level + 1}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${data.progress.percent}%` }}
                    transition={{ duration: 1.4, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg, #c4956a, #e8a0b4, #b76e79)",
                      boxShadow:
                        "0 0 12px rgba(232,160,180,0.5), 0 0 24px rgba(196,149,106,0.3)",
                      backgroundSize: "200% 100%",
                      animation: "gradientX 4s linear infinite",
                    }}
                  />
                </div>
                <div className="text-[11px] text-white/50 mt-2 leading-snug">
                  {data.tier.description}
                </div>
              </div>
            </GlassCard>
          )}

          {/* Achievements mini */}
          <GlassCard glow="gold">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-jp font-bold text-sm uppercase tracking-widest text-jp-gold">
                <span className="opacity-40 mr-1">功</span> Ачівменти
              </h3>
              <span className="text-xs text-white/40">
                {unlockedCount} / {evals.length}
              </span>
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {evals.map((e) => (
                <div
                  key={e.achievement.id}
                  title={`${e.achievement.title}  ${e.achievement.description}`}
                  className={`aspect-square rounded-md flex items-center justify-center text-sm transition-all ${
                    e.unlocked
                      ? "bg-jp-sakura/15 border border-jp-sakura/30 shadow-[0_0_8px_rgba(232,160,180,0.3)]"
                      : "bg-white/5 border border-white/5 grayscale opacity-50"
                  }`}
                >
                  {e.achievement.icon && (
                    <img
                      src={e.achievement.icon}
                      alt={e.achievement.title}
                      className={`w-full h-full rounded-[4px] object-cover ${
                        e.unlocked ? "" : "opacity-50"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate("/achievements")}
              className="text-xs text-jp-sakura hover:text-white mt-3 inline-flex items-center gap-1 transition-colors font-jp"
            >
              Дивитись усі →
            </button>
          </GlassCard>
        </div>

        {/* ── RIGHT: Stats ────────────────────────────── */}
        <div className="space-y-6">
          <StatsCards />

          {/* Heatmap with torii background accent */}
          <GlassCard
            glow="sakura"
            hoverable={false}
            className="relative overflow-hidden"
          >
            <div
              className="absolute right-4 bottom-2 w-20 h-28 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: "url(/images/jp/torii.jpg)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                maskImage: "linear-gradient(to top, black, transparent)",
                WebkitMaskImage: "linear-gradient(to top, black, transparent)",
              }}
            />
            <CommitHeatmap />
          </GlassCard>

          <div className="grid lg:grid-cols-2 gap-6">
            <GlassCard
              glow="gold"
              hoverable={false}
              className="relative overflow-hidden"
            >
              <IchimatsuPattern className="absolute inset-0 opacity-[0.04] pointer-events-none" />
              <div className="relative z-10">
                <h3 className="font-jp font-bold text-lg neon-text mb-3">
                  <span className="opacity-40 text-sm mr-1">活</span> Активність
                  <span className="text-white/30 text-xs ml-2">
                    останні 12 міс
                  </span>
                </h3>
                <ActivityGraph />
              </div>
            </GlassCard>
            <GlassCard
              glow="sakura"
              hoverable={false}
              className="relative overflow-hidden"
            >
              <IchimatsuPattern className="absolute inset-0 opacity-[0.03] pointer-events-none" />
              <div className="relative z-10">
                <h3 className="font-jp font-bold text-lg neon-text-pink mb-3">
                  <span className="opacity-40 text-sm mr-1">語</span> Мови
                  програмування
                </h3>
                <LanguageChart />
              </div>
            </GlassCard>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <GlassCard
              glow="gold"
              hoverable={false}
              className="relative overflow-hidden"
            >
              <div
                className="absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.04] pointer-events-none rounded-full"
                style={{
                  backgroundImage: "url(/images/jp/koi.jpg)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <h3 className="font-jp font-bold text-lg mb-3">
                <span
                  className="text-jp-gold"
                  style={{ textShadow: "0 0 10px rgba(196,149,106,0.5)" }}
                >
                  <span className="opacity-40 text-sm mr-1">庫</span>{" "}
                  Топ-репозиторії
                </span>
              </h3>
              <TopRepos />
            </GlassCard>
            <GlassCard
              glow="sakura"
              hoverable={false}
              className="relative overflow-hidden"
            >
              <div
                className="absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.03] pointer-events-none rounded-full"
                style={{
                  backgroundImage: "url(/images/jp/fuji.jpg)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <h3 className="font-jp font-bold text-lg neon-text mb-3">
                <span className="opacity-40 text-sm mr-1">界</span> Світовий
                лідерборд
              </h3>
              <Leaderboard />
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Bottom wave decoration */}
      <WavePattern
        className="w-full h-12 mt-8 opacity-60"
        color="#c4956a"
        opacity={0.04}
      />
    </div>
  );
}
