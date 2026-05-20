import { useEffect, useState } from "react";
import { roomsApi } from "../../utils/api";

function defaultWeekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function WeeklyChallenges({ room, isStaff }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const refresh = async () => {
    try {
      const next = await roomsApi.weeklyChallenges(room.id);
      setData(next);
      setError(null);
    } catch (e) {
      setError(e?.message ?? "Не вдалось завантажити weekly challenges");
    }
  };

  useEffect(() => {
    let cancelled = false;
    roomsApi
      .weeklyChallenges(room.id)
      .then((next) => {
        if (cancelled) return;
        setData(next);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Не вдалось завантажити weekly challenges");
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

  if (!data) return <div className="h-72 rounded-md skeleton" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[16px] font-semibold text-gh-fg">Weekly Challenges</h2>
          <p className="text-[12px] text-gh-muted mt-1">
            Тижневі цілі з автоматичним прогресом для кожного студента.
          </p>
        </div>
        {isStaff && (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="btn-gh btn-gh-primary"
          >
            {showCreate ? "Сховати форму" : "+ Новий challenge"}
          </button>
        )}
      </div>

      {showCreate && isStaff && (
        <CreateWeeklyChallengeForm
          room={room}
          metrics={data.metrics}
          onCreated={() => {
            setShowCreate(false);
            refresh();
          }}
        />
      )}

      {data.challenges.length === 0 ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-md p-8 text-center">
          <div className="text-[40px] mb-2 opacity-60">📅</div>
          <h3 className="text-[16px] font-semibold text-gh-fg mb-1">
            Weekly challenges ще немає
          </h3>
          <p className="text-[13px] text-gh-muted">
            {isStaff
              ? "Створи тижневу ціль: здати 2 роботи, набрати 100 балів або зробити 5 активностей."
              : "Викладач ще не запустив тижневий challenge."}
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-3">
          {data.challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              room={room}
              challenge={challenge}
              isStaff={isStaff}
              onDeleted={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateWeeklyChallengeForm({ room, metrics, onCreated }) {
  const [type, setType] = useState("metric");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [metric, setMetric] = useState(metrics?.[0]?.key ?? "submissions");
  const [target, setTarget] = useState(2);
  const [weekStart, setWeekStart] = useState(defaultWeekStart());
  const [rewardCoins, setRewardCoins] = useState(20);
  const [reward, setReward] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await roomsApi.createWeeklyChallenge(room.id, {
        type,
        title,
        description,
        topic,
        metric,
        target: type === "knowledge_sharing" ? 1 : Number(target),
        weekStart: new Date(`${weekStart}T00:00:00`).toISOString(),
        rewardCoins: Number(rewardCoins),
        reward,
      });
      onCreated?.();
    } catch (err) {
      setError(err?.message ?? "Не вдалось створити weekly challenge");
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
            placeholder="Напр. Weekly Sprint"
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold text-gh-fg">Тип</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="input-gh mt-1"
          >
            <option value="metric">Автоматична метрика</option>
            <option value="knowledge_sharing">Knowledge Sharing</option>
          </select>
        </label>
      </div>
      {type === "knowledge_sharing" ? (
        <label className="block">
          <span className="text-[13px] font-semibold text-gh-fg">Тема від викладача</span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="input-gh mt-1"
            maxLength={160}
            required
            placeholder="Напр. async/await, Git branching, REST API"
          />
          <span className="text-[11px] text-gh-muted mt-1 block">
            Студентам потрібно завантажити презентацію: короткий конспект, приклади коду, типові помилки й quiz-питання.
          </span>
        </label>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[13px] font-semibold text-gh-fg">Метрика</span>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="input-gh mt-1"
          >
            {metrics.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
          </label>
          <label className="block">
            <span className="text-[13px] font-semibold text-gh-fg">Ціль</span>
            <input
              type="number"
              min={1}
              max={10000}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="input-gh mt-1"
              required
            />
          </label>
        </div>
      )}
      <div className="grid md:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-[13px] font-semibold text-gh-fg">Тиждень від</span>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="input-gh mt-1"
            required
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold text-gh-fg">Коїни</span>
          <input
            type="number"
            min={0}
            max={1000000}
            value={rewardCoins}
            onChange={(e) => setRewardCoins(e.target.value)}
            className="input-gh mt-1"
            required
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold text-gh-fg">Додаткова нагорода</span>
          <input
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            className="input-gh mt-1"
            maxLength={160}
            placeholder="бейдж, бонус, примітка..."
          />
        </label>
      </div>
      <label className="block">
        <span className="text-[13px] font-semibold text-gh-fg">Опис</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-gh mt-1 min-h-[76px] resize-y"
          maxLength={1000}
          placeholder="Що треба зробити цього тижня?"
        />
      </label>
      {error && <div className="text-[12px] text-gh-danger">{error}</div>}
      <button type="submit" disabled={saving} className="btn-gh btn-gh-primary">
        {saving ? "Створюємо..." : "Створити challenge"}
      </button>
    </form>
  );
}

function ChallengeCard({ room, challenge, isStaff, onDeleted }) {
  const mine = challenge.myProgress;
  const percent = mine?.percent ?? 0;
  const [expanded, setExpanded] = useState(false);
  const isKnowledge = challenge.type === "knowledge_sharing";
  const deleteChallenge = async () => {
    if (!confirm(`Видалити weekly challenge "${challenge.title}"?`)) return;
    try {
      await roomsApi.deleteWeeklyChallenge(room.id, challenge.id);
      onDeleted?.();
    } catch (e) {
      alert(e?.message ?? "Не вдалось видалити challenge");
    }
  };
  return (
    <section className="bg-[#161b22] border border-[#30363d] rounded-md overflow-hidden">
      <div
        className="p-4 border-b border-[#30363d] cursor-pointer hover:bg-[#1f2733]/35 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[16px] font-semibold text-gh-fg truncate">
                {challenge.title}
              </h3>
              <StatusBadge status={challenge.status} />
            </div>
            <p className="text-[12px] text-gh-muted mt-1">
              {formatDate(challenge.weekStart)} — {formatDate(challenge.weekEnd)} ·{" "}
              {isKnowledge ? "Knowledge Sharing" : challenge.metricLabel}
            </p>
            {isKnowledge && challenge.topic && (
              <p className="text-[13px] text-gh-attention mt-2">
                Тема: <span className="font-semibold">{challenge.topic}</span>
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-[20px] text-mono font-semibold text-[#3fb950]">
              {challenge.completedCount}/{challenge.participants}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-gh-muted">
              {isKnowledge ? "зараховано" : "виконали"}
            </div>
          </div>
        </div>
        {challenge.description && (
          <p className="text-[13px] text-gh-muted mt-3 leading-relaxed">
            {challenge.description}
          </p>
        )}
      </div>

      {expanded && isStaff && (
        <div className="px-4 py-3 border-b border-[#30363d] bg-[#0d1117]">
          <button
            type="button"
            onClick={deleteChallenge}
            className="btn-gh text-[12px]"
            style={{ borderColor: "#f85149", color: "#f85149" }}
          >
            Видалити challenge
          </button>
        </div>
      )}

      {isKnowledge && (
        <div className="p-4 bg-[#0d1117] border-b border-[#30363d] space-y-3">
          <div className="rounded-md border border-[#30363d] bg-[#161b22] p-3 text-[13px] text-gh-muted">
            <div className="font-semibold text-gh-fg mb-1">Deliverables у презентації</div>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>короткий markdown-конспект або слайди з поясненням теми;</li>
              <li>3 приклади коду;</li>
              <li>3 типові помилки;</li>
              <li>5 quiz-питань для інших.</li>
            </ul>
          </div>
          {!isStaff && (
            <KnowledgeUploadForm
              room={room}
              challenge={challenge}
              currentSubmission={mine?.submission}
              onSubmitted={onDeleted}
            />
          )}
          {isStaff && (
            <KnowledgeSubmissions
              room={room}
              challenge={challenge}
              onApproved={onDeleted}
            />
          )}
          {challenge.reward && (
            <div className="text-[12px] text-gh-attention">
              Нагорода: {challenge.reward}
            </div>
          )}
          {challenge.rewardCoins > 0 && (
            <div className="text-[12px] text-gh-attention">
              Коїни за approve: {challenge.rewardCoins} ⓒ
            </div>
          )}
        </div>
      )}

      {!isKnowledge && (
        <div className="p-4 bg-[#0d1117] border-b border-[#30363d]">
        <div className="flex items-center justify-between text-[13px] mb-2">
          <span className="text-gh-fg font-semibold">Мій прогрес</span>
          <span className="text-mono text-gh-muted">
            {mine?.progress ?? 0}/{challenge.target}
            {challenge.metricSuffix && <span className="ml-1">{challenge.metricSuffix}</span>}
          </span>
        </div>
        <div className="h-2 rounded-full bg-[#161b22] border border-[#30363d] overflow-hidden">
          <div
            className={`h-full ${mine?.completed ? "bg-[#3fb950]" : "bg-[#58a6ff]"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        {challenge.reward && (
          <div className="text-[12px] text-gh-attention mt-2">
            Нагорода: {challenge.reward}
          </div>
        )}
      </div>
      )}

      {!isKnowledge && (
        <div className="divide-y divide-[#30363d]">
        {challenge.top.map((row, index) => (
          <TopRow key={row.student.id} row={row} rank={index + 1} target={challenge.target} />
        ))}
      </div>
      )}
    </section>
  );
}

function KnowledgeUploadForm({ room, challenge, currentSubmission, onSubmitted }) {
  const [file, setFile] = useState(null);
  const [note, setNote] = useState(currentSubmission?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const selected = file;
    if (!selected && !currentSubmission) {
      setError("Обери PDF/PPT/PPTX файл презентації");
      return;
    }
    if (selected && selected.size > 8_000_000) {
      setError("Файл завеликий. Максимум 8MB.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const dataUrl = selected
        ? await fileToDataUrl(selected)
        : currentSubmission.dataUrl;
      await roomsApi.submitKnowledgeSharing(room.id, {
        challengeId: challenge.id,
        fileName: selected?.name ?? currentSubmission.fileName,
        mime: selected?.type || currentSubmission.mime,
        size: selected?.size ?? currentSubmission.size,
        dataUrl,
        note,
      });
      onSubmitted?.();
    } catch (err) {
      setError(err?.message ?? "Не вдалось завантажити презентацію");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      {currentSubmission && (
        <div className={`text-[12px] ${currentSubmission.approvedAt ? "text-gh-success" : "text-gh-attention"}`}>
          {currentSubmission.approvedAt ? "Зараховано" : "Очікує approve"}:{" "}
          <a href={currentSubmission.dataUrl} download={currentSubmission.fileName} className="text-gh-accent">
            {currentSubmission.fileName}
          </a>
        </div>
      )}
      {!currentSubmission?.approvedAt && (
        <>
          <input
            type="file"
            accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="input-gh text-[12px]"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input-gh resize-y min-h-[64px] text-[12px]"
            maxLength={1000}
            placeholder="Коротко: що всередині презентації, кому буде корисно, як використовувати."
          />
        </>
      )}
      {error && <div className="text-[12px] text-gh-danger">{error}</div>}
      {!currentSubmission?.approvedAt && (
        <button type="submit" disabled={saving} className="btn-gh btn-gh-primary text-[12px]">
          {saving ? "Завантажуємо..." : currentSubmission ? "Оновити презентацію" : "Здати презентацію"}
        </button>
      )}
    </form>
  );
}

function KnowledgeSubmissions({ room, challenge, onApproved }) {
  const submissions = challenge.submissions ?? [];
  const [approvingId, setApprovingId] = useState(null);
  const [error, setError] = useState(null);

  const approve = async (row) => {
    setApprovingId(row.student.id);
    setError(null);
    try {
      await roomsApi.approveKnowledgeSharing(room.id, {
        challengeId: challenge.id,
        studentId: row.student.id,
      });
      onApproved?.();
    } catch (err) {
      setError(err?.message ?? "Не вдалось approve-ити роботу");
    } finally {
      setApprovingId(null);
    }
  };

  if (submissions.length === 0) {
    return <div className="text-[12px] text-gh-muted">Ще ніхто не завантажив презентацію.</div>;
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px] font-semibold text-gh-fg">Здані презентації</div>
        <div className="text-[11px] text-gh-attention text-mono">
          +{challenge.rewardCoins ?? 0} ⓒ за approve
        </div>
      </div>
      {error && <div className="text-[12px] text-gh-danger">{error}</div>}
      {submissions.map((row) => (
        <div key={row.student.id} className="rounded-md border border-[#30363d] bg-[#161b22] p-2 text-[12px]">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-gh-fg">{row.student.name ?? row.student.email}</div>
              <a
                href={row.submission.dataUrl}
                download={row.submission.fileName}
                className="text-gh-accent text-mono truncate block"
              >
                {row.submission.fileName}
              </a>
            </div>
            {row.submission.approvedAt ? (
              <span className="px-2 py-1 rounded-full border border-[#3fb950]/40 bg-[#3fb950]/10 text-gh-success whitespace-nowrap">
                Зараховано +{row.submission.awardedCoins ?? challenge.rewardCoins ?? 0} ⓒ
              </span>
            ) : (
              <button
                type="button"
                onClick={() => approve(row)}
                disabled={approvingId === row.student.id}
                className="btn-gh btn-gh-primary text-[12px] whitespace-nowrap"
              >
                {approvingId === row.student.id ? "Approve..." : "Approve +коїни"}
              </button>
            )}
          </div>
          {row.submission.note && (
            <div className="text-gh-muted mt-1 whitespace-pre-wrap">{row.submission.note}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function TopRow({ row, rank, target }) {
  return (
    <div className="px-4 py-2 flex items-center gap-3">
      <span className="w-5 text-center text-mono text-gh-muted">{rank}</span>
      <Avatar user={row.student} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-gh-fg truncate">
          {row.student.name ?? row.student.email}
        </div>
        <div className="text-[11px] text-gh-subtle truncate">
          {row.student.githubLogin ? `@${row.student.githubLogin}` : row.student.email}
        </div>
      </div>
      <span className={`text-[12px] text-mono ${row.completed ? "text-gh-success" : "text-gh-muted"}`}>
        {row.progress}/{target}
      </span>
    </div>
  );
}

function Avatar({ user }) {
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name ?? user.email}
        className="w-7 h-7 rounded-full border border-[#30363d] flex-shrink-0"
      />
    );
  }
  const initial = (user?.name ?? user?.email ?? "?").slice(0, 1).toUpperCase();
  return (
    <span className="w-7 h-7 rounded-full border border-[#30363d] bg-[#161b22] flex items-center justify-center text-[11px] font-semibold text-gh-fg flex-shrink-0">
      {initial}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    active: "цей тиждень",
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

function formatDate(value) {
  return new Date(value).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "short",
  });
}
