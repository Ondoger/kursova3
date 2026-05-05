import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { VideoCharacter } from "../components/Character/VideoCharacter";
import { SakuraBackground } from "../components/UI/SakuraBackground";
import { NeonButton } from "../components/UI/NeonButton";
import { useStore } from "../store/useStore";
import { beginGitHubOAuth, isGitHubOAuthConfigured } from "../utils/githubAuth";

export function Landing() {
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [authError, setAuthError] = useState(null);
  const savedCharacterName = useStore((s) => s.characterName);
  const [characterName, setCharacterNameDraft] = useState(savedCharacterName);
  const connect = useStore((s) => s.connect);
  const setCharacterName = useStore((s) => s.setCharacterName);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.error);
  const navigate = useNavigate();
  const oauthConfigured = isGitHubOAuthConfigured();

  /* Apply landing-specific bg class */
  useEffect(() => {
    document.body.classList.add("landing-jp");
    return () => document.body.classList.remove("landing-jp");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    try {
      setCharacterName(characterName);
      await connect(username, token || undefined);
      navigate("/dashboard");
    } catch {
      /* error displayed below */
    }
  };

  const handleGitHubSignIn = async () => {
    setAuthError(null);
    setCharacterName(characterName);
    try {
      await beginGitHubOAuth({ characterName });
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "GitHub OAuth помилка");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <SakuraBackground count={30} />

      {/* Subtle washi paper texture overlay */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c4956a' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 py-10 grid lg:grid-cols-2 gap-10 items-center min-h-screen">
        {/* Left: hero text & form */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-7 z-10"
        >
          {/* Tag line */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-jp-sakura/20 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-jp-sakura animate-pulse shadow-[0_0_8px_#e8a0b4]" />
            <span className="text-xs uppercase tracking-widest text-white/60 font-jp">
              GitHub Gamification
            </span>
          </div>

          {/* Title */}
          <h1 className="leading-[0.95] tracking-tight">
            <span className="block text-white/90 font-calligraphy font-bold text-5xl md:text-6xl">
              Прокачай
            </span>
            <span className="block text-gradient-jp font-calligraphy font-bold text-5xl md:text-6xl mt-1">
              свій GitQuest профіль
            </span>
            <span className="block text-white/60 text-2xl md:text-3xl mt-3 font-calligraphy font-medium">
              кожним коммітом。
            </span>
          </h1>

          <p className="text-white/50 max-w-lg text-base md:text-lg leading-relaxed font-body">
            Підключи свій GitHub — ми перетворимо твою активність на профіль з
            рівнями, квестами, коінами, титулами, ритмом кодінгу та карткою для
            шерингу.
          </p>

          {/* Form card */}
          <div className="glass-jp p-6 max-w-md space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Character name */}
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-jp-sakura/50 font-jp text-sm">
                  名
                </span>
                <input
                  value={characterName}
                  onChange={(e) => setCharacterNameDraft(e.target.value)}
                  placeholder="Ім'я персонажа"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 focus:border-jp-sakura/50 focus:bg-white/[0.05] focus:outline-none focus:ring-4 focus:ring-jp-sakura/10 transition-all font-medium placeholder:text-white/25 text-white/90"
                />
              </div>

              {/* GitHub OAuth button */}
              <motion.button
                type="button"
                onClick={handleGitHubSignIn}
                disabled={loading || !oauthConfigured}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-brush w-full py-3.5 rounded-xl font-jp font-bold tracking-wider text-sm border border-jp-sakura/30 bg-gradient-to-r from-jp-sakura/15 via-jp-gold/10 to-jp-sakura/15 text-white/90 hover:border-jp-sakura/60 hover:shadow-[0_0_30px_rgba(232,160,180,0.2)] transition-all disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-md flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Увійти через GitHub
              </motion.button>

              {!oauthConfigured && (
                <div className="text-xs text-white/40 bg-white/[0.03] border border-white/8 px-3 py-2 rounded-lg leading-relaxed">
                  Для GitHub OAuth додай{" "}
                  <span className="font-mono text-jp-gold/70">
                    VITE_GITHUB_CLIENT_ID
                  </span>{" "}
                  у .env і{" "}
                  <span className="font-mono text-jp-gold/70">
                    GITHUB_CLIENT_SECRET
                  </span>{" "}
                  на сервері.
                </div>
              )}

              {/* Divider */}
              <div className="relative flex items-center py-1">
                <BrushStroke
                  className="w-full h-2 flex-1 opacity-50"
                  color="#b76e79"
                />
                <span className="px-3 text-[10px] uppercase tracking-widest text-white/30 font-jp">
                  або вручну
                </span>
                <BrushStroke
                  className="w-full h-2 flex-1 opacity-50"
                  color="#c4956a"
                  flip
                />
              </div>

              {/* Username */}
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-jp-gold/40 font-mono text-sm">
                  @
                </span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="GitHub username (наприклад, torvalds)"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 focus:border-jp-gold/50 focus:bg-white/[0.05] focus:outline-none focus:ring-4 focus:ring-jp-gold/10 transition-all font-medium placeholder:text-white/25 text-white/90"
                  autoFocus
                />
              </div>

              {/* Token toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="text-xs text-white/35 hover:text-jp-sakura/80 transition-colors font-body"
              >
                {showAdvanced ? "▾" : "▸"} Personal access token (опціонально)
              </button>
              {showAdvanced && (
                <input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_..."
                  type="password"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 focus:border-jp-sakura-dark/50 focus:outline-none transition-all font-mono text-sm placeholder:text-white/20 text-white/80"
                />
              )}

              {/* Submit row */}
              <div className="flex items-center gap-3 pt-1">
                <motion.button
                  type="submit"
                  disabled={loading || !username.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-brush px-6 py-3 rounded-xl font-jp font-bold tracking-wider text-sm border border-jp-gold/30 bg-gradient-to-r from-jp-gold/15 to-jp-sakura/10 text-white/90 hover:border-jp-gold/60 hover:shadow-[0_0_24px_rgba(196,149,106,0.2)] transition-all disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-md"
                >
                  {loading ? "Завантаження..." : "Connect GitHub →"}
                </motion.button>
                <button
                  type="button"
                  onClick={() => setUsername("torvalds")}
                  className="text-xs text-white/35 hover:text-jp-sakura/70 transition-colors"
                >
                  спробувати з torvalds
                </button>
              </div>

              {(error || authError) && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-jp-red bg-jp-red/5 border border-jp-red/30 px-3 py-2 rounded-lg"
                >
                  {error || authError}
                </motion.div>
              )}
            </form>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 max-w-md">
            <div className="col-span-3 mb-2 flex justify-center">
              <BrushStroke className="w-full h-2 opacity-40" color="#b76e79" />
            </div>
            <Stat label="Рівнів" value="100" kanji="階" />
            <Stat label="Ачівментів" value="16" kanji="功" />
            <Stat label="Тірів" value="4" kanji="段" />
          </div>
        </motion.div>

        {/* Right: 3D character */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative h-[60vh] lg:h-[80vh]"
        >
          {/* Decorative circle behind character */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-[70%] h-[70%] rounded-full opacity-[0.04]"
              style={{
                border: "2px solid #c4956a",
                boxShadow: "0 0 80px rgba(196, 149, 106, 0.08)",
              }}
            />
          </div>
          <VideoCharacter height="100%" interactive={false} showHud={false} />
        </motion.div>
      </div>
    </div>
  );
}

function Stat({ label, value, kanji }) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-jp-gold/30 font-jp mb-0.5">{kanji}</div>
      <div className="font-jp font-bold text-2xl text-gradient-jp">{value}</div>
      <div className="text-xs text-white/35 uppercase tracking-widest">
        {label}
      </div>
    </div>
  );
}

export function BrushStroke({
  className = "",
  color = "#e8a0b4",
  flip = false,
}) {
  return (
    <svg
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
      className={className}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        d="M 5 5 C 20 2, 40 3, 50 5 C 70 7, 90 2, 95 5 C 80 8, 50 9, 30 7 C 15 6, 5 8, 5 5 Z"
        fill={color}
        opacity="0.8"
      />
    </svg>
  );
}
