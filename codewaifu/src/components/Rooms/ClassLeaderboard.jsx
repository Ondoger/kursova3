import { useEffect, useMemo, useState } from "react";
import { roomsApi } from "../../utils/api";

const DEFAULT_METRICS = [
  { key: "coins", label: "Коїни", suffix: "ⓒ" },
  { key: "submitted", label: "Здано", suffix: "" },
  { key: "completionRate", label: "% виконання", suffix: "%" },
  { key: "averagePercent", label: "Середня оцінка", suffix: "%" },
  { key: "recentActivity", label: "Активність 14д", suffix: "" },
];

export function ClassLeaderboard({ room }) {
  const [data, setData] = useState(null);
  const [metricKey, setMetricKey] = useState("coins");
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    roomsApi
      .leaderboard(room.id)
      .then((next) => {
        if (cancelled) return;
        setData(next);
        setMetricKey(next.metrics?.[0]?.key ?? "coins");
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Не вдалось завантажити рейтинг");
      });
    return () => {
      cancelled = true;
    };
  }, [room.id]);

  const metrics = data?.metrics?.length ? data.metrics : DEFAULT_METRICS;
  const selectedMetric = metrics.find((metric) => metric.key === metricKey) ?? metrics[0];
  const entries = useMemo(() => {
    const rows = data?.entries ?? [];
    return [...rows].sort((a, b) => {
      const av = a.metrics?.[selectedMetric.key] ?? 0;
      const bv = b.metrics?.[selectedMetric.key] ?? 0;
      if (bv !== av) return bv - av;
      if ((b.metrics?.coins ?? 0) !== (a.metrics?.coins ?? 0)) {
        return (b.metrics?.coins ?? 0) - (a.metrics?.coins ?? 0);
      }
      return (a.student?.name ?? a.student?.email ?? "").localeCompare(
        b.student?.name ?? b.student?.email ?? "",
        "uk",
      );
    });
  }, [data?.entries, selectedMetric.key]);

  if (error) {
    return (
      <div className="bg-[#161b22] border border-[#f85149]/40 text-gh-danger rounded-md p-4">
        {error}
      </div>
    );
  }

  if (!data) return <div className="h-80 rounded-md skeleton" />;

  return (
    <section className="bg-[#161b22] border border-[#30363d] rounded-md">
      <div className="px-4 py-3 border-b border-[#30363d] flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[16px] font-semibold text-gh-fg">Рейтинг класу</h3>
          <p className="text-[12px] text-gh-muted mt-1">
            {data.summary.students} студентів · {data.summary.publishedAssignments} опублікованих завдань
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {metrics.map((metric) => {
            const active = metric.key === selectedMetric.key;
            return (
              <button
                key={metric.key}
                type="button"
                onClick={() => setMetricKey(metric.key)}
                className={`px-2.5 py-1 rounded-md text-[12px] border transition-colors ${
                  active
                    ? "border-[#58a6ff] bg-[#1f6feb]/20 text-[#58a6ff]"
                    : "border-[#30363d] text-gh-muted hover:text-gh-fg hover:border-[#8b949e]"
                }`}
              >
                {metric.label}
              </button>
            );
          })}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="p-8 text-center text-[14px] text-gh-muted">
          У класі ще немає студентів для рейтингу.
        </div>
      ) : (
        <div className="divide-y divide-[#30363d]">
          {entries.map((entry, index) => (
            <LeaderboardRow
              key={entry.student.id}
              entry={entry}
              rank={index + 1}
              metric={selectedMetric}
              maxValue={entries[0]?.metrics?.[selectedMetric.key] ?? 0}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function LeaderboardRow({ entry, rank, metric, maxValue }) {
  const value = entry.metrics?.[metric.key] ?? 0;
  const width = maxValue > 0 ? Math.max(7, Math.round((value / maxValue) * 100)) : 0;
  const medal = rank === 1 ? "#d29922" : rank === 2 ? "#8b949e" : rank === 3 ? "#c69026" : "#6e7681";

  return (
    <div className="p-4 hover:bg-[#1f2733] transition-colors">
      <div className="flex items-center gap-3">
        <span className="w-7 text-center text-[16px] font-semibold text-mono" style={{ color: medal }}>
          {rank}
        </span>
        <Avatar user={entry.student} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium text-gh-fg truncate">
            {entry.student.name ?? entry.student.email}
          </div>
          <div className="text-[11px] text-gh-subtle truncate">
            {entry.student.githubLogin ? `@${entry.student.githubLogin}` : entry.student.email}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[18px] text-mono font-semibold text-gh-fg">
            {formatMetric(value, metric.suffix)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-gh-muted">
            {metric.label}
          </div>
        </div>
      </div>

      <div className="mt-3 grid md:grid-cols-[1fr_auto] gap-3 items-center">
        <div className="h-2 rounded-full bg-[#0d1117] border border-[#30363d] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1f6feb] to-[#3fb950]"
            style={{ width: `${width}%` }}
          />
        </div>
        <div className="flex items-center gap-3 text-[11px] text-gh-muted text-mono">
          <span>{entry.metrics.submitted} здано</span>
          <span>{entry.metrics.completionRate}% виконання</span>
          <span>{entry.metrics.averagePercent}% середнє</span>
        </div>
      </div>
    </div>
  );
}

function Avatar({ user }) {
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name ?? user.email}
        className="w-9 h-9 rounded-full border border-[#30363d] flex-shrink-0"
      />
    );
  }
  const initial = (user?.name ?? user?.email ?? "?").slice(0, 1).toUpperCase();
  return (
    <span className="w-9 h-9 rounded-full border border-[#30363d] bg-[#0d1117] flex items-center justify-center text-[13px] font-semibold text-gh-fg flex-shrink-0">
      {initial}
    </span>
  );
}

function formatMetric(value, suffix) {
  if (suffix === "%") return `${value}%`;
  if (suffix) return `${value} ${suffix}`;
  return value;
}
