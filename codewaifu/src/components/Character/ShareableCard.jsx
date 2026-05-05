import { useState } from "react";
import { motion } from "framer-motion";
import { formatNumber } from "../../utils/gamification";

/**
 * A visually styled profile card that can be screenshotted / shared.
 * Shows practical GitHub metrics instead of RPG/battle stats.
 */
export function ShareableCard({
  user,
  characterName,
  level,
  tier,
  xp,
  topLanguages = [],
  summaryStats = [],
  activeTitle = null,
}) {
  const [copied, setCopied] = useState(false);

  const copyText = () => {
    const metricLines = summaryStats.map(
      (item) => `${item.label}: ${formatNumber(item.value)}`,
    );
    const lines = [
      `${characterName} (@${user.login})`,
      `Level ${level} | ${tier.name}`,
      activeTitle ? `Title: ${activeTitle.emoji} ${activeTitle.title}` : null,
      `XP: ${xp.toLocaleString()}`,
      "",
      ...metricLines,
      "",
      topLanguages.length > 0
        ? `Languages: ${topLanguages.join(", ")}`
        : "Languages: немає даних",
      "",
      `github.com/${user.login} | GitQuest`,
    ];

    navigator.clipboard.writeText(lines.filter(Boolean).join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-3">
      {/* The card itself */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 select-none"
        style={{
          background:
            "linear-gradient(135deg, #0d0b0f 0%, #14100e 42%, #1a1215 100%)",
          border: "1px solid rgba(232,160,180,0.15)",
          boxShadow:
            "0 0 40px rgba(232,160,180,0.08), inset 0 1px 0 rgba(255,220,200,0.04)",
        }}
      >
        {/* Decorative corner patterns */}
        <div className="absolute top-0 left-0 w-20 h-20 opacity-[0.06] pointer-events-none">
          <svg viewBox="0 0 80 80" fill="none">
            <path d="M0 0 L80 0 L0 80Z" fill="#e8a0b4" />
          </svg>
        </div>
        <div className="absolute bottom-0 right-0 w-20 h-20 opacity-[0.06] pointer-events-none rotate-180">
          <svg viewBox="0 0 80 80" fill="none">
            <path d="M0 0 L80 0 L0 80Z" fill="#c4956a" />
          </svg>
        </div>

        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-jp-sakura/30 to-transparent" />

        {/* Header */}
        <div className="flex items-center gap-4 mb-5 relative z-10">
          <div className="relative">
            <img
              src={user.avatar_url}
              alt={user.login}
              className="w-16 h-16 rounded-2xl object-cover"
              style={{
                border: `2px solid ${tier.color}`,
                boxShadow: `0 0 12px ${tier.color}40`,
              }}
            />
            <div
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold font-jp"
              style={{
                background: "#0d0b0f",
                border: `2px solid ${tier.color}`,
                color: tier.color,
              }}
            >
              {level}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-calligraphy font-black text-2xl text-gradient-jp truncate">
              {characterName}
            </div>
            <div className="text-xs text-white/40 font-jp">@{user.login}</div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {activeTitle && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-jp-gold/10 border border-jp-gold/25 text-jp-gold/85 font-jp font-bold">
                  {activeTitle.emoji} {activeTitle.title}
                </span>
              )}
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-jp font-bold"
                style={{
                  color: tier.color,
                  background: `${tier.color}15`,
                  border: `1px solid ${tier.color}40`,
                }}
              >
                {tier.name}
              </span>
              <span className="text-[10px] text-white/30 font-mono">
                {xp.toLocaleString()} XP
              </span>
            </div>
          </div>
        </div>

        {/* Practical GitHub metrics */}
        {summaryStats.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4 relative z-10">
            {summaryStats.map((item) => (
              <div
                key={item.label}
                className="rounded-xl px-3 py-2 bg-white/[0.035] border border-white/5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-white/35 font-jp">
                    <span className="text-jp-gold/45 mr-1">{item.kanji}</span>
                    {item.label}
                  </span>
                  <span className="text-sm font-jp font-bold text-white/75">
                    {formatNumber(item.value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top languages */}
        <div className="relative z-10">
          <div className="text-[10px] uppercase tracking-widest text-white/25 font-jp mb-2">
            Основні мови
          </div>
          {topLanguages.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {topLanguages.map((lang) => (
                <span
                  key={lang}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/5 text-white/55 font-jp"
                >
                  {lang}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs text-white/35 font-jp">
              Немає даних по мовах
            </div>
          )}
        </div>

        {/* Footer branding */}
        <div
          className="mt-4 pt-3 flex items-center justify-between relative z-10"
          style={{ borderTop: "1px solid rgba(232,160,180,0.08)" }}
        >
          <span className="text-[10px] text-white/20 font-jp">桜 GitQuest</span>
          <span className="text-[10px] text-white/15 font-mono">
            github.com/{user.login}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={copyText}
          className="btn-brush flex-1 py-2.5 rounded-xl text-sm font-jp font-bold transition-all bg-white/[0.03] border hover:bg-white/[0.06] text-white/60 hover:text-white/80"
          style={{ borderColor: "rgba(232,160,180,0.15)" }}
        >
          {copied ? "✓ Скопійовано!" : "📋 Копіювати текст"}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            const url = `https://github.com/${user.login}`;
            window.open(url, "_blank");
          }}
          className="px-4 py-2.5 rounded-xl text-sm font-jp font-bold transition-all bg-white/[0.03] border hover:bg-white/[0.06] text-white/60 hover:text-white/80"
          style={{ borderColor: "rgba(232,160,180,0.15)" }}
        >
          ↗ GitHub
        </motion.button>
      </div>

      <p className="text-[10px] text-white/20 text-center font-jp">
        Зроби скріншот картки (Win+Shift+S), щоб поділитись
      </p>
    </div>
  );
}
