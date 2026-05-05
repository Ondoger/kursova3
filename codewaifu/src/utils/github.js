const API = "https://api.github.com";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const cacheKey = (username) => `gitquest:stats:${username.toLowerCase()}`;
const headers = (token) => {
  const h = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
};
async function gh(path, token) {
  const res = await fetch(`${API}${path}`, { headers: headers(token) });
  if (!res.ok) {
    if (res.status === 401)
      throw new Error("Недійсний GitHub token або сесія GitHub завершилась.");
    if (res.status === 404) throw new Error("Користувача не знайдено");
    if (res.status === 403)
      throw new Error("Перевищено ліміт GitHub API. Спробуй з токеном.");
    throw new Error(`GitHub API: ${res.status}`);
  }
  return res.json();
}
async function fetchUser(username, token) {
  return gh(`/users/${encodeURIComponent(username)}`, token);
}
export async function fetchAuthenticatedGitHubUser(token) {
  return gh("/user", token);
}
async function fetchRepos(username, token) {
  const all = [];
  for (let page = 1; page <= 4; page++) {
    const part = await gh(
      `/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&sort=updated`,
      token,
    );
    all.push(...part);
    if (part.length < 100) break;
  }
  return all;
}
async function fetchEvents(username, token) {
  const all = [];
  for (let page = 1; page <= 3; page++) {
    try {
      const part = await gh(
        `/users/${encodeURIComponent(username)}/events/public?per_page=100&page=${page}`,
        token,
      );
      all.push(...part);
      if (part.length < 100) break;
    } catch {
      break;
    }
  }
  return all;
}

/**
 * Fetch the contribution calendar from GitHub's profile page.
 * Returns { contributionsByDay: Record<string, number>, totalContributions: number }
 * Falls back gracefully to empty data on failure.
 */
async function fetchContributionCalendar(username) {
  try {
    const res = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(username)}?y=last`,
    );
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = await res.json();
    const byDay = {};
    let total = 0;
    for (const c of json.contributions ?? []) {
      if (c.count > 0) {
        byDay[c.date] = c.count;
        total += c.count;
      }
    }
    return { contributionsByDay: byDay, totalContributions: total };
  } catch {
    // Fallback: scrape from GitHub profile HTML
    try {
      const res = await fetch(
        `https://github.com/users/${encodeURIComponent(username)}/contributions`,
        {
          headers: { Accept: "text/html" },
        },
      );
      if (!res.ok) return { contributionsByDay: {}, totalContributions: 0 };
      const html = await res.text();
      const byDay = {};
      let total = 0;
      // Parse contribution cells: data-date="2024-01-15" data-level="2"
      // and tooltip text like "5 contributions on January 15"
      const cellRegex =
        /data-date="(\d{4}-\d{2}-\d{2})"[^>]*?(?:data-count="(\d+)"|data-level="(\d+)")/g;
      let match;
      while ((match = cellRegex.exec(html)) !== null) {
        const date = match[1];
        const count = parseInt(match[2] ?? match[3] ?? "0", 10);
        if (count > 0) {
          byDay[date] = count;
          total += count;
        }
      }
      return { contributionsByDay: byDay, totalContributions: total };
    } catch {
      return { contributionsByDay: {}, totalContributions: 0 };
    }
  }
}

/**
 * Fetch actual language byte counts across repos using /repos/:owner/:repo/languages
 * Aggregates bytes across all repos for a true picture.
 * Limits to top 15 non-fork repos by stars+updated to avoid rate limiting.
 */
