import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { roomsApi, submissionsApi } from "../../utils/api";

const EMPTY_DAYS = [];

export function TeacherPanel({ room }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const refresh = async () => {
    try {
      const next = await roomsApi.teacherDashboard(room.id);
      setData(next);
      setError(null);
    } catch (e) {
      setError(e?.message ?? "Не вдалось завантажити аналітику");
    }
  };

  useEffect(() => {
    let cancelled = false;
    roomsApi
      .teacherDashboard(room.id)
      .then((next) => {
        if (cancelled) return;
        setData(next);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Не вдалось завантажити аналітику");
      });
    return () => {
      cancelled = true;
    };
  }, [room.id]);

  if (error) {
    return (
      <div className="bg-[#161b22] border border-[#f85149]/40 text-gh-danger rounded-md p-4">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="h-80 rounded-md skeleton" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Студентів" value={data.totals.students} />
        <Metric label="Очікують оцінки" value={data.totals.queue} accent="#d29922" />
        <Metric label="Оцінено" value={data.totals.graded} accent="#3fb950" />
        <Metric label="Пропущено" value={data.totals.missing} accent="#f85149" />
      </div>

      <section className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-semibold text-gh-fg">
            Heatmap активності класу
          </h3>
          <span className="text-[12px] text-gh-muted">
            здачі + оцінки за останні {data.activityHeatmap?.weeks ?? 12} тижнів
          </span>
        </div>
        <ClassActivityHeatmap heatmap={data.activityHeatmap} />
        <div className="mt-5 pt-4 border-t border-[#30363d]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[13px] font-semibold text-gh-fg">
              Останні 14 днів
            </h4>
            <span className="text-[12px] text-gh-muted">
              синій — здачі, зелений — оцінки
            </span>
          </div>
          <ActivityChart rows={data.activity} />
        </div>
      </section>

      <section className="bg-[#161b22] border border-[#30363d] rounded-md">
        <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-gh-fg">
            Швидке оцінювання
          </h3>
          <span className="text-[12px] text-gh-muted">
            {data.queue.length} робіт у черзі
          </span>
        </div>
        {data.queue.length === 0 ? (
          <div className="p-6 text-center text-[14px] text-gh-muted">
            Черга порожня — усі здані роботи вже оцінені.
          </div>
        ) : (
          <div className="divide-y divide-[#30363d]">
            {data.queue.map((submission) => (
              <QuickGradeRow
                key={submission.id}
                submission={submission}
                onGraded={refresh}
              />
            ))}
          </div>
        )}
      </section>

      <section className="bg-[#161b22] border border-[#30363d] rounded-md">
        <div className="px-4 py-3 border-b border-[#30363d]">
          <h3 className="text-[15px] font-semibold text-gh-fg">
            Прогрес студентів
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="text-gh-muted border-b border-[#30363d]">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Студент</th>
                <th className="text-right px-4 py-2 font-medium">Здав</th>
                <th className="text-right px-4 py-2 font-medium">Оцінено</th>
                <th className="text-right px-4 py-2 font-medium">Не здав</th>
                <th className="text-right px-4 py-2 font-medium">Середнє</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d]">
              {data.students.map((row) => (
                <StudentProgressRow key={row.student.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {data.missingByAssignment.some((a) => a.missingCount > 0) && (
        <section className="bg-[#161b22] border border-[#30363d] rounded-md">
          <div className="px-4 py-3 border-b border-[#30363d]">
            <h3 className="text-[15px] font-semibold text-gh-fg">
              Хто ще не здав
            </h3>
          </div>
          <div className="divide-y divide-[#30363d]">
            {data.missingByAssignment
              .filter((a) => a.missingCount > 0)
              .map((a) => (
                <MissingAssignmentRow key={a.assignmentId} assignment={a} />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({ label, value, accent = "#58a6ff" }) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-md p-3">
      <div className="text-[26px] font-semibold text-mono" style={{ color: accent }}>
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-gh-muted">
        {label}
      </div>
    </div>
  );
}

function ClassActivityHeatmap({ heatmap }) {
  const days = heatmap?.days ?? EMPTY_DAYS;
  const { grid, max } = useMemo(() => {
    const cols = [];
    for (let i = 0; i < days.length; i += 7) {
      cols.push(days.slice(i, i + 7));
    }
    return {
      grid: cols,
      max: Math.max(1, heatmap?.max ?? 0, ...days.map((day) => day.total ?? 0)),
    };
  }, [days, heatmap?.max]);

  if (days.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[#30363d] bg-[#0d1117] p-4 text-[13px] text-gh-muted">
        Поки немає активності для heatmap.
      </div>
    );
  }

  const colorFor = (count) => {
    if (!count) return "#0d1117";
    const ratio = Math.min(1, count / max);
    if (ratio < 0.25) return "rgba(46, 160, 67, 0.28)";
    if (ratio < 0.5) return "rgba(46, 160, 67, 0.48)";
    if (ratio < 0.75) return "rgba(63, 185, 80, 0.68)";
    return "rgba(63, 185, 80, 0.95)";
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <MiniHeatmapStat label="подій" value={heatmap.total} />
        <MiniHeatmapStat label="активних днів" value={heatmap.activeDays} />
        <MiniHeatmapStat label="макс/день" value={heatmap.max} />
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2 min-w-max">
          <div className="grid grid-rows-7 gap-1 text-[10px] text-gh-subtle pr-1">
            {["Нд", "", "Вт", "", "Чт", "", "Сб"].map((label, idx) => (
              <span key={`${label}-${idx}`} className="h-3.5 leading-[14px]">
                {label}
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            {grid.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-1">
                {week.map((day) => (
                  <span
                    key={day.date}
                    className="w-3.5 h-3.5 rounded-[3px] border border-[#30363d]"
                    style={{ background: colorFor(day.total) }}
                    title={`${formatDate(day.date)}: ${day.total} подій · ${day.submitted} здач · ${day.graded} оцінок · ${day.activeStudents} активних студентів`}
                    aria-label={`${formatDate(day.date)}: ${day.total} подій`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[12px] text-gh-muted">
          Темні клітинки — без активності, яскравіші — більше подій у класі.
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-gh-subtle">
          <span>менше</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className="w-3 h-3 rounded-[3px] border border-[#30363d]"
              style={{ background: colorFor(level === 0 ? 0 : (max * level) / 4) }}
            />
          ))}
          <span>більше</span>
        </div>
      </div>
    </div>
  );
}

function MiniHeatmapStat({ label, value }) {
  return (
    <div className="rounded-md bg-[#0d1117] border border-[#30363d] px-3 py-2">
      <div className="text-[18px] text-mono text-gh-fg font-semibold">
        {value ?? 0}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-gh-muted">
        {label}
      </div>
    </div>
  );
}

function formatDate(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "short",
  });
}

function formatDayNumber(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("uk-UA", {
    day: "2-digit",
  });
}

function formatMonthShort(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("uk-UA", {
    month: "short",
  });
}

function ActivityChart({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.submitted + r.graded));
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex gap-2 min-w-max">
        {rows.map((row) => {
          const submittedH = row.submitted ? Math.max(8, (row.submitted / max) * 92) : 4;
          const gradedH = row.graded ? Math.max(8, (row.graded / max) * 92) : 4;
          const total = row.submitted + row.graded;
          return (
            <div
              key={row.date}
              className={`w-[68px] shrink-0 rounded-md border p-2 transition-colors ${
                total
                  ? "border-[#30363d] bg-[#0d1117]"
                  : "border-[#30363d]/70 bg-[#0d1117]/55"
              }`}
            >
              <div className="mb-2 text-center">
                <div className="text-[14px] font-semibold text-gh-fg leading-none">
                  {formatDayNumber(row.date)}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wide text-gh-subtle leading-none">
                  {formatMonthShort(row.date)}
                </div>
              </div>
              <div className="h-24 flex items-end justify-center gap-1.5">
                <div
                  className="w-2.5 rounded-t bg-[#58a6ff]"
                  style={{ height: submittedH }}
                  title={`${formatDate(row.date)}: ${row.submitted} здач`}
                />
                <div
                  className="w-2.5 rounded-t bg-[#3fb950]"
                  style={{ height: gradedH }}
                  title={`${formatDate(row.date)}: ${row.graded} оцінок`}
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-center text-[10px] text-mono">
                <span className="rounded bg-[#58a6ff]/10 text-[#58a6ff] py-0.5">
                  {row.submitted}
                </span>
                <span className="rounded bg-[#3fb950]/10 text-[#3fb950] py-0.5">
                  {row.graded}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuickGradeRow({ submission, onGraded }) {
  const [points, setPoints] = useState(submission.maxPoints);
  const [feedback, setFeedback] = useState("Перевірено, зараховано.");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await submissionsApi.grade(submission.id, {
        points: Number(points),
        feedback,
      });
      onGraded?.();
    } catch (e) {
      setError(e?.message ?? "Не вдалось оцінити");
    } finally {
      setSaving(false);
    }
  };
  const earnedCoins = Math.round(
    Math.max(0, Number(submission.rewardCoins ?? submission.maxPoints) || 0) *
      Math.max(0, Math.min(1, Number(points) / Math.max(1, Number(submission.maxPoints) || 100))),
  );

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Avatar user={submission.student} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] text-gh-fg font-medium">
            {submission.student?.name ?? submission.student?.email}
          </div>
          <Link
            to={`/assignments/${submission.assignmentId}`}
            className="text-[12px] text-gh-accent hover:underline"
          >
            {submission.assignmentTitle}
          </Link>
          <div className="text-[11px] text-gh-subtle">
            Здано{" "}
            {submission.submittedAt
              ? new Date(submission.submittedAt).toLocaleString("uk-UA")
              : "—"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={submission.maxPoints}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="input-gh w-20 text-center text-mono"
          />
          <span className="text-[12px] text-gh-muted">/ {submission.maxPoints}</span>
        </div>
      </div>
      <div className="text-[12px] text-gh-muted">
        Нагорода: <span className="text-gh-attention text-mono">{earnedCoins} ⓒ</span>
      </div>
      <div className="flex gap-2">
        {[1, 0.8, 0.6].map((mult) => (
          <button
            key={mult}
            type="button"
            onClick={() => setPoints(Math.round(submission.maxPoints * mult))}
            className="btn-gh text-[12px]"
          >
            {Math.round(mult * 100)}%
          </button>
        ))}
        <input
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="input-gh flex-1"
          maxLength={2000}
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-gh btn-gh-primary whitespace-nowrap"
        >
          {saving ? "..." : "Оцінити"}
        </button>
      </div>
      {error && <div className="text-[12px] text-gh-danger">{error}</div>}
    </div>
  );
}

function StudentProgressRow({ row }) {
  return (
    <tr className="hover:bg-[#1f2733]">
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <Avatar user={row.student} />
          <div className="min-w-0">
            <div className="text-gh-fg truncate">
              {row.student.name ?? row.student.email}
            </div>
            <div className="text-[11px] text-gh-subtle truncate">
              {row.student.githubLogin ? `@${row.student.githubLogin}` : row.student.email}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-2 text-right text-mono">{row.submitted}</td>
      <td className="px-4 py-2 text-right text-mono text-[#3fb950]">{row.graded}</td>
      <td className="px-4 py-2 text-right text-mono text-[#f85149]">{row.missing}</td>
      <td className="px-4 py-2 text-right text-mono">
        {row.avgPercent === null ? "—" : `${row.avgPercent}%`}
      </td>
    </tr>
  );
}

function MissingAssignmentRow({ assignment }) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <Link
          to={`/assignments/${assignment.assignmentId}`}
          className="text-[14px] font-semibold text-gh-fg hover:text-gh-accent hover:no-underline"
        >
          {assignment.title}
        </Link>
        <span className="text-[12px] text-gh-danger">
          {assignment.missingCount} не здали
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {assignment.missing.slice(0, 10).map((student) => (
          <span
            key={student.id}
            className="text-[12px] px-2 py-1 rounded-full bg-[#0d1117] border border-[#30363d] text-gh-muted"
          >
            {student.name ?? student.email}
          </span>
        ))}
        {assignment.missing.length > 10 && (
          <span className="text-[12px] text-gh-subtle">
            +{assignment.missing.length - 10}
          </span>
        )}
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
        className="w-8 h-8 rounded-full border border-[#30363d] flex-shrink-0"
      />
    );
  }
  const initial = (user?.name ?? user?.email ?? "?").slice(0, 1).toUpperCase();
  return (
    <span className="w-8 h-8 rounded-full border border-[#30363d] bg-[#0d1117] flex items-center justify-center text-[12px] font-semibold text-gh-fg flex-shrink-0">
      {initial}
    </span>
  );
}
