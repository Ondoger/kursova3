import { motion } from "framer-motion";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "../components/UI/GlassCard";
import { useAutoLoad } from "../hooks/useGitHub";
import { useCharacterLevel } from "../hooks/useCharacterLevel";
import { useStore } from "../store/useStore";
import { formatNumber } from "../utils/gamification";
import { getActiveTitle } from "../utils/quests";
import {
  BrushStroke,
  CloudDecoration,
  IchimatsuPattern,
  SakuraBranch,
  WavePattern,
} from "../components/UI/JapaneseDecorations";

const BANNERS = [
  {
    id: "sakura",
    label: "Sakura night",
    image: "/images/jp/sakura.jpg",
    gradient: "from-jp-sakura/20 via-bg-900/70 to-bg-900/90",
  },
  {
    id: "temple",
    label: "Temple calm",
    image: "/images/jp/temple.jpg",
    gradient: "from-jp-gold/20 via-bg-900/72 to-bg-900/90",
  },
  {
    id: "fuji",
    label: "Fuji focus",
    image: "/images/jp/fuji.jpg",
    gradient: "from-blue-300/10 via-bg-900/72 to-bg-900/90",
  },
  {
    id: "koi",
    label: "Koi chaos",
    image: "/images/jp/koi.jpg",
    gradient: "from-jp-red/15 via-bg-900/72 to-bg-900/90",
  },
];

const ACCENTS = [
  "#e8a0b4",
  "#c4956a",
  "#b76e79",
  "#4a7c59",
  "#7dd3fc",
  "#a78bfa",
];

