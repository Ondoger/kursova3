import { useEffect, useState } from "react";
import { roomsApi } from "../../utils/api";

function defaultEndsAt() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setMinutes(0, 0, 0);
  return toDatetimeLocal(date);
}

function toDatetimeLocal(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function TeamQuests({ room, isStaff }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const refresh = async () => {
    try {
      const next = await roomsApi.teamQuests(room.id);
      setData(next);
      setError(null);
    } catch (e) {
      setError(e?.message ?? "Не вдалось завантажити командні квести");
    }
  };

  useEffect(() => {
    let cancelled = false;
    roomsApi
      .teamQuests(room.id)
      .then((next) => {
        if (cancelled) return;
        setData(next);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Не вдалось завантажити командні квести");
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

  if (!data) return <div className="h-80 rounded-md skeleton" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[16px] font-semibold text-gh-fg">Team Project Sprint</h2>
          <p className="text-[12px] text-gh-muted mt-1">
            Команди працюють в одному GitHub repo. Немає рейтингу або обовʼязкового мінімуму комітів — викладач бачить аналітику як підказку.
          </p>
        </div>
        {isStaff && (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="btn-gh btn-gh-primary"
          >
            {showCreate ? "Сховати форму" : "+ Новий project sprint"}
          </button>
        )}
      </div>

      {showCreate && isStaff && (
        <CreateTeamQuestForm
          room={room}
          studentCount={data.studentCount ?? 0}
          onCreated={() => {
            setShowCreate(false);
            refresh();
          }}
        />
      )}

      {data.quests.length === 0 ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-md p-8 text-center">
          <div className="text-[40px] mb-2 opacity-60">🤝</div>
          <h3 className="text-[16px] font-semibold text-gh-fg mb-1">
            Командних project sprint ще немає
          </h3>
          <p className="text-[13px] text-gh-muted">
            {isStaff
              ? "Створи sprint — система сама розподілить студентів на команди."
              : "Викладач ще не запустив командний sprint."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.quests.map((quest) => (
            <TeamQuestCard
              key={quest.id}
              room={room}
              quest={quest}
              isStaff={isStaff}
              onUpdated={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateTeamQuestForm({ room, studentCount, onCreated }) {
  const [title, setTitle] = useState("Mini App Sprint");
  const [description, setDescription] = useState("");
  const [teamSize, setTeamSize] = useState(3);
  const [endsAt, setEndsAt] = useState(defaultEndsAt());
  const [reward, setReward] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const hasEnoughStudents = studentCount >= 2;
  const maxTeamSize = Math.max(2, Math.min(8, studentCount || 2));

  const submit = async (e) => {
    e.preventDefault();
    if (!hasEnoughStudents) {
      setError(`У класі зараз ${studentCount} студентів. Додай ще студентів через код-запрошення, тоді командний квест можна буде створити.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await roomsApi.createTeamQuest(room.id, {
        title,
        description,
        teamSize: Math.min(Number(teamSize), maxTeamSize),
        endsAt: new Date(endsAt).toISOString(),
        reward,
      });
      onCreated?.();
    } catch (err) {
      setError(err?.message ?? "Не вдалось створити project sprint");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-[#161b22] border border-[#30363d] rounded-md p-4 space-y-3">
      <div className={`rounded-md border px-3 py-2 text-[12px] ${hasEnoughStudents ? "border-[#30363d] text-gh-muted bg-[#0d1117]" : "border-[#d29922]/40 text-gh-attention bg-[#d29922]/10"}`}>
        У класі студентів: <span className="text-mono font-semibold">{studentCount}</span>. Система розподілить їх по командах, але не ставитиме персональні мінімуми комітів чи PR.
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[13px] font-semibold text-gh-fg">Назва</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-gh mt-1"
            maxLength={120}
            required
            placeholder="Напр. Mini Kanban App"
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold text-gh-fg">Розмір команди</span>
          <input
            type="number"
            min={2}
            max={maxTeamSize}
            value={teamSize}
            onChange={(e) => setTeamSize(Math.max(2, Math.min(Number(e.target.value) || 2, maxTeamSize)))}
            className="input-gh mt-1"
            disabled={!hasEnoughStudents}
            required
          />
          <span className="text-[11px] text-gh-muted mt-1 block">
            максимум зараз: {maxTeamSize}
          </span>
        </label>
      </div>
      <label className="block">
        <span className="text-[13px] font-semibold text-gh-fg">Завдання від викладача</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-gh mt-1 resize-y min-h-[90px]"
          maxLength={1000}
          placeholder="Опиши маленький застосунок, який команди мають зробити разом. Напр. Kanban з колонками Todo/Doing/Done, локальним збереженням і demo link."
        />
      </label>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[13px] font-semibold text-gh-fg">Завершення</span>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="input-gh mt-1"
            required
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold text-gh-fg">Нагорода</span>
          <input
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            className="input-gh mt-1"
            maxLength={160}
            placeholder="Напр. +30 коїнів кожному активному учаснику"
          />
        </label>
      </div>
      {error && <div className="text-[12px] text-gh-danger">{error}</div>}
      <button type="submit" disabled={saving || !hasEnoughStudents} className="btn-gh btn-gh-primary">
        {!hasEnoughStudents ? "Потрібно 2+ студентів" : saving ? "Створюємо..." : "Створити sprint"}
      </button>
    </form>
  );
}

function TeamQuestCard({ room, quest, isStaff, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const avgProgress = Math.round(
    quest.teams.reduce((sum, team) => sum + (team.completeness?.percent ?? 0), 0) /
      Math.max(1, quest.teams.length),
  );
  const deleteQuest = async () => {
    if (!confirm(`Видалити командний sprint "${quest.title}"?`)) return;
    try {
      await roomsApi.deleteTeamQuest(room.id, quest.id);
      onUpdated?.();
    } catch (e) {
      alert(e?.message ?? "Не вдалось видалити командний sprint");
    }
  };
  return (
    <section className="bg-[#161b22] border border-[#30363d] rounded-md overflow-hidden">
      <div
        className="p-4 border-b border-[#30363d] flex items-start justify-between gap-3 flex-wrap cursor-pointer hover:bg-[#1f2733]/35 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[16px] font-semibold text-gh-fg truncate">
              {quest.title}
            </h3>
            <StatusBadge status={quest.status} />
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#58a6ff]/40 text-[#58a6ff] bg-[#1f6feb]/10">
              shared repo
            </span>
          </div>
          <p className="text-[12px] text-gh-muted mt-1">
            До {formatDateTime(quest.endsAt)} · {quest.teams.length} команд
          </p>
          {quest.description && (
            <p className="text-[13px] text-gh-muted mt-2 leading-relaxed whitespace-pre-wrap">
              {quest.description}
            </p>
          )}
          {quest.winnerTeamName && (
            <div className="text-[12px] text-gh-attention mt-2">
              Переможець: <span className="font-semibold">{quest.winnerTeamName}</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-[22px] text-mono font-semibold text-gh-attention">
            {avgProgress}%
          </div>
          <div className="text-[11px] text-gh-muted">середній прогрес</div>
        </div>
      </div>

      {quest.reward && (
        <div className="px-4 py-2 border-b border-[#30363d] bg-[#0d1117] text-[12px] text-gh-attention">
          Нагорода: {quest.reward}
        </div>
      )}

      {expanded && (
        <div className="px-4 py-3 border-b border-[#30363d] bg-[#0d1117] space-y-3">
          {quest.winnerTeamName ? (
            <div className="rounded-md border border-[#d29922]/40 bg-[#d29922]/10 px-3 py-2 text-[13px] text-gh-attention">
              Переможець: <span className="font-semibold">{quest.winnerTeamName}</span>
              {quest.winnerNote && <div className="text-gh-muted mt-1">{quest.winnerNote}</div>}
            </div>
          ) : (
            <div className="text-[13px] text-gh-muted">
              Переможця ще не обрано. Викладач може відзначити команду нижче.
            </div>
          )}
          {isStaff && (
            <div className="flex gap-2 flex-wrap">
              {quest.winnerTeamName && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await roomsApi.updateTeamQuestTeam(room.id, {
                        questId: quest.id,
                        action: "clear_winner",
                      });
                      onUpdated?.();
                    } catch (e) {
                      alert(e?.message ?? "Не вдалось прибрати переможця");
                    }
                  }}
                  className="btn-gh text-[12px]"
                >
                  Прибрати переможця
                </button>
              )}
              <button
                type="button"
                onClick={deleteQuest}
                className="btn-gh text-[12px]"
                style={{ borderColor: "#f85149", color: "#f85149" }}
              >
                Видалити sprint
              </button>
            </div>
          )}
        </div>
      )}

      {quest.myTeam && !isStaff && (
        <div className="px-4 py-3 border-b border-[#30363d] bg-[#0d1117]">
          <div className="text-[13px] text-gh-fg font-semibold mb-2">Моя команда: {quest.myTeam.name}</div>
          <TeamSubmitForm
            key={`${quest.id}:${quest.myTeam.name}:${quest.myTeam.repoUrl}:${quest.myTeam.demoUrl}:${quest.myTeam.note}`}
            room={room}
            quest={quest}
            team={quest.myTeam}
            isStaff={false}
            onUpdated={onUpdated}
          />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-3 p-3">
        {quest.teams.map((team) => (
          <TeamCard
            key={team.name}
            room={room}
            quest={quest}
            team={team}
            isStaff={isStaff}
            onUpdated={onUpdated}
            winnerTeamName={quest.winnerTeamName}
          />
        ))}
      </div>
    </section>
  );
}

function TeamCard({ room, quest, team, isStaff, onUpdated, winnerTeamName }) {
  const isWinner = winnerTeamName === team.name;
  return (
    <div className={`rounded-md border p-3 ${isWinner ? "border-[#d29922] bg-[#d29922]/10" : team.isMyTeam ? "border-[#58a6ff] bg-[#1f6feb]/10" : "border-[#30363d] bg-[#0d1117]"}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-[14px] text-gh-fg font-semibold flex items-center gap-2">
            {team.name}
            {isWinner && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#d29922]/50 text-[#d29922]">
                переможець
              </span>
            )}
          </div>
          <div className="text-[11px] text-gh-muted">
            {team.members.length} учасників · {team.completeness?.percent ?? 0}% заповнено
          </div>
        </div>
        <ProgressRing percent={team.completeness?.percent ?? 0} />
      </div>

      <Checklist team={team} />

      <div className="mt-3 flex flex-wrap gap-1.5">
        {team.members.map((member) => (
          <span
            key={member.student.id}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] ${
              member.isMe
                ? "border-[#58a6ff] text-[#58a6ff] bg-[#1f6feb]/10"
                : "border-[#30363d] text-gh-muted bg-[#161b22]"
            }`}
            title={member.student.email ?? ""}
          >
            {member.student.name ?? member.student.email}
            {member.student.githubLogin && <span className="text-gh-subtle">@{member.student.githubLogin}</span>}
          </span>
        ))}
      </div>

      <LinksBlock team={team} />

      {isStaff && (
        <div className="mt-3 border-t border-[#30363d] pt-3 space-y-3">
          <TeamSubmitForm
            key={`${quest.id}:${team.name}:${team.repoUrl}:${team.demoUrl}:${team.note}:${team.teacherNote}`}
            room={room}
            quest={quest}
            team={team}
            isStaff
            onUpdated={onUpdated}
          />
          <TeacherAnalytics team={team} />
          <WinnerControls
            room={room}
            quest={quest}
            team={team}
            isWinner={isWinner}
            onUpdated={onUpdated}
          />
        </div>
      )}
    </div>
  );
}

function WinnerControls({ room, quest, team, isWinner, onUpdated }) {
  const [winnerNote, setWinnerNote] = useState("");
  const [saving, setSaving] = useState(false);
  const setWinner = async () => {
    setSaving(true);
    try {
      await roomsApi.updateTeamQuestTeam(room.id, {
        questId: quest.id,
        action: "set_winner",
        teamName: team.name,
        winnerNote,
      });
      onUpdated?.();
    } catch (e) {
      alert(e?.message ?? "Не вдалось обрати переможця");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="rounded-md border border-[#30363d] bg-[#161b22] p-3">
      <div className="text-[12px] font-semibold text-gh-fg mb-2">
        Переможець / відзначена команда
      </div>
      <textarea
        value={winnerNote}
        onChange={(e) => setWinnerNote(e.target.value)}
        className="input-gh resize-y min-h-[48px] text-[12px]"
        maxLength={1000}
        placeholder="Чому саме ця команда? Напр. найкраща співпраця, найчистіший demo, гарний workflow..."
      />
      <button
        type="button"
        onClick={setWinner}
        disabled={saving || isWinner}
        className={`btn-gh mt-2 text-[12px] ${!isWinner ? "btn-gh-primary" : ""}`}
      >
        {isWinner ? "Уже переможець" : saving ? "Зберігаємо..." : "Обрати переможцем"}
      </button>
    </div>
  );
}

function Checklist({ team }) {
  const items = [
    ["repoConnected", "Repo link"],
    ["demoSubmitted", "Demo link"],
    ["noteSubmitted", "Командна нотатка"],
  ];
  return (
    <div className="grid grid-cols-3 gap-1.5 text-[11px]">
      {items.map(([key, label]) => {
        const ok = team.completeness?.[key];
        return (
          <div
            key={key}
            className={`rounded-md border px-2 py-1 ${ok ? "border-[#3fb950]/40 bg-[#3fb950]/10 text-[#3fb950]" : "border-[#30363d] bg-[#161b22] text-gh-muted"}`}
          >
            {ok ? "✓" : "○"} {label}
          </div>
        );
      })}
    </div>
  );
}

function LinksBlock({ team }) {
  if (!team.repoUrl && !team.demoUrl && !team.note) return null;
  return (
    <div className="mt-3 space-y-1 text-[12px]">
      {team.repoUrl && <ExternalLink label="Repo" href={team.repoUrl} />}
      {team.demoUrl && <ExternalLink label="Demo" href={team.demoUrl} />}
      {team.note && (
        <p className="text-gh-muted whitespace-pre-wrap rounded-md border border-[#30363d] bg-[#161b22] p-2 mt-2">
          {team.note}
        </p>
      )}
    </div>
  );
}

function TeamSubmitForm({ room, quest, team, isStaff, onUpdated }) {
  const [repoUrl, setRepoUrl] = useState(team.repoUrl ?? "");
  const [demoUrl, setDemoUrl] = useState(team.demoUrl ?? "");
  const [note, setNote] = useState(team.note ?? "");
  const [teacherNote, setTeacherNote] = useState(team.teacherNote ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await roomsApi.updateTeamQuestTeam(room.id, {
        questId: quest.id,
        teamName: team.name,
        repoUrl: repoUrl.trim(),
        demoUrl: demoUrl.trim(),
        note,
        teacherNote: isStaff ? teacherNote : undefined,
      });
      onUpdated?.();
    } catch (err) {
      setError(err?.message ?? "Не вдалось зберегти команду");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-2">
      <div className="grid md:grid-cols-2 gap-2">
        <input
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          className="input-gh text-mono text-[12px]"
          placeholder="https://github.com/org/team-repo"
          type="url"
        />
        <input
          value={demoUrl}
          onChange={(e) => setDemoUrl(e.target.value)}
          className="input-gh text-mono text-[12px]"
          placeholder="Demo link, Vercel/Netlify/GitHub Pages"
          type="url"
        />
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="input-gh resize-y min-h-[64px] text-[12px]"
        maxLength={1000}
        placeholder="Коротко: що зробила команда, що перевірити, що ще не ідеально."
      />
      {isStaff && (
        <textarea
          value={teacherNote}
          onChange={(e) => setTeacherNote(e.target.value)}
          className="input-gh resize-y min-h-[52px] text-[12px]"
          maxLength={1000}
          placeholder="Приватна нотатка викладача по команді"
        />
      )}
      {error && <div className="text-[12px] text-gh-danger">{error}</div>}
      <button type="submit" disabled={saving} className="btn-gh text-[12px]">
        {saving ? "Зберігаємо..." : isStaff ? "Оновити команду" : "Зберегти repo/demo"}
      </button>
    </form>
  );
}

function TeacherAnalytics({ team }) {
  const analytics = team.analytics ?? {};
  const summary = analytics.summary ?? {};
  const contributors = analytics.contributors ?? [];
  return (
    <div className="rounded-md border border-[#30363d] bg-[#161b22] p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <div className="text-[12px] font-semibold text-gh-fg">Аналітика для викладача</div>
          <div className="text-[11px] text-gh-muted">Не є автоматичною оцінкою, тільки evidence по repo.</div>
        </div>
        {analytics.fetchedAt && (
          <span className="text-[10px] text-gh-subtle">оновлено {formatDateTime(analytics.fetchedAt)}</span>
        )}
      </div>
      {analytics.error && (
        <div className="text-[12px] text-gh-attention mb-2">GitHub: {analytics.error}</div>
      )}
      <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] text-gh-muted mb-3">
        <MiniMetric label="commits" value={summary.commits ?? 0} />
        <MiniMetric label="PR" value={summary.pullRequests ?? 0} />
        <MiniMetric label="reviews" value={summary.reviews ?? 0} />
        <MiniMetric label="issues" value={summary.issues ?? 0} />
        <MiniMetric label="merged PR" value={summary.mergedPullRequests ?? 0} />
        <MiniMetric label="README" value={summary.readmeExists ? "yes" : "no"} />
      </div>
      {contributors.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-left">
            <thead className="text-gh-subtle">
              <tr>
                <th className="py-1 pr-2 font-medium">GitHub</th>
                <th className="py-1 px-2 font-medium text-right">Commits</th>
                <th className="py-1 px-2 font-medium text-right">PR</th>
                <th className="py-1 px-2 font-medium text-right">Reviews</th>
                <th className="py-1 px-2 font-medium text-right">Issues</th>
                <th className="py-1 px-2 font-medium text-right">+/-</th>
                <th className="py-1 pl-2 font-medium text-right">Days</th>
              </tr>
            </thead>
            <tbody className="text-gh-muted">
              {contributors.map((row) => (
                <tr key={row.githubLogin} className="border-t border-[#30363d]">
                  <td className="py-1 pr-2 text-gh-fg">@{row.githubLogin}</td>
                  <td className="py-1 px-2 text-right text-mono">{row.commits}</td>
                  <td className="py-1 px-2 text-right text-mono">{row.pullRequests}</td>
                  <td className="py-1 px-2 text-right text-mono">{row.reviews}</td>
                  <td className="py-1 px-2 text-right text-mono">{row.issuesOpened}</td>
                  <td className="py-1 px-2 text-right text-mono">+{row.additions}/-{row.deletions}</td>
                  <td className="py-1 pl-2 text-right text-mono">{row.activeDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-[12px] text-gh-muted">Додай repo link, щоб побачити contribution breakdown.</div>
      )}
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded border border-[#30363d] bg-[#0d1117] px-2 py-1">
      <div className="text-mono text-gh-fg">{value}</div>
      <div className="uppercase tracking-wider text-[9px]">{label}</div>
    </div>
  );
}

function ExternalLink({ label, href }) {
  return (
    <div className="flex gap-2 min-w-0">
      <span className="text-gh-muted w-10">{label}</span>
      <a href={href} target="_blank" rel="noreferrer" className="text-gh-accent text-mono truncate hover:underline">
        {href}
      </a>
    </div>
  );
}

function ProgressRing({ percent }) {
  return (
    <div className="text-right">
      <div className="text-[18px] text-mono text-gh-fg font-semibold">{percent}%</div>
      <div className="text-[10px] uppercase tracking-wider text-gh-muted">progress</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    active: "активний",
    upcoming: "скоро",
    ended: "завершено",
    archived: "архів",
  };
  const cls =
    status === "active"
      ? "bg-[#3fb950]/15 border-[#3fb950]/40 text-[#3fb950]"
      : status === "upcoming"
        ? "bg-[#1f6feb]/15 border-[#1f6feb]/40 text-[#58a6ff]"
        : "bg-[#1f2733] border-[#30363d] text-gh-muted";
  return (
    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${cls}`}>
      {map[status] ?? status}
    </span>
  );
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
