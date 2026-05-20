import { useState } from "react";
import { useStore } from "../../store/useStore";
import {
  beginGitHubLink,
  isGitHubOAuthConfigured,
} from "../../utils/githubAuth";
import { api, ApiError } from "../../utils/api";

/*
 * Inline GitHub-link banner. Two states:
 *   - not linked → show "Прив'язати GitHub" CTA
 *   - linked     → show @login + last-linked timestamp + "Відв'язати"
 *
 * Used on the dashboard so the link nudge is visible immediately, and
 * we don't ship a separate Settings page for one toggle.
 */
export function GitHubLinkCard({ user, onChange, compact = false }) {
  const hydrateAuth = useStore((s) => s.hydrateAuth);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState(null);

  const linked = Boolean(user?.githubLogin);
  const oauthOK = isGitHubOAuthConfigured();

  const handleLink = async () => {
    setError(null);
    try {
      await beginGitHubLink({ returnTo: window.location.pathname });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалось почати OAuth");
    }
  };

  const handleUnlink = async () => {
    if (!confirm("Відв'язати GitHub від акаунту?")) return;
    setUnlinking(true);
    setError(null);
    try {
      await api.post("/api/auth/unlink-github");
      await hydrateAuth();
      onChange?.();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Не вдалось відв'язати",
      );
    } finally {
      setUnlinking(false);
    }
  };

  if (compact) {
    // Single-line view for use inside cards/headers.
    if (linked) {
      return (
        <div className="flex items-center gap-2 text-[12px]">
          <GitHubMark />
          <span className="text-mono text-gh-fg">@{user.githubLogin}</span>
          <button
            onClick={handleUnlink}
            disabled={unlinking}
            className="text-gh-muted hover:text-gh-danger underline-offset-2 hover:underline"
          >
            {unlinking ? "..." : "відв'язати"}
          </button>
        </div>
      );
    }
    return (
      <button
        onClick={handleLink}
        disabled={!oauthOK}
        className="btn-gh inline-flex items-center gap-2"
        title={oauthOK ? "" : "Адмін: не налаштовано VITE_GITHUB_CLIENT_ID"}
      >
        <GitHubMark />
        Прив'язати GitHub
      </button>
    );
  }

  return (
    <div
      className={`bg-[#161b22] border rounded-md p-4 ${
        linked ? "border-[#3fb950]/30" : "border-[#d29922]/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
            linked
              ? "bg-[#3fb950]/15 text-[#3fb950]"
              : "bg-[#d29922]/15 text-[#d29922]"
          }`}
        >
          <GitHubMark size={20} />
        </div>
        <div className="flex-1 min-w-0">
          {linked ? (
            <>
              <div className="text-[14px] text-gh-fg flex items-center gap-2">
                <span>GitHub прив'язано:</span>
                <a
                  href={`https://github.com/${user.githubLogin}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-mono text-gh-accent hover:underline"
                >
                  @{user.githubLogin}
                </a>
              </div>
              <div className="text-[12px] text-gh-muted mt-1">
                {user.githubLinkedAt
                  ? `Прив'язано ${new Date(user.githubLinkedAt).toLocaleDateString("uk-UA")}`
                  : "—"}
                · Тепер у submission можна не вписувати repo URL якщо він
                починається з{" "}
                <span className="text-mono">github.com/{user.githubLogin}</span>
                .
              </div>
            </>
          ) : (
            <>
              <div className="text-[14px] text-gh-fg font-medium">
                Прив'яжи GitHub до акаунту
              </div>
              <div className="text-[12px] text-gh-muted mt-1 leading-relaxed">
                Це потрібно щоб викладач бачив, чий саме репозиторій ти
                здаєш, і щоб ми могли підтягувати твою активність у
                майбутньому. Доступ —{" "}
                <span className="text-mono">read:user</span> (тільки публічний
                профіль).
              </div>
            </>
          )}
          {error && (
            <div className="text-[12px] text-gh-danger mt-2">{error}</div>
          )}
        </div>
        <div className="flex-shrink-0">
          {linked ? (
            <button
              onClick={handleUnlink}
              disabled={unlinking}
              className="btn-gh"
            >
              {unlinking ? "..." : "Відв'язати"}
            </button>
          ) : (
            <button
              onClick={handleLink}
              disabled={!oauthOK}
              className="btn-gh btn-gh-primary inline-flex items-center gap-2"
              title={
                oauthOK
                  ? ""
                  : "Адмін: не налаштовано VITE_GITHUB_CLIENT_ID"
              }
            >
              <GitHubMark />
              Прив'язати
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function GitHubMark({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}