export function ProfilePage() {
  useAutoLoad();

  const navigate = useNavigate();
  const username = useStore((s) => s.username);
  const stats = useStore((s) => s.stats);
  const characterName = useStore((s) => s.characterName);
  const coins = useStore((s) => s.coins);
  const activeTitleId = useStore((s) => s.activeTitleId);
  const profile = useStore((s) => s.profileCustomization);
  const updateProfile = useStore((s) => s.updateProfileCustomization);
  const data = useCharacterLevel();

  useEffect(() => {
    if (!username) navigate("/");
  }, [username, navigate]);

  const activeTitle = useMemo(
    () => getActiveTitle(activeTitleId),
    [activeTitleId],
  );
  const banner =
    BANNERS.find((item) => item.id === profile.bannerStyle) ?? BANNERS[0];
  const topLanguages = useMemo(() => {
    if (!stats?.languages) return [];
    return Object.entries(stats.languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  }, [stats]);

  if (!stats || !data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="h-[580px] rounded-2xl skeleton" />
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

      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden p-6"
      >
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: `url(${banner.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center 42%",
            opacity: 0.1,
          }}
        />
        <div
          className={`absolute inset-0 -z-10 bg-gradient-to-r ${banner.gradient}`}
        />
        <IchimatsuPattern className="absolute inset-0 opacity-[0.025] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-jp-gold/60 font-jp flex items-center gap-2">
              <span className="text-jp-sakura/50">名</span>
              Оформлення власного профілю
            </p>
            <h1 className="font-calligraphy font-black text-4xl md:text-5xl mt-2 leading-tight">
              <span className="text-gradient-jp">Мій профіль</span>
            </h1>
            <p className="text-sm text-white/45 mt-2 max-w-2xl leading-relaxed">
              Налаштуй свій соціальний вигляд: статус, опис, стек, банер і
              колір. Це використовується у твоєму локальному профілі та для
              презентації друзям.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 min-w-[280px]">
            <MiniStat label="Level" value={data.level} kanji="級" />
            <MiniStat label="Коіни" value={formatNumber(coins)} kanji="硬" />
            <MiniStat label="Мови" value={topLanguages.length} kanji="語" />
          </div>
        </div>
      </motion.section>

      <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6 relative z-10">
        <GlassCard
          glow="sakura"
          hoverable={false}
          className="relative overflow-hidden"
        >
          <div className="relative z-10 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-jp-gold/45 font-jp">
                Profile editor
              </p>
              <h2 className="font-jp font-bold text-2xl neon-text-pink mt-1">
                <span className="opacity-40 text-base mr-1">筆</span>{" "}
                Налаштування
              </h2>
            </div>
            <BrushStroke className="w-full h-3 opacity-35" color="#b76e79" />

            <Field label="Статус">
              <input
                value={profile.status}
                onChange={(e) => updateProfile({ status: e.target.value })}
                maxLength={80}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 focus:outline-none focus:border-jp-sakura/40 text-sm text-white/80 placeholder:text-white/25"
              />
            </Field>

            <Field label="Про себе">
              <textarea
                value={profile.bio}
                onChange={(e) => updateProfile({ bio: e.target.value })}
                maxLength={220}
                rows={4}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 focus:outline-none focus:border-jp-sakura/40 text-sm text-white/80 placeholder:text-white/25 resize-none"
              />
            </Field>

            <Field label="Улюблений стек" hint="що хочеш показати людям">
              <input
                value={profile.favoriteStack}
                onChange={(e) =>
                  updateProfile({ favoriteStack: e.target.value })
                }
                maxLength={90}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 focus:outline-none focus:border-jp-sakura/40 text-sm text-white/80 placeholder:text-white/25"
              />
            </Field>

            <Field label="Банер" hint="візуальний стиль профілю">
              <div className="grid grid-cols-2 gap-2">
                {BANNERS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => updateProfile({ bannerStyle: item.id })}
                    className={`relative h-20 rounded-xl overflow-hidden border transition-all ${profile.bannerStyle === item.id ? "border-jp-sakura/50" : "border-white/10 hover:border-jp-sakura/25"}`}
                  >
                    <img
                      src={item.image}
                      alt={item.label}
                      className="absolute inset-0 w-full h-full object-cover opacity-45"
                    />
                    <div className="absolute inset-0 bg-bg-900/45" />
                    <span className="relative z-10 text-xs font-jp text-white/75">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Акцент" hint="колір бейджів і рамок">
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((color) => (
                  <button
                    key={color}
                    onClick={() => updateProfile({ accentColor: color })}
                    className={`w-9 h-9 rounded-xl border transition-all ${profile.accentColor === color ? "border-white/70 scale-105" : "border-white/10"}`}
                    style={{
                      background: color,
                      boxShadow:
                        profile.accentColor === color
                          ? `0 0 14px ${color}80`
                          : "none",
                    }}
                    title={color}
                  />
                ))}
              </div>
            </Field>
          </div>
        </GlassCard>

        <ProfilePreview
          stats={stats}
          characterName={characterName}
          level={data.level}
          tier={data.tier}
          xp={data.xp}
          activeTitle={activeTitle}
          profile={profile}
          banner={banner}
          topLanguages={topLanguages}
        />
      </div>

      <WavePattern
        className="w-full h-10 mt-6 opacity-60"
        color="#e8a0b4"
        opacity={0.03}
      />
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-2">
      <div>
        <div className="text-sm font-jp font-bold text-white/70">{label}</div>
        {hint && <div className="text-[11px] text-white/30">{hint}</div>}
      </div>
      {children}
    </label>
  );
}

function MiniStat({ label, value, kanji }) {
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

function ProfilePreview({
  stats,
  characterName,
  level,
  tier,
  xp,
  activeTitle,
  profile,
  banner,
  topLanguages,
}) {
  return (
    <GlassCard
      glow="gold"
      hoverable={false}
      className="relative overflow-hidden"
    >
      <div
        className="absolute inset-x-0 top-0 h-44"
        style={{
          backgroundImage: `url(${banner.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.28,
        }}
      />
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-bg-900/10 to-bg-900" />
      <div className="relative z-10 pt-24">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <img
            src={stats.user.avatar_url}
            alt={stats.user.login}
            className="w-24 h-24 rounded-3xl object-cover border-4 border-bg-900"
            style={{ boxShadow: `0 0 26px ${profile.accentColor}35` }}
          />
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-calligraphy font-black text-3xl text-gradient-jp truncate">
                {characterName}
              </h2>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-jp font-bold"
                style={{
                  color: tier.color,
                  background: `${tier.color}18`,
                  border: `1px solid ${tier.color}40`,
                }}
              >
                Lv.{level}
              </span>
            </div>
            <p className="text-sm text-white/40 font-jp">@{stats.user.login}</p>
            {activeTitle && (
              <div
                className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-jp font-bold"
                style={{
                  color: profile.accentColor,
                  background: `${profile.accentColor}12`,
                  border: `1px solid ${profile.accentColor}35`,
                }}
              >
                <span>{activeTitle.emoji}</span>
                <span>{activeTitle.title}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-white/[0.035] border border-white/5 p-4">
          <p className="text-lg font-jp font-bold text-white/80">
            “{profile.status}”
          </p>
          <p className="text-sm text-white/48 mt-2 leading-relaxed">
            {profile.bio}
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-3 mt-4">
          <MiniStat label="XP" value={formatNumber(xp)} kanji="経" />
          <MiniStat
            label="Коміти"
            value={formatNumber(stats.totalCommits)}
            kanji="献"
          />
          <MiniStat
            label="Stars"
            value={formatNumber(stats.totalStars)}
            kanji="星"
          />
          <MiniStat
            label="Streak"
            value={formatNumber(stats.longestStreak)}
            kanji="火"
          />
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
            <div className="text-xs uppercase tracking-widest text-white/30 font-jp mb-2">
              Улюблений стек
            </div>
            <p className="text-sm text-white/65 font-jp">
              {profile.favoriteStack}
            </p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
            <div className="text-xs uppercase tracking-widest text-white/30 font-jp mb-2">
              GitHub мови
            </div>
            <div className="flex flex-wrap gap-1.5">
              {topLanguages.length > 0 ? (
                topLanguages.map((lang) => (
                  <span
                    key={lang}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/5 text-white/55 font-jp"
                  >
                    {lang}
                  </span>
                ))
              ) : (
                <span className="text-xs text-white/35">Немає даних</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