async function fetchRepoLanguages(repos, token) {
  const langBytes = {};
  // Pick non-fork repos, sorted by stars desc, limit to 15 to avoid rate limits
  const candidates = repos
    .filter((r) => !r.fork && r.size > 0)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 15);
  const results = await Promise.allSettled(
    candidates.map((r) => gh(`/repos/${r.full_name}/languages`, token)),
  );
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const langs = result.value;
    for (const [lang, bytes] of Object.entries(langs)) {
      langBytes[lang] = (langBytes[lang] ?? 0) + bytes;
    }
  }
  return langBytes;
}
function computeStreaks(commitsByDay) {
  const days = Object.keys(commitsByDay).sort();
  if (!days.length) return { current: 0, longest: 0 };
  const set = new Set(days);
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const d of days) {
    const date = new Date(d);
    if (prev) {
      const diff = Math.round(
        (date.getTime() - prev.getTime()) / (24 * 3600 * 1000),
      );
      if (diff === 1) run += 1;
      else run = 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = date;
  }
  // current streak counted backwards from today/yesterday
  let current = 0;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  // allow up to 1-day grace (today might just have no events yet)
  const cursor = new Date(today);
  if (!set.has(cursor.toISOString().slice(0, 10))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (set.has(cursor.toISOString().slice(0, 10))) {
    current += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return { current, longest };
}
export function buildStats(
  user,
  repos,
  events,
  contributions = {},
  langBytes = {},
) {
  const totalStars = repos.reduce((a, r) => a + r.stargazers_count, 0);
  const totalForks = repos.reduce((a, r) => a + r.forks_count, 0);

  // Use real language bytes if available, fall back to repo-level counting
  let languages;
  let languageSource = "repos"; // 'bytes' or 'repos'
  if (Object.keys(langBytes).length > 0) {
    languages = langBytes;
    languageSource = "bytes";
  } else {
    languages = {};
    for (const r of repos) {
      if (r.language) languages[r.language] = (languages[r.language] ?? 0) + 1;
    }
  }

  // --- Contributions from events (fallback) ---
  const eventCommitsByDay = {};
  const eventCommitsByMonth = {};
  const commitsByHour = Array(24).fill(0);
  let eventTotalCommits = 0;
  let nightOwlCommits = 0;
  let earlyBirdCommits = 0;
  let prsOpened = 0;
  let prsMerged = 0;
  let issuesOpened = 0;
  for (const ev of events) {
    const date = new Date(ev.created_at);
    const day = date.toISOString().slice(0, 10);
    const month = date.toISOString().slice(0, 7);
    const hour = date.getUTCHours();
    if (ev.type === "PushEvent") {
      const count = ev.payload.commits?.length ?? 0;
      eventTotalCommits += count;
      eventCommitsByDay[day] = (eventCommitsByDay[day] ?? 0) + count;
      eventCommitsByMonth[month] = (eventCommitsByMonth[month] ?? 0) + count;
      commitsByHour[hour] += count;
      if (count > 0) {
        if (hour >= 0 && hour < 4) nightOwlCommits += count;
        if (hour >= 5 && hour < 8) earlyBirdCommits += count;
      }
    } else if (ev.type === "PullRequestEvent") {
      if (ev.payload.action === "opened") prsOpened += 1;
      if (ev.payload.action === "closed" && ev.payload.pull_request?.merged)
        prsMerged += 1;
    } else if (ev.type === "IssuesEvent") {
      if (ev.payload.action === "opened") issuesOpened += 1;
    }
  }

  // --- Use contribution calendar data if available, merge with events ---
  const { contributionsByDay = {}, totalContributions = 0 } = contributions;
  const hasCalendar = Object.keys(contributionsByDay).length > 0;

  // commitsByDay: prefer calendar (full year), merge with events for recent detail
  const commitsByDay = { ...contributionsByDay };
  // For days covered by events that calendar missed, add them
  for (const [day, count] of Object.entries(eventCommitsByDay)) {
    if (!commitsByDay[day] || commitsByDay[day] < count) {
      commitsByDay[day] = count;
    }
  }

  // commitsByMonth: aggregate from commitsByDay for consistency
  const commitsByMonth = {};
  for (const [day, count] of Object.entries(commitsByDay)) {
    const month = day.slice(0, 7);
    commitsByMonth[month] = (commitsByMonth[month] ?? 0) + count;
  }

  // totalCommits: use calendar total if available
  let totalCommits = hasCalendar
    ? Math.max(totalContributions, eventTotalCommits)
    : eventTotalCommits;
  const fallbackCommits = Math.max(
    totalCommits,
    repos.filter((r) => !r.fork).length * 4,
  );
  totalCommits = Math.max(totalCommits, fallbackCommits);

  const { current, longest } = computeStreaks(commitsByDay);
  return {
    user,
    repos,
    events,
    totalCommits,
    totalStars,
    totalForks,
    totalRepos: repos.length,
    publicRepos: user.public_repos,
    followers: user.followers,
    following: user.following,
    currentStreak: current,
    longestStreak: longest,
    languages,
    languageSource,
    languagesCount: Object.keys(languages).length,
    commitsByDay,
    commitsByHour,
    commitsByMonth,
    prsOpened,
    prsMerged,
    issuesOpened,
    nightOwlCommits,
    earlyBirdCommits,
    fetchedAt: Date.now(),
  };
}
export async function fetchGitHubStats(username, token, options = {}) {
  const key = cacheKey(username);
  if (!options.force) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Date.now() - cached.fetchedAt < CACHE_TTL) return cached;
      }
    } catch {
      /* ignore */
    }
  }
  const [user, repos, events, contributions] = await Promise.all([
    fetchUser(username, token),
    fetchRepos(username, token),
    fetchEvents(username, token),
    fetchContributionCalendar(username),
  ]);
  // Fetch real language bytes (uses repos list, so must wait for repos)
  const langBytes = await fetchRepoLanguages(repos, token);
  const stats = buildStats(user, repos, events, contributions, langBytes);
  try {
    localStorage.setItem(key, JSON.stringify(stats));
  } catch {
    /* storage may be full */
  }
  return stats;
}
export async function fetchLeaderboard(token) {
  const cacheK = "gitquest:leaderboard";
  try {
    const raw = localStorage.getItem(cacheK);
    if (raw) {
      const cached = JSON.parse(raw);
      if (Date.now() - cached.at < CACHE_TTL) return cached.data;
    }
  } catch {
    /* ignore */
  }
  // Fetch top users by followers
  const data = await gh(
    `/search/users?q=followers:%3E10000&sort=followers&order=desc&per_page=10`,
    token,
  );
  const enriched = await Promise.all(
    data.items.map(async (u) => {
      try {
        const full = await gh(`/users/${u.login}`, token);
        return {
          login: full.login,
          avatar_url: full.avatar_url,
          html_url: full.html_url,
          followers: full.followers,
          public_repos: full.public_repos,
        };
      } catch {
        return {
          login: u.login,
          avatar_url: u.avatar_url,
          html_url: u.html_url,
          followers: 0,
          public_repos: 0,
        };
      }
    }),
  );
  try {
    localStorage.setItem(
      cacheK,
      JSON.stringify({ at: Date.now(), data: enriched }),
    );
  } catch {
    /* ignore */
  }
  return enriched;
}
