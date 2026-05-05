import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "../components/UI/GlassCard";
import { useAutoLoad } from "../hooks/useGitHub";
import { useStore } from "../store/useStore";
import {
  calculateLevel,
  calculateXP,
  formatNumber,
  getTierForLevel,
} from "../utils/gamification";
import { fetchGitHubStats } from "../utils/github";
import {
  BrushStroke,
  CloudDecoration,
  IchimatsuPattern,
  Lantern,
  SakuraBranch,
  WavePattern,
} from "../components/UI/JapaneseDecorations";

const compareKeys = [
  { key: "totalCommits", label: "Коміти", kanji: "献" },
  { key: "totalRepos", label: "Репозиторії", kanji: "庫" },
  { key: "totalStars", label: "Stars", kanji: "星" },
  { key: "longestStreak", label: "Streak", kanji: "火" },
];

export function FriendsPage() {
  useAutoLoad();

  const navigate = useNavigate();
  const username = useStore((s) => s.username);
  const token = useStore((s) => s.token);
  const stats = useStore((s) => s.stats);
  const friends = useStore((s) => s.friends);
  const addFriend = useStore((s) => s.addFriend);
  const removeFriend = useStore((s) => s.removeFriend);
  const [friendInput, setFriendInput] = useState("");
  const [selectedLogin, setSelectedLogin] = useState(null);
  const [friendStats, setFriendStats] = useState({});
  const [loadingLogin, setLoadingLogin] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!username) navigate("/");
  }, [username, navigate]);

  useEffect(() => {
    if (!selectedLogin && friends.length > 0) setSelectedLogin(friends[0]);
    if (friends.length === 0) setSelectedLogin(null);
  }, [friends, selectedLogin]);

  useEffect(() => {
    if (!selectedLogin || friendStats[selectedLogin]) return;
    let cancelled = false;
    setLoadingLogin(selectedLogin);
    setError(null);
    fetchGitHubStats(selectedLogin, token ?? undefined)
      .then((data) => {
        if (cancelled) return;
        setFriendStats((prev) => ({ ...prev, [selectedLogin]: data }));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(
          e instanceof Error
            ? e.message
            : "Не вдалось завантажити профіль друга",
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingLogin(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedLogin, friendStats, token]);

  const selectedStats = selectedLogin ? friendStats[selectedLogin] : null;
  const selectedMeta = useMemo(
    () => (selectedStats ? getUserMeta(selectedStats) : null),
    [selectedStats],
  );

  const handleAdd = (e) => {
    e.preventDefault();
    const clean = friendInput.trim().replace(/^@/, "");
    if (!clean) return;
    const ok = addFriend(clean);
    if (ok) {
      setSelectedLogin(clean);
      setFriendInput("");
      setError(null);
    } else {
      setError("Не можу додати: пусто, дубль або це твій власний username.");
    }
  };

  const handleRemove = (login) => {
    removeFriend(login);
    setFriendStats((prev) => {
      const copy = { ...prev };
      delete copy[login];
      return copy;
    });
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

      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden p-6"
      >
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: "url(/images/jp/garden.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center 42%",
            opacity: 0.09,
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-bg-900/95 via-bg-900/78 to-bg-900/95" />
        <IchimatsuPattern className="absolute inset-0 opacity-[0.025] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-jp-gold/60 font-jp flex items-center gap-2">
              <span className="text-jp-sakura/50">友</span>
              Соціальний перегляд GitHub-профілів
            </p>
            <h1 className="font-calligraphy font-black text-4xl md:text-5xl mt-2 leading-tight">
              <span className="text-gradient-jp">Друзі</span>
            </h1>
          </div>

          <form onSubmit={handleAdd} className="flex gap-2 w-full lg:w-auto">
            <input
              value={friendInput}
              onChange={(e) => setFriendInput(e.target.value)}
              placeholder="github username"
              className="min-w-0 flex-1 lg:w-64 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:outline-none focus:border-jp-sakura/40 text-sm text-white/80 placeholder:text-white/25"
            />
            <button className="btn-brush px-4 py-2.5 rounded-xl text-sm font-jp font-bold border border-jp-sakura/25 bg-jp-sakura/10 text-white/70 hover:text-white transition-all">
              Додати
            </button>
          </form>
        </div>
      </motion.section>

      {error && (
        <div className="relative z-10 rounded-xl border border-jp-red/25 bg-jp-red/8 px-4 py-3 text-sm text-jp-red">
          {error}
        </div>
      )}

      <div className="grid xl:grid-cols-[340px_1fr] gap-6 relative z-10">
        <GlassCard
          glow="sakura"
          hoverable={false}
          className="relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-jp-gold/45 font-jp">
                  Friend list
                </p>
                <h2 className="font-jp font-bold text-2xl neon-text-pink mt-1">
                  <span className="opacity-40 text-base mr-1">友</span> Список
                </h2>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-white/[0.035] border border-white/5 text-white/35 font-mono">
                {friends.length}
              </span>
            </div>
            <BrushStroke
              className="w-full h-3 opacity-35 mb-4"
              color="#b76e79"
            />

            {friends.length === 0 ? (
              <div className="rounded-2xl bg-white/[0.025] border border-white/5 p-4 text-sm text-white/42 leading-relaxed">
                Поки пусто. Додай, наприклад,{" "}
                <span className="text-jp-gold">torvalds</span>,{" "}
                <span className="text-jp-gold">gaearon</span> або свого друга,
                якого треба морально перемогти.
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((login) => {
                  const data = friendStats[login];
                  const isActive = selectedLogin === login;
                  return (
                    <button
                      key={login}
                      onClick={() => setSelectedLogin(login)}
                      className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                        isActive
                          ? "bg-jp-sakura/10 border-jp-sakura/25"
                          : "bg-white/[0.025] border-white/5 hover:border-jp-sakura/15"
                      }`}
                    >
                      {data ? (
                        <img
                          src={data.user.avatar_url}
                          alt={login}
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-center text-white/30">
                          ?
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-jp font-bold text-sm text-white/75 truncate">
                          @{login}
                        </div>
                        <div className="text-[11px] text-white/30 truncate">
                          {data
                            ? `${formatNumber(data.totalCommits)} commits · ${formatNumber(data.totalStars)} stars`
                            : "натисни, щоб завантажити"}
                        </div>
                      </div>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(login);
                        }}
                        className="text-white/25 hover:text-jp-red text-xs px-2 py-1"
                      >
                        ✕
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </GlassCard>

        <div className="space-y-6">
          {!selectedLogin ? (
            <GlassCard glow="gold" hoverable={false}>
              <div className="text-center py-16 text-white/40 font-jp">
                Додай друга, щоб побачити профіль.
              </div>
            </GlassCard>
          ) : loadingLogin === selectedLogin && !selectedStats ? (
            <div className="h-[520px] rounded-2xl skeleton" />
          ) : selectedStats && selectedMeta ? (
            <>
              <FriendProfile stats={selectedStats} meta={selectedMeta} />
              <ComparePanel
                mine={stats}
                friend={selectedStats}
                friendLogin={selectedStats.user.login}
              />
            </>
          ) : (
            <GlassCard glow="gold" hoverable={false}>
              <div className="text-center py-16 text-white/40 font-jp">
                Не вдалось завантажити профіль.
              </div>
            </GlassCard>
          )}
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

function getUserMeta(stats) {
  const xp = calculateXP(stats);
  const level = calculateLevel(xp);
  const tier = getTierForLevel(level);
  const topLanguages = Object.entries(stats.languages ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name]) => name);
  return { xp, level, tier, topLanguages };
}

function FriendProfile({ stats, meta }) {
  return (
    <GlassCard
      glow="gold"
      hoverable={false}
      className="relative overflow-hidden"
    >
      <div
        className="absolute inset-x-0 top-0 h-44"
        style={{
          backgroundImage: "url(/images/jp/fuji.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.22,
        }}
      />
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-bg-900/10 to-bg-900" />
      <div className="relative z-10 pt-24">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <img
            src={stats.user.avatar_url}
            alt={stats.user.login}
            className="w-24 h-24 rounded-3xl object-cover border-4 border-bg-900"
            style={{ boxShadow: `0 0 26px ${meta.tier.color}35` }}
          />
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-calligraphy font-black text-3xl text-gradient-jp truncate">
                {stats.user.name ?? stats.user.login}
              </h2>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-jp font-bold"
                style={{
                  color: meta.tier.color,
                  background: `${meta.tier.color}18`,
                  border: `1px solid ${meta.tier.color}40`,
                }}
              >
                Lv.{meta.level}
              </span>
            </div>
            <p className="text-sm text-white/40 font-jp">@{stats.user.login}</p>
            {stats.user.bio && (
              <p className="text-sm text-white/48 mt-2 leading-relaxed">
                “{stats.user.bio}”
              </p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-3 mt-5">
          <FriendStat label="XP" value={formatNumber(meta.xp)} kanji="経" />
          <FriendStat
            label="Коміти"
            value={formatNumber(stats.totalCommits)}
            kanji="献"
          />
          <FriendStat
            label="Stars"
            value={formatNumber(stats.totalStars)}
            kanji="星"
          />
          <FriendStat
            label="Streak"
            value={formatNumber(stats.longestStreak)}
            kanji="火"
          />
        </div>

        <div className="mt-4 rounded-2xl bg-white/[0.03] border border-white/5 p-4">
          <div className="text-xs uppercase tracking-widest text-white/30 font-jp mb-2">
            Основні мови
          </div>
          <div className="flex flex-wrap gap-1.5">
            {meta.topLanguages.length > 0 ? (
              meta.topLanguages.map((lang) => (
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
    </GlassCard>
  );
}

function ComparePanel({ mine, friend, friendLogin }) {
  return (
    <GlassCard glow="sakura" hoverable={false}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-jp-gold/45 font-jp">
            Friendly comparison
          </p>
          <h2 className="font-jp font-bold text-2xl neon-text-pink mt-1">
            <span className="opacity-40 text-base mr-1">比</span> Порівняння
          </h2>
        </div>
        <span className="text-xs text-white/30 font-jp">
          ти vs @{friendLogin}
        </span>
      </div>
      <div className="space-y-3">
        {compareKeys.map((item) => {
          const mineValue = mine[item.key] ?? 0;
          const friendValue = friend[item.key] ?? 0;
          const max = Math.max(1, mineValue, friendValue);
          return (
            <div
              key={item.key}
              className="rounded-2xl bg-white/[0.025] border border-white/5 p-3"
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-jp text-white/60">
                  <span className="text-jp-gold/45 mr-1">{item.kanji}</span>
                  {item.label}
                </span>
                <span className="text-white/30 font-mono">
                  {formatNumber(mineValue)} / {formatNumber(friendValue)}
                </span>
              </div>
              <Bar label="Ти" value={mineValue} max={max} color="#e8a0b4" />
              <Bar
                label={`@${friendLogin}`}
                value={friendValue}
                max={max}
                color="#c4956a"
              />
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

function Bar({ label, value, max, color }) {
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <span className="w-20 text-[10px] text-white/35 font-jp truncate">
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.round((value / max) * 100)}%` }}
          transition={{ duration: 0.75, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}55` }}
        />
      </div>
      <span className="w-12 text-right text-[10px] text-white/35 font-mono">
        {formatNumber(value)}
      </span>
    </div>
  );
}

function FriendStat({ label, value, kanji }) {
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
