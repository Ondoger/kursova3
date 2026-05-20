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

export function MiniTournaments({ room, isStaff }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const refresh = async () => {
    try {
      const next = await roomsApi.tournaments(room.id);
      setData(next);
      setError(null);
    } catch (e) {
      setError(e?.message ?? "Не вдалось завантажити contests");
    }
  };

  useEffect(() => {
    let cancelled = false;
    roomsApi
      .tournaments(room.id)
      .then((next) => {
        if (cancelled) return;
        setData(next);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Не вдалось завантажити contests");
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
    return (
      <div className="space-y-3">
        <div className="h-14 rounded-md skeleton" />
        <div className="h-44 rounded-md skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[16px] font-semibold text-gh-fg">Code Contest</h2>
          <p className="text-[12px] text-gh-muted mt-1">
            Окрема подія: 1–5 задач, дедлайн, перевірка після завершення і прихований рейтинг до публікації.
          </p>
        </div>
        {isStaff && (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="btn-gh btn-gh-primary"
          >
            {showCreate ? "Сховати форму" : "+ Новий contest"}
          </button>
        )}
      </div>

      {showCreate && isStaff && (
        <CreateTournamentForm
          room={room}
          onCreated={() => {
            setShowCreate(false);
            refresh();
          }}
        />
      )}

      {data.tournaments.length === 0 ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-md p-8 text-center">
          <div className="text-[40px] mb-2 opacity-60">🏆</div>
          <h3 className="text-[16px] font-semibold text-gh-fg mb-1">
            Code Contest ще немає
          </h3>
          <p className="text-[13px] text-gh-muted">
            {isStaff
              ? "Створи contest із задачами, дедлайном і закритим рейтингом до завершення перевірки."
              : "Викладач ще не запустив Code Contest."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.tournaments.map((tournament) => (
            <TournamentCard
              key={tournament.id}
              room={room}
              tournament={tournament}
              isStaff={isStaff}
              onChange={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateTournamentForm({ room, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [endsAt, setEndsAt] = useState(defaultEndsAt());
  const [reward, setReward] = useState("");
  const [tasks, setTasks] = useState([{ title: "", description: "", maxPoints: 100 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const updateTask = (index, patch) => {
    setTasks((current) => current.map((task, i) => (i === index ? { ...task, ...patch } : task)));
  };

  const addTask = () => {
    setTasks((current) => [...current, { title: "", description: "", maxPoints: 100 }].slice(0, 5));
  };

  const removeTask = (index) => {
    setTasks((current) => current.filter((_, i) => i !== index));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await roomsApi.createTournament(room.id, {
        title,
        description,
        endsAt: new Date(endsAt).toISOString(),
        reward,
        tasks: tasks.map((task) => ({
          title: task.title,
          description: task.description,
          maxPoints: Number(task.maxPoints),
        })),
      });
      onCreated?.();
    } catch (err) {
      setError(err?.message ?? "Не вдалось створити contest");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-[#161b22] border border-[#30363d] rounded-md p-4 space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[13px] font-semibold text-gh-fg">Назва</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-gh mt-1"
            maxLength={120}
            required
            placeholder="Напр. JS Algorithms Contest"
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold text-gh-fg">Дедлайн здачі</span>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="input-gh mt-1"
            required
          />
        </label>
      </div>
      <label className="block">
        <span className="text-[13px] font-semibold text-gh-fg">Опис</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-gh mt-1 min-h-[76px] resize-y"
          maxLength={2000}
          placeholder="Правила contest, формат здачі, обмеження, критерії оцінювання..."
        />
      </label>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[13px] font-semibold text-gh-fg">Задачі ({tasks.length}/5)</div>
          <button type="button" onClick={addTask} disabled={tasks.length >= 5} className="btn-gh text-[12px]">
            + Додати задачу
          </button>
        </div>
        {tasks.map((task, index) => (
          <div key={index} className="rounded-md border border-[#30363d] bg-[#0d1117] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[12px] text-gh-muted">Задача {index + 1}</div>
              {tasks.length > 1 && (
                <button type="button" onClick={() => removeTask(index)} className="text-[12px] text-gh-danger">
                  Видалити
                </button>
              )}
            </div>
            <div className="grid md:grid-cols-[1fr_120px] gap-2">
              <input
                value={task.title}
                onChange={(e) => updateTask(index, { title: e.target.value })}
                className="input-gh"
                maxLength={120}
                required
                placeholder="Назва задачі"
              />
              <input
                type="number"
                min={1}
                max={10000}
                value={task.maxPoints}
                onChange={(e) => updateTask(index, { maxPoints: e.target.value })}
                className="input-gh"
                required
                placeholder="Бали"
              />
            </div>
            <textarea
              value={task.description}
              onChange={(e) => updateTask(index, { description: e.target.value })}
              className="input-gh min-h-[92px] resize-y"
              maxLength={5000}
              required
              placeholder="Умова задачі, приклади, критерії приймання..."
            />
          </div>
        ))}
      </div>
      <label className="block">
        <span className="text-[13px] font-semibold text-gh-fg">Нагорода</span>
        <input
          value={reward}
          onChange={(e) => setReward(e.target.value)}
          className="input-gh mt-1"
          maxLength={160}
          placeholder="Напр. +100 коїнів переможцю або титул"
        />
      </label>
      {error && <div className="text-[12px] text-gh-danger">{error}</div>}
      <button type="submit" disabled={saving} className="btn-gh btn-gh-primary">
        {saving ? "Створюємо..." : "Створити Code Contest"}
      </button>
    </form>
  );
}

function TournamentCard({ room, tournament, isStaff, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const myByTask = new Map((tournament.mySubmissions ?? []).map((submission) => [submission.taskId, submission]));

  const deleteTournament = async () => {
    if (!confirm(`Видалити contest "${tournament.title}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      await roomsApi.deleteTournament(room.id, tournament.id);
      onChange?.();
    } catch (e) {
      setError(e?.message ?? "Не вдалось видалити contest");
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      await roomsApi.publishTournamentResults(room.id, tournament.id);
      onChange?.();
    } catch (e) {
      setError(e?.message ?? "Не вдалось відкрити рейтинг");
    } finally {
      setBusy(false);
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
            <h3 className="text-[16px] font-semibold text-gh-fg truncate">{tournament.title}</h3>
            <StatusBadge status={tournament.status} />
            {!tournament.resultsPublished && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#d29922]/40 bg-[#d29922]/10 text-gh-attention">
                рейтинг закритий
              </span>
            )}
          </div>
          <p className="text-[12px] text-gh-muted mt-1">
            {tournament.tasks.length} задач · дедлайн {formatDateTime(tournament.endsAt)} · {tournament.submissionsCount} здач
          </p>
          {tournament.description && (
            <p className="text-[13px] text-gh-muted mt-2 leading-relaxed whitespace-pre-wrap">
              {tournament.description}
            </p>
          )}
        </div>
        <div className="text-right">
          {tournament.standingsVisible ? (
            <>
              <div className="text-[22px] font-semibold text-mono text-gh-attention">
                {tournament.leader?.score ?? 0}/{tournament.leader?.maxScore ?? totalMaxPoints(tournament.tasks)}
              </div>
              <div className="text-[11px] text-gh-muted">
                {tournament.leader
                  ? tournament.leader.student.name ?? tournament.leader.student.email
                  : "немає лідера"}
              </div>
            </>
          ) : (
            <>
              <div className="text-[18px] font-semibold text-gh-muted">Приховано</div>
              <div className="text-[11px] text-gh-muted">до публікації</div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 border-b border-[#30363d] bg-[#0d1117] text-[12px] text-gh-danger">
          {error}
        </div>
      )}

      {expanded && isStaff && (
        <div className="px-4 py-3 border-b border-[#30363d] bg-[#0d1117] flex items-center gap-2 flex-wrap">
          {tournament.status === "review" && (
            <button
              type="button"
              onClick={publish}
              disabled={busy || !tournament.canPublish}
              className="btn-gh btn-gh-primary text-[12px]"
              title={tournament.pendingCount > 0 ? `Ще не перевірено: ${tournament.pendingCount}` : "Відкрити рейтинг студентам"}
            >
              {busy ? "Публікуємо..." : "Завершити перевірку і відкрити рейтинг"}
            </button>
          )}
          <button
            type="button"
            onClick={deleteTournament}
            disabled={busy}
            className="btn-gh text-[12px]"
            style={{ borderColor: "#f85149", color: "#f85149" }}
          >
            Видалити contest
          </button>
        </div>
      )}

      {tournament.reward && (
        <div className="px-4 py-2 border-b border-[#30363d] bg-[#0d1117] text-[12px] text-gh-attention">
          Нагорода: {tournament.reward}
        </div>
      )}

      <div className="p-4 border-b border-[#30363d] bg-[#0d1117] space-y-3">
        <div className="grid md:grid-cols-3 gap-2">
          <ContestStat label="Учасники" value={tournament.participants} />
          <ContestStat label="Перевірено" value={`${tournament.gradedCount}/${tournament.submissionsCount}`} />
          <ContestStat label="Рейтинг" value={tournament.resultsPublished ? "відкритий" : "закритий"} />
        </div>
        <div className="grid lg:grid-cols-2 gap-3">
          {tournament.tasks.map((task) => (
            <TaskCard
              key={task.id}
              room={room}
              tournament={tournament}
              task={task}
              isStaff={isStaff}
              submission={myByTask.get(task.id)}
              onSubmitted={onChange}
            />
          ))}
        </div>
      </div>

      {isStaff && (
        <StaffReviewPanel
          room={room}
          tournament={tournament}
          onChange={onChange}
        />
      )}

      <StandingsPanel tournament={tournament} isStaff={isStaff} />
    </section>
  );
}

function ContestStat({ label, value }) {
  return (
    <div className="rounded-md border border-[#30363d] bg-[#161b22] p-3">
      <div className="text-[11px] uppercase tracking-wider text-gh-muted">{label}</div>
      <div className="text-[18px] text-mono font-semibold text-gh-fg mt-1">{value}</div>
    </div>
  );
}

function TaskCard({ room, tournament, task, isStaff, submission, onSubmitted }) {
  const stats = tournament.taskStats.find((item) => item.taskId === task.id);
  return (
    <div className="rounded-md border border-[#30363d] bg-[#161b22] p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-[14px] font-semibold text-gh-fg">{task.title}</h4>
          <div className="text-[11px] text-gh-muted mt-0.5">{task.maxPoints} балів</div>
        </div>
        {isStaff && (
          <span className="text-[11px] text-gh-muted text-mono whitespace-nowrap">
            {stats?.graded ?? 0}/{stats?.submissions ?? 0} checked
          </span>
        )}
      </div>
      <p className="text-[13px] text-gh-muted whitespace-pre-wrap leading-relaxed">{task.description}</p>
      {!isStaff && (
        <SolutionForm
          room={room}
          tournament={tournament}
          task={task}
          submission={submission}
          onSubmitted={onSubmitted}
        />
      )}
    </div>
  );
}

function SolutionForm({ room, tournament, task, submission, onSubmitted }) {
  const [repoUrl, setRepoUrl] = useState(submission?.repoUrl ?? "");
  const [prUrl, setPrUrl] = useState(submission?.prUrl ?? "");
  const [note, setNote] = useState(submission?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const publishedGrade = tournament.resultsPublished && submission?.gradedAt;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await roomsApi.submitTournamentSolution(room.id, {
        tournamentId: tournament.id,
        taskId: task.id,
        repoUrl,
        prUrl,
        note,
      });
      onSubmitted?.();
    } catch (err) {
      setError(err?.message ?? "Не вдалось здати рішення");
    } finally {
      setSaving(false);
    }
  };

  if (!tournament.canSubmit) {
    return (
      <div className="rounded-md border border-[#30363d] bg-[#0d1117] p-3 text-[12px] text-gh-muted">
        {submission ? (
          <div className="space-y-1">
            <div>
              Здано: {formatDateTime(submission.submittedAt)}
              {publishedGrade && (
                <span className="ml-2 text-gh-success text-mono">
                  {submission.points}/{submission.maxPoints}б
                </span>
              )}
            </div>
            {submission.repoUrl && <LinkLine href={submission.repoUrl} label="Repo" />}
            {submission.prUrl && <LinkLine href={submission.prUrl} label="PR" />}
            {tournament.resultsPublished && submission.feedback && (
              <div className="text-gh-muted whitespace-pre-wrap mt-2">{submission.feedback}</div>
            )}
          </div>
        ) : (
          <div>Здача закрита або contest ще не стартував.</div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      {submission && (
        <div className="text-[12px] text-gh-success">
          Уже здано: {formatDateTime(submission.submittedAt)}. До дедлайну можна оновити.
        </div>
      )}
      <input
        value={repoUrl}
        onChange={(e) => setRepoUrl(e.target.value)}
        className="input-gh text-[12px]"
        placeholder="Repo URL"
      />
      <input
        value={prUrl}
        onChange={(e) => setPrUrl(e.target.value)}
        className="input-gh text-[12px]"
        placeholder="PR URL (опційно)"
      />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="input-gh text-[12px] resize-y min-h-[64px]"
        maxLength={2000}
        placeholder="Коментар до рішення"
      />
      {error && <div className="text-[12px] text-gh-danger">{error}</div>}
      <button type="submit" disabled={saving} className="btn-gh btn-gh-primary text-[12px]">
        {saving ? "Здаємо..." : submission ? "Оновити рішення" : "Здати рішення"}
      </button>
    </form>
  );
}

function LinkLine({ href, label }) {
  return (
    <div>
      {label}: <a href={href} target="_blank" rel="noreferrer" className="text-gh-accent text-mono break-all">{href}</a>
    </div>
  );
}

function StaffReviewPanel({ room, tournament, onChange }) {
  if (["upcoming", "active"].includes(tournament.status)) {
    return (
      <div className="px-4 py-3 border-b border-[#30363d] bg-[#0d1117] text-[12px] text-gh-muted">
        Перевірка відкриється після дедлайну. До цього фінальний рейтинг не показується студентам.
      </div>
    );
  }

  return (
    <div className="border-b border-[#30363d] bg-[#0d1117]">
      <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[13px] font-semibold text-gh-fg">Перевірка сабмішнів</div>
          <div className="text-[12px] text-gh-muted">
            {tournament.pendingCount} очікує перевірки · рейтинг відкриється тільки після кнопки публікації.
          </div>
        </div>
      </div>
      {tournament.submissions.length === 0 ? (
        <div className="px-4 pb-4 text-[12px] text-gh-muted">Сабмішнів немає.</div>
      ) : (
        <div className="divide-y divide-[#30363d]">
          {tournament.submissions.map((submission) => (
            <GradeRow
              key={submission.id}
              room={room}
              tournament={tournament}
              submission={submission}
              onGraded={onChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GradeRow({ room, tournament, submission, onGraded }) {
  const [points, setPoints] = useState(submission.points ?? submission.maxPoints);
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await roomsApi.gradeTournamentSubmission(room.id, {
        tournamentId: tournament.id,
        taskId: submission.taskId,
        studentId: submission.student.id,
        points: Number(points),
        feedback,
      });
      onGraded?.();
    } catch (err) {
      setError(err?.message ?? "Не вдалось зберегти оцінку");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-gh-fg">
            {submission.student.name ?? submission.student.email}
          </div>
          <div className="text-[12px] text-gh-muted">
            {submission.taskTitle} · здано {formatDateTime(submission.submittedAt)}
          </div>
          <div className="text-[12px] text-gh-muted mt-1 space-y-0.5">
            {submission.repoUrl && <LinkLine href={submission.repoUrl} label="Repo" />}
            {submission.prUrl && <LinkLine href={submission.prUrl} label="PR" />}
          </div>
          {submission.note && (
            <div className="text-[12px] text-gh-muted mt-2 whitespace-pre-wrap">{submission.note}</div>
          )}
        </div>
        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${submission.gradedAt ? "border-[#3fb950]/40 bg-[#3fb950]/10 text-gh-success" : "border-[#d29922]/40 bg-[#d29922]/10 text-gh-attention"}`}>
          {submission.gradedAt ? "перевірено" : "очікує"}
        </span>
      </div>
      <div className="grid md:grid-cols-[140px_1fr_auto] gap-2 items-start">
        <input
          type="number"
          min={0}
          max={submission.maxPoints}
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          className="input-gh text-center text-mono"
          disabled={tournament.resultsPublished}
          required
        />
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="input-gh resize-y min-h-[42px] text-[12px]"
          maxLength={2000}
          disabled={tournament.resultsPublished}
          placeholder="Фідбек студенту"
        />
        <button type="submit" disabled={saving || tournament.resultsPublished} className="btn-gh btn-gh-primary text-[12px]">
          {saving ? "Зберігаємо..." : "Оцінити"}
        </button>
      </div>
      <div className="text-[11px] text-gh-muted">Максимум: {submission.maxPoints} балів</div>
      {error && <div className="text-[12px] text-gh-danger">{error}</div>}
    </form>
  );
}

function StandingsPanel({ tournament, isStaff }) {
  if (!tournament.standingsVisible) {
    return (
      <div className="p-4 bg-[#161b22] text-[13px] text-gh-muted">
        Фінальний рейтинг приховано до завершення перевірки викладачем.
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#30363d]">
      {isStaff && !tournament.resultsPublished && (
        <div className="px-4 py-2 bg-[#0d1117] text-[12px] text-gh-attention">
          Це чернетка рейтингу для викладача. Студенти побачать її тільки після публікації.
        </div>
      )}
      {tournament.standings.slice(0, 10).map((row, index) => (
        <StandingRow key={row.student.id} row={row} rank={index + 1} />
      ))}
    </div>
  );
}

function StandingRow({ row, rank }) {
  const width = row.maxScore > 0 ? Math.max(6, Math.round((row.score / row.maxScore) * 100)) : 0;
  return (
    <div className="p-3">
      <div className="flex items-center gap-3">
        <span className="w-6 text-center text-mono font-semibold text-gh-muted">{rank}</span>
        <Avatar user={row.student} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] text-gh-fg truncate">{row.student.name ?? row.student.email}</div>
          <div className="text-[11px] text-gh-subtle truncate">
            {row.student.githubLogin ? `@${row.student.githubLogin}` : row.student.email}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[15px] text-mono text-gh-fg">{row.score}/{row.maxScore}</div>
          <div className="text-[11px] text-gh-muted">{row.graded}/{row.submitted} checked</div>
        </div>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-[#0d1117] border border-[#30363d] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#d29922] to-[#3fb950]"
          style={{ width: `${width}%` }}
        />
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

function StatusBadge({ status }) {
  const map = {
    active: "прийом рішень",
    upcoming: "скоро",
    review: "перевірка",
    completed: "рейтинг відкрито",
    archived: "архів",
  };
  const cls =
    status === "active"
      ? "bg-[#3fb950]/15 border-[#3fb950]/40 text-[#3fb950]"
      : status === "upcoming"
        ? "bg-[#1f6feb]/15 border-[#1f6feb]/40 text-[#58a6ff]"
        : status === "review"
          ? "bg-[#d29922]/10 border-[#d29922]/40 text-gh-attention"
          : "bg-[#1f2733] border-[#30363d] text-gh-muted";
  return (
    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${cls}`}>
      {map[status] ?? status}
    </span>
  );
}

function totalMaxPoints(tasks) {
  return tasks.reduce((sum, task) => sum + (task.maxPoints ?? 100), 0);
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
