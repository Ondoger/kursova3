import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";

// Phase 2: only "Класи" lives in the navbar (= /dashboard).
// Old gamification pages (Character/Profile/Friends/Quests/Achievements)
// are temporarily out of scope — they'll come back in Phase 7 reworked
// around the room/student/teacher domain. Routes for them are also
// removed in App.jsx.
const NAV = [
  { to: "/dashboard", label: "Класи" },
];

// Routes where the navbar is hidden — public pages with their own headers.
const HIDDEN_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/verify-email",
  "/auth/callback",
]);

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const authUser = useStore((s) => s.authUser);
  const stats = useStore((s) => s.stats);
  const logout = useStore((s) => s.logout);
  const refresh = useStore((s) => s.refresh);
  const loading = useStore((s) => s.loading);
  const coins = useStore((s) => s.coins);

  if (HIDDEN_PATHS.has(location.pathname)) return null;
  if (!authUser) return null;

  const displayName = authUser.name || authUser.email;
  const coinBalance = authUser.totals?.coins ?? coins ?? 0;

  return (
    <header
      className="sticky top-0 z-40 bg-[#161b22] border-b border-[#30363d]"
      style={{ backdropFilter: "none" }}
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-4">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 group hover:no-underline"
        >
          {/* Simple GitHub-style monogram */}
          <span
            className="w-8 h-8 rounded-md flex items-center justify-center text-white"
            style={{
              background:
                "linear-gradient(180deg, #1f6feb 0%, #1158c7 100%)",
            }}
            aria-hidden
          >
            <svg
              viewBox="0 0 16 16"
              width="18"
              height="18"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
              />
            </svg>
          </span>
          <span className="font-semibold text-[15px] text-gh-fg hidden sm:inline">
            GitQuest
            {authUser?.role && (
              <span
                className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-[#30363d] text-gh-muted font-normal align-middle"
                title={authUser.role}
              >
                {authUser.role === "teacher" ? "Викладач" : "Студент"}
              </span>
            )}
          </span>
        </Link>

        <nav className="flex items-center gap-1 ml-auto">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm transition-colors hover:no-underline ${
                  isActive
                    ? "text-gh-fg bg-[#1f2733] font-semibold"
                    : "text-gh-muted hover:text-gh-fg hover:bg-[#1f2733]"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* GitHub stats refresh — only meaningful once GitHub is linked */}
          {stats?.user && (
            <button
              onClick={() => refresh()}
              disabled={loading}
              className="text-gh-muted hover:text-gh-fg disabled:opacity-50 transition-colors text-sm w-8 h-8 rounded-md hover:bg-[#1f2733] flex items-center justify-center"
              title="Оновити GitHub stats"
              aria-label="Оновити"
            >
              {loading ? (
                <span className="text-xs">...</span>
              ) : (
                <svg
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
                </svg>
              )}
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md border border-[#30363d] text-xs text-gh-muted text-mono">
            <svg
              viewBox="0 0 16 16"
              width="12"
              height="12"
              fill="#d29922"
              aria-hidden
            >
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm.75 4.75a.75.75 0 0 0-1.5 0v3.5c0 .414.336.75.75.75h3a.75.75 0 0 0 0-1.5h-2.25v-2.75Z" />
            </svg>
            <span>{coinBalance}</span>
          </div>
          {authUser.githubLogin && (
            <a
              href={`https://github.com/${authUser.githubLogin}`}
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-[#30363d] hover:border-[#8b949e] text-[12px] text-gh-muted hover:text-gh-fg transition-colors hover:no-underline"
              title={`Прив'язано: ${authUser.githubLogin}`}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
                />
              </svg>
              <span className="text-mono">{authUser.githubLogin}</span>
            </a>
          )}
          <Link
            to="/profile"
            className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[#1f2733] hover:no-underline"
            title="Відкрити профіль"
          >
            {authUser.avatarUrl ? (
              <img
                src={authUser.avatarUrl}
                alt={displayName}
                className="w-6 h-6 rounded-full border border-[#30363d]"
              />
            ) : (
              <span className="w-6 h-6 rounded-full border border-[#30363d] bg-[#0d1117] flex items-center justify-center text-[11px] font-semibold text-gh-fg">
                {displayName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="text-sm text-gh-fg hidden md:inline">
              {displayName}
            </span>
          </Link>
          <button
            onClick={async () => {
              await logout();
              navigate("/");
            }}
            className="text-xs text-gh-muted hover:text-gh-danger transition-colors px-2 py-1 rounded-md hover:bg-[#1f2733]"
          >
            Вийти
          </button>
        </div>
      </div>
    </header>
  );
}
