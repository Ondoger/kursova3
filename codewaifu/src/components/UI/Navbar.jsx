import { Link, NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useStore } from "../../store/useStore";
const NAV = [
  { to: "/dashboard", label: "Dashboard", kanji: "板" },
  { to: "/character", label: "Character", kanji: "人" },
  { to: "/profile", label: "Profile", kanji: "名" },
  { to: "/friends", label: "Friends", kanji: "友" },
  { to: "/quests", label: "Quests", kanji: "任" },
  { to: "/achievements", label: "Achievements", kanji: "功" },
];
export function Navbar() {
  const location = useLocation();
  const username = useStore((s) => s.username);
  const stats = useStore((s) => s.stats);
  const characterName = useStore((s) => s.characterName);
  const logout = useStore((s) => s.logout);
  const refresh = useStore((s) => s.refresh);
  const loading = useStore((s) => s.loading);
  const coins = useStore((s) => s.coins);
  if (location.pathname === "/") return null;
  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 backdrop-blur-xl bg-bg-900/70 border-b border-jp-sakura/10"
    >
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-6">
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <span
            className="w-9 h-9 rounded-lg flex items-center justify-center font-jp font-bold text-base"
            style={{
              background:
                "linear-gradient(135deg, rgba(232,160,180,0.15), rgba(196,149,106,0.15))",
              border: "1px solid rgba(232,160,180,0.3)",
              boxShadow: "0 0 12px rgba(232,160,180,0.2)",
              color: "#e8a0b4",
            }}
          >
            桜
          </span>
          <span className="font-jp font-bold text-lg hidden sm:inline">
            <span className="text-gradient-jp">{characterName}</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 ml-auto">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `relative px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "text-white" : "text-white/50 hover:text-white/80"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative z-10 font-jp">
                    <span className="text-[10px] opacity-40 mr-1">
                      {n.kanji}
                    </span>
                    {n.label}
                  </span>
                  {isActive && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-lg bg-jp-sakura/[0.06] border border-jp-sakura/25"
                      style={{ boxShadow: "0 0 12px rgba(232,160,180,0.15)" }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {username && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => refresh()}
              disabled={loading}
              className="text-white/50 hover:text-jp-sakura disabled:opacity-50 transition-colors text-sm"
              title="Оновити"
            >
              {loading ? "..." : "↻"}
            </button>
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-jp-gold/[0.08] border border-jp-gold/20 text-jp-gold/80 font-mono text-xs">
              <span>硬</span>
              <span>{coins ?? 0}</span>
            </div>
            {stats?.user && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-jp-sakura/15">
                <div className="hanko-avatar">
                  <img
                    src={stats.user.avatar_url}
                    alt={username}
                    className="w-6 h-6 rounded-sm"
                  />
                </div>
                <span className="text-sm font-medium hidden md:inline text-white/70">
                  {username}
                </span>
              </div>
            )}
            <button
              onClick={logout}
              className="text-xs text-white/35 hover:text-jp-red transition-colors font-jp"
            >
              Вийти
            </button>
          </div>
        )}
      </div>
    </motion.header>
  );
}
