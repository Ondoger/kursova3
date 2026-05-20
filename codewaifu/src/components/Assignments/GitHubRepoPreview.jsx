import { useEffect, useState } from "react";
import { submissionsApi } from "../../utils/api";

/*
 * Embedded GitHub preview for a single submission.
 *
 * Shows: repo metadata (name, description, stars, language, default
 * branch, last push), the most recent commits since the assignment
 * was published, and PR metadata if the student linked a PR.
 *
 * The actual GitHub API call is server-side (avoids CORS + rate limit
 * burn), see /api/submissions/[id]/github.
 */
export function GitHubRepoPreview({ submissionId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    submissionsApi
      .github(submissionId)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        if (d.error) setError(d.error);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Не вдалось завантажити GitHub-дані");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  if (loading) {
    return <div className="h-32 rounded-md skeleton" />;
  }

  if (error && !data?.repo) {
    return (
      <div className="bg-[#161b22] border border-[#d29922]/40 rounded-md p-3 text-[13px] text-gh-attention">
        GitHub: {error}
      </div>
    );
  }

  if (data?.hint && !data.repo) {
    return (
      <div className="bg-[#161b22] border border-[#30363d] rounded-md p-3 text-[13px] text-gh-muted">
        {data.hint}
      </div>
    );
  }

  const { repo, pr, autocheck } = data ?? {};

  return (
    <div className="space-y-3">
      {autocheck && <AutocheckCard autocheck={autocheck} />}
      {repo && <RepoCard repo={repo} />}
      {pr && <PrCard pr={pr} />}
      {repo && repo.commits && (
        <CommitList commits={repo.commits} />
      )}
    </div>
  );
}

function AutocheckCard({ autocheck }) {
  const score = autocheck.summary?.score ?? 0;
  const color =
    score >= 80 ? "#3fb950" : score >= 50 ? "#d29922" : "#f85149";
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h4 className="text-[14px] font-semibold text-gh-fg">
            Автоперевірка GitHub
          </h4>
          <p className="text-[12px] text-gh-muted">
            README, коміти, PR, дедлайн і файли з вимог завдання.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[24px] font-semibold text-mono" style={{ color }}>
            {score}%
          </div>
          <div className="text-[11px] text-gh-subtle">
            {autocheck.summary.passed}/{autocheck.summary.total}
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        {autocheck.checks.map((check) => (
          <CheckRow key={check.id} check={check} />
        ))}
      </div>
    </div>
  );
}

function CheckRow({ check }) {
  const meta =
    check.status === "pass"
      ? { icon: "✓", cls: "border-[#3fb950]/40 text-[#3fb950] bg-[#3fb950]/10" }
      : check.status === "fail"
        ? { icon: "×", cls: "border-[#f85149]/40 text-[#f85149] bg-[#f85149]/10" }
        : { icon: "i", cls: "border-[#30363d] text-gh-muted bg-[#0d1117]" };
  return (
    <div className="flex items-start gap-2 bg-[#0d1117] border border-[#30363d] rounded-md p-2">
      <span
        className={`w-5 h-5 rounded-full border flex items-center justify-center text-[11px] flex-shrink-0 ${meta.cls}`}
      >
        {meta.icon}
      </span>
      <div className="min-w-0">
        <div className="text-[12px] text-gh-fg font-medium">
          {check.label}
        </div>
        <div className="text-[11px] text-gh-muted">
          {check.detail}
        </div>
      </div>
    </div>
  );
}

function RepoCard({ repo }) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <a
            href={repo.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[15px] font-semibold text-gh-accent hover:underline text-mono"
          >
            {repo.fullName}
          </a>
          {repo.isPrivate && (
            <span className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-[#d29922]/40 bg-[#d29922]/10 text-gh-attention">
              private
            </span>
          )}
          {repo.description && (
            <p className="text-[13px] text-gh-muted mt-1 leading-relaxed">
              {repo.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 text-[12px] text-gh-muted">
          {repo.language && (
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3fb950]" />
              {repo.language}
            </span>
          )}
          <span>★ {formatNumber(repo.stars)}</span>
          <span className="text-gh-subtle text-mono">
            {repo.defaultBranch}
          </span>
        </div>
      </div>
      <div className="text-[11px] text-gh-subtle mt-2">
        Останній push:{" "}
        {repo.pushedAt ? new Date(repo.pushedAt).toLocaleString("uk-UA") : "—"}
      </div>
    </div>
  );
}

function PrCard({ pr }) {
  const stateColor =
    pr.merged
      ? "bg-[#a371f7]/15 border-[#a371f7]/40 text-[#a371f7]"
      : pr.state === "open"
        ? "bg-[#3fb950]/15 border-[#3fb950]/40 text-[#3fb950]"
        : "bg-[#f85149]/15 border-[#f85149]/40 text-[#f85149]";
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span
          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${stateColor}`}
        >
          {pr.merged ? "Merged" : pr.state}
        </span>
        <a
          href={pr.htmlUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[14px] font-semibold text-gh-fg hover:text-gh-accent hover:no-underline"
        >
          PR #{pr.number}: {pr.title}
        </a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px] text-gh-muted">
        <Stat label="Commits" value={pr.commits} />
        <Stat label="Files" value={pr.changedFiles} />
        <Stat label="+lines" value={pr.additions} accent="#3fb950" />
        <Stat label="-lines" value={pr.deletions} accent="#f85149" />
      </div>
      <div className="text-[11px] text-gh-subtle mt-2 text-mono">
        {pr.head} → {pr.base}
        {pr.user && (
          <span className="ml-2">by @{pr.user.login}</span>
        )}
      </div>
    </div>
  );
}

function CommitList({ commits }) {
  if (!commits?.length) {
    return (
      <div className="bg-[#161b22] border border-[#30363d] rounded-md p-3 text-[13px] text-gh-muted">
        Жодного коміта в репо з моменту публікації завдання.
      </div>
    );
  }
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-md">
      <div className="px-3 py-2 border-b border-[#30363d] text-[12px] text-gh-muted">
        Останні коміти ({commits.length})
      </div>
      <ul className="divide-y divide-[#30363d]">
        {commits.map((c) => (
          <li
            key={c.sha}
            className="px-3 py-2 flex items-start gap-3 hover:bg-[#1f2733]"
          >
            {c.authorAvatar ? (
              <img
                src={c.authorAvatar}
                alt={c.authorLogin ?? c.authorName}
                className="w-6 h-6 rounded-full border border-[#30363d] flex-shrink-0 mt-0.5"
              />
            ) : (
              <span className="w-6 h-6 rounded-full border border-[#30363d] bg-[#0d1117] flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <a
                href={c.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] text-gh-fg hover:text-gh-accent hover:no-underline truncate block"
                title={c.message}
              >
                {c.message}
              </a>
              <div className="text-[11px] text-gh-subtle mt-0.5">
                {c.authorLogin ?? c.authorName ?? "—"} ·{" "}
                {c.date ? new Date(c.date).toLocaleString("uk-UA") : ""}
              </div>
            </div>
            <span className="text-[11px] text-mono text-gh-subtle flex-shrink-0">
              {c.shortSha}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <div
        className="text-[16px] font-semibold"
        style={accent ? { color: accent } : { color: "var(--gh-fg)" }}
      >
        {formatNumber(value ?? 0)}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-gh-subtle">
        {label}
      </div>
    </div>
  );
}

function formatNumber(n) {
  if (typeof n !== "number") return String(n ?? "—");
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return String(n);
}
