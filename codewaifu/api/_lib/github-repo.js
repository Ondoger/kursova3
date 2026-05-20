/*
 * Lightweight GitHub repo introspection used by the submission view.
 *
 * - Public-API only (no auth) — gets us 60 requests/hour per IP, which
 *   is plenty for manual grading. If RESEND-style limits start hurting,
 *   we'll switch to a server-side PAT (`GITHUB_PAT` env) and bump to
 *   5000/hour.
 * - We DON'T cache responses here; the React Query layer on the client
 *   handles dedup. Server stays stateless.
 */

const GH = "https://api.github.com";

/**
 * Parse strings like:
 *   https://github.com/torvalds/linux
 *   https://github.com/torvalds/linux.git
 *   https://github.com/torvalds/linux/tree/master
 *   https://github.com/torvalds/linux/pull/12345
 *   git@github.com:torvalds/linux.git
 *
 * Returns { owner, repo, prNumber? } or null.
 */
export function parseRepoUrl(url) {
  if (!url || typeof url !== "string") return null;

  // SSH form: git@github.com:owner/repo(.git)
  const ssh = /^git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?$/.exec(url.trim());
  if (ssh) return { owner: ssh[1], repo: ssh[2] };

  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (!/^(www\.)?github\.com$/.test(u.hostname)) return null;

  const parts = u.pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (parts.length < 2) return null;
  const owner = parts[0];
  let repo = parts[1].replace(/\.git$/, "");
  let prNumber = null;
  if (parts[2] === "pull" && parts[3]) {
    const n = Number(parts[3]);
    if (Number.isInteger(n) && n > 0) prNumber = n;
  }
  return { owner, repo, prNumber };
}

function ghHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "GitQuest-server",
  };
  if (process.env.GITHUB_PAT) {
    headers.Authorization = `Bearer ${process.env.GITHUB_PAT}`;
  }
  return headers;
}

async function ghJson(path, opts = {}) {
  const r = await fetch(`${GH}${path}`, { headers: ghHeaders(), ...opts });
  if (r.status === 404) return null;
  if (r.status === 403) {
    const remaining = r.headers.get("x-ratelimit-remaining");
    const reset = r.headers.get("x-ratelimit-reset");
    throw new Error(
      `GitHub rate-limited (remaining=${remaining}, reset=${reset}). Add GITHUB_PAT to env to bump the limit.`,
    );
  }
  if (!r.ok) throw new Error(`GitHub ${r.status} on ${path}`);
  return r.json();
}

/**
 * Fetch a compact summary of a repo for the submission preview.
 */
export async function fetchRepoSummary({ owner, repo, since }) {
  const [meta, commits] = await Promise.all([
    ghJson(`/repos/${owner}/${repo}`),
    ghJson(
      `/repos/${owner}/${repo}/commits?per_page=10${since ? `&since=${encodeURIComponent(since)}` : ""}`,
    ),
  ]);
  if (!meta) return null;
  return {
    fullName: meta.full_name,
    htmlUrl: meta.html_url,
    description: meta.description,
    defaultBranch: meta.default_branch,
    pushedAt: meta.pushed_at,
    stars: meta.stargazers_count,
    isPrivate: meta.private,
    language: meta.language,
    commits: (commits ?? []).map((c) => ({
      sha: c.sha,
      shortSha: c.sha.slice(0, 7),
      message: c.commit?.message?.split("\n")[0] ?? "",
      authorName: c.commit?.author?.name ?? null,
      authorLogin: c.author?.login ?? null,
      authorAvatar: c.author?.avatar_url ?? null,
      date: c.commit?.author?.date ?? c.commit?.committer?.date,
      htmlUrl: c.html_url,
    })),
  };
}

function encodePathForGitHub(path) {
  return String(path)
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function check(id, label, status, detail) {
  return { id, label, status, passed: status === "pass", detail };
}

export async function fetchRepoAutocheck({
  owner,
  repo,
  assignment,
  submission,
  repoSummary,
  pr,
}) {
  const githubHint = assignment?.githubHint ?? {};
  const requiredPaths = Array.isArray(githubHint.requiredPaths)
    ? githubHint.requiredPaths.filter(Boolean)
    : [];
  const minCommits = Number(githubHint.minCommits ?? 1) || 1;
  const commitCount = repoSummary?.commits?.length ?? 0;

  const [readme, requiredFiles] = await Promise.all([
    ghJson(`/repos/${owner}/${repo}/readme`),
    Promise.all(
      requiredPaths.map(async (path) => ({
        path,
        found: Boolean(
          await ghJson(`/repos/${owner}/${repo}/contents/${encodePathForGitHub(path)}`),
        ),
      })),
    ),
  ]);

  const submittedAt = submission?.submittedAt
    ? new Date(submission.submittedAt)
    : null;
  const deadlineAt = assignment?.deadlineAt
    ? new Date(assignment.deadlineAt)
    : null;

  const checks = [
    check(
      "readme",
      "README доданий",
      readme ? "pass" : "fail",
      readme ? "README знайдено в репозиторії" : "README.md не знайдено",
    ),
    check(
      "commits",
      `Комітів після видачі: ${minCommits}+`,
      commitCount >= minCommits ? "pass" : "fail",
      `${commitCount}/${minCommits} комітів`,
    ),
    check(
      "pull-request",
      "Pull Request",
      submission?.prUrl || pr ? "pass" : "fail",
      submission?.prUrl || pr ? "PR прикріплений" : "PR не вказаний",
    ),
    check(
      "deadline",
      "Дедлайн",
      !deadlineAt || (submittedAt && submittedAt <= deadlineAt) ? "pass" : "fail",
      !deadlineAt
        ? "Дедлайн не заданий"
        : submittedAt && submittedAt <= deadlineAt
          ? "Здано вчасно"
          : "Здано після дедлайну",
    ),
  ];

  if (requiredFiles.length === 0) {
    checks.push(check(
      "required-files",
      "Обов'язкові файли",
      "info",
      "Викладач не задав список файлів",
    ));
  } else {
    for (const file of requiredFiles) {
      checks.push(check(
        `file:${file.path}`,
        `Файл: ${file.path}`,
        file.found ? "pass" : "fail",
        file.found ? "Знайдено" : "Не знайдено",
      ));
    }
  }

  const scorable = checks.filter((c) => c.status !== "info");
  const passed = scorable.filter((c) => c.passed).length;
  return {
    checks,
    summary: {
      passed,
      total: scorable.length,
      score: scorable.length ? Math.round((passed / scorable.length) * 100) : 100,
      commitCount,
      hasReadme: Boolean(readme),
    },
  };
}

/**
 * Fetch a single PR's metadata (when the submission was a PR URL).
 */
export async function fetchPrSummary({ owner, repo, prNumber }) {
  const pr = await ghJson(`/repos/${owner}/${repo}/pulls/${prNumber}`);
  if (!pr) return null;
  return {
    number: pr.number,
    title: pr.title,
    state: pr.state,
    merged: pr.merged,
    htmlUrl: pr.html_url,
    base: pr.base?.ref,
    head: pr.head?.ref,
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changed_files,
    commits: pr.commits,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    mergedAt: pr.merged_at,
    user: pr.user
      ? {
          login: pr.user.login,
          avatarUrl: pr.user.avatar_url,
          htmlUrl: pr.user.html_url,
        }
      : null,
  };
}
