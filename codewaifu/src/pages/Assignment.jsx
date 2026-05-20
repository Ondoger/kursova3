import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useStore } from "../store/useStore";
import {
  assignmentsApi,
  submissionsApi,
  ApiError,
} from "../utils/api";
import { FormField, FormError } from "../components/Auth/AuthLayout";
import { Modal } from "../components/UI/Modal";
import { GitHubRepoPreview } from "../components/Assignments/GitHubRepoPreview";
import { GradeModal } from "../components/Assignments/GradeModal";

/*
 * /assignments/:id
 *
 * Renders different layouts for teacher vs student in the same page.
 * Both share the header; below it:
 *   - Student: own submission card + submit form, with grade once given
 *   - Teacher: tabbed view of submissions (incl. "missing students"),
 *              GitHub preview drilldown, grade/return actions
 */
export function Assignment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const authUser = useStore((s) => s.authUser);

  const [data, setData] = useState(null); // { assignment }
  const [error, setError] = useState(null);

  const refresh = async () => {
    try {
      const { assignment } = await assignmentsApi.get(id);
      setData({ assignment });
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
        navigate("/dashboard", { replace: true });
        return;
      }
      setError(e?.message ?? "Не вдалось завантажити завдання");
    }
  };

  useEffect(() => {
    refresh();
  }, [id]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-[#161b22] border border-[#f85149]/40 text-gh-danger rounded-md p-4">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <div className="h-24 rounded-md skeleton" />
        <div className="h-64 rounded-md skeleton" />
      </div>
    );
  }

  const a = data.assignment;
  const isStaff =
    typeof a.submissionCount !== "undefined"; // staff payload has counts
  const deadline = a.deadlineAt ? new Date(a.deadlineAt) : null;
  const overdue = deadline && deadline < new Date();
  const deleteAssignment = async () => {
    if (!confirm(`Видалити завдання "${a.title}"? Сабмішни й оцінки також буде видалено.`)) return;
    try {
      await assignmentsApi.delete(a.id);
      navigate(`/rooms/${a.roomId}`, { replace: true });
    } catch (e) {
      alert(e?.message ?? "Не вдалось видалити завдання");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          to={`/rooms/${a.roomId}`}
          className="text-[12px] text-gh-muted hover:text-gh-accent"
        >
          ← Назад до кімнати
        </Link>
        <h1 className="text-[26px] font-semibold text-gh-fg leading-tight mt-1 flex items-start gap-3 flex-wrap">
          {a.title}
          {!a.isPublished && (
            <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#30363d] text-gh-muted align-middle">
              Чернетка
            </span>
          )}
          {isStaff && (
            <button
              type="button"
              onClick={deleteAssignment}
              className="btn-gh text-[12px]"
              style={{ borderColor: "#f85149", color: "#f85149" }}
            >
              Видалити
            </button>
          )}
        </h1>
        <div className="text-[12px] text-gh-subtle mt-2 flex items-center gap-3 flex-wrap">
          <span className="text-mono">оцінка: {a.maxPoints}</span>
          <span className="text-mono">нагорода: {a.rewardCoins ?? a.maxPoints} ⓒ</span>
          {deadline && (
            <span className={overdue ? "text-gh-danger" : "text-gh-attention"}>
              {overdue ? "прострочено" : "до"}{" "}
              {deadline.toLocaleString("uk-UA", {
                day: "2-digit",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          {a.authorName && (
            <span className="text-gh-subtle">Автор: {a.authorName}</span>
          )}
          {isStaff && (
            <span className="text-gh-subtle">
              Здали {a.submissionCount} · оцінено {a.gradedCount}
            </span>
          )}
        </div>
        {a.description && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-md p-4 mt-4 whitespace-pre-wrap text-[14px] text-gh-fg leading-relaxed">
            {a.description}
          </div>
        )}
        {a.attachment && (
          <AssignmentAttachment attachment={a.attachment} />
        )}
      </div>

      {/* Body */}
      {isStaff ? (
        <TeacherView assignment={a} onChange={refresh} />
      ) : (
        <StudentView assignment={a} onChange={refresh} />
      )}
    </div>
  );
}

/* ── Student view ──────────────────────────────────────────────────── */

function StudentView({ assignment, onChange }) {
  const my = assignment.mySubmission;
  return (
    <div className="space-y-6">
      {my && my.status !== "draft" && (
        <SubmissionStatusCard submission={my} maxPoints={assignment.maxPoints} />
      )}
      <SubmissionForm
        assignment={assignment}
        existing={my}
        onSubmitted={onChange}
      />
    </div>
  );
}

function SubmissionStatusCard({ submission, maxPoints }) {
  const status = submission.status;
  return (
    <section className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h3 className="text-[15px] font-semibold text-gh-fg">
          Твій сабмішн
        </h3>
        <StatusPill status={status} />
      </div>
      <div className="text-[12px] text-gh-muted mb-3">
        Здано:{" "}
        {submission.submittedAt
          ? new Date(submission.submittedAt).toLocaleString("uk-UA")
          : "—"}
      </div>
      {submission.repoUrl && (
        <SubmissionLink label="Repo" href={submission.repoUrl} />
      )}
      {submission.prUrl && (
        <SubmissionLink label="PR" href={submission.prUrl} />
      )}
      {submission.note && (
        <p className="text-[13px] text-gh-fg whitespace-pre-wrap mt-2 leading-relaxed">
          {submission.note}
        </p>
      )}
      {submission.grade && (
        <div className="bg-[#0d1117] border border-[#3fb950]/40 rounded-md p-3 mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] text-gh-muted uppercase tracking-wider">
              Оцінка
            </span>
            <span className="text-[20px] font-semibold text-[#3fb950] text-mono">
              {submission.grade.points} / {maxPoints}
            </span>
          </div>
          <div className="text-[12px] text-gh-muted mb-2">
            Нараховано:{" "}
            <span className="text-gh-attention text-mono">
              {submission.grade.awardedCoins ?? 0} ⓒ
            </span>
          </div>
          {submission.grade.feedback && (
            <p className="text-[13px] text-gh-fg whitespace-pre-wrap leading-relaxed">
              {submission.grade.feedback}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function SubmissionLink({ label, href }) {
  return (
    <div className="flex items-center gap-2 text-[13px] mb-1">
      <span className="text-gh-muted w-12">{label}</span>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-gh-accent hover:underline truncate text-mono"
      >
        {href}
      </a>
    </div>
  );
}

function AssignmentAttachment({ attachment }) {
  const canDownload = Boolean(attachment.dataUrl);
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-md p-4 mt-4">
      <div className="text-[12px] uppercase tracking-wider text-gh-muted mb-2">
        Файл до завдання
      </div>
      {canDownload ? (
        <a
          href={attachment.dataUrl}
          download={attachment.fileName}
          className="text-gh-accent hover:underline text-mono break-all"
        >
          {attachment.fileName}
        </a>
      ) : (
        <span className="text-gh-fg text-mono break-all">{attachment.fileName}</span>
      )}
      <div className="text-[12px] text-gh-subtle mt-1">
        {attachment.mime || "application/octet-stream"} · {formatFileSize(attachment.size)}
      </div>
    </div>
  );
}

function formatFileSize(size = 0) {
  if (size >= 1_000_000) return `${(size / 1_000_000).toFixed(1)} MB`;
  if (size >= 1_000) return `${Math.ceil(size / 1_000)} KB`;
  return `${size} B`;
}

function SubmissionForm({ assignment, existing, onSubmitted }) {
  const [repoUrl, setRepoUrl] = useState(existing?.repoUrl ?? "");
  const [prUrl, setPrUrl] = useState(existing?.prUrl ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e?.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await assignmentsApi.submit(assignment.id, {
        repoUrl: repoUrl.trim() || null,
        prUrl: prUrl.trim() || null,
        note,
      });
      onSubmitted?.();
    } catch (e) {
      setError(e?.message ?? "Не вдалось здати");
    } finally {
      setSubmitting(false);
    }
  };

  const isResubmit =
    existing && existing.status !== "draft";

  return (
    <section className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
      <h3 className="text-[15px] font-semibold text-gh-fg mb-3">
        {isResubmit ? "Перездати завдання" : "Здати завдання"}
      </h3>
      <form onSubmit={submit}>
        <FormField label="Лінк на репозиторій" hint="https://github.com/...">
          <input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/your/repo"
            className="input-gh text-mono"
            type="url"
          />
        </FormField>
        <FormField
          label="Або лінк на Pull Request"
          hint="опційно — ще точніше"
        >
          <input
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            placeholder="https://github.com/your/repo/pull/123"
            className="input-gh text-mono"
            type="url"
          />
        </FormField>
        <FormField
          label="Коментар"
          hint={`${note.length}/2000`}
        >
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Що зроблено, які складнощі, що ще треба..."
            className="input-gh resize-y min-h-[100px]"
            maxLength={2000}
            rows={4}
          />
        </FormField>
        {error && <FormError>{error}</FormError>}
        <div className="flex justify-end mt-3">
          <button
            type="submit"
            disabled={submitting}
            className="btn-gh btn-gh-primary"
          >
            {submitting
              ? "Здаємо..."
              : isResubmit
                ? "Перездати"
                : "Здати"}
          </button>
        </div>
      </form>
    </section>
  );
}

/* ── Teacher view ──────────────────────────────────────────────────── */

function TeacherView({ assignment, onChange }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [gradingSub, setGradingSub] = useState(null);

  const refresh = async () => {
    try {
      const data = await assignmentsApi.submissions(assignment.id);
      setList(data);
      setError(null);
    } catch (e) {
      setError(e?.message ?? "Не вдалось завантажити сабмішни");
    }
  };

  useEffect(() => {
    refresh();
  }, [assignment.id]);

  if (error) {
    return (
      <div className="bg-[#161b22] border border-[#f85149]/40 text-gh-danger rounded-md p-4">
        {error}
      </div>
    );
  }

  if (!list) {
    return <div className="h-32 rounded-md skeleton" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <SummaryStat
          label="Студентів"
          value={list.totals.students}
        />
        <SummaryStat
          label="Здали"
          value={list.totals.submitted}
          accent="#58a6ff"
        />
        <SummaryStat
          label="Оцінено"
          value={list.totals.graded}
          accent="#3fb950"
        />
      </div>

      <section className="bg-[#161b22] border border-[#30363d] rounded-md">
        <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-gh-fg">
            Сабмішни ({list.submissions.length})
          </h3>
        </div>
        {list.submissions.length === 0 ? (
          <div className="p-6 text-center text-gh-muted text-[14px]">
            Поки ніхто не здавав.
          </div>
        ) : (
          <ul className="divide-y divide-[#30363d]">
            {list.submissions.map((s) => (
              <SubmissionRow
                key={s.id}
                submission={s}
                expanded={expandedId === s.id}
                onToggle={() =>
                  setExpandedId(expandedId === s.id ? null : s.id)
                }
                onGrade={() => setGradingSub(s)}
                onReturn={async () => {
                  if (!confirm("Повернути сабмішн на доопрацювання?")) return;
                  try {
                    await submissionsApi.returnSub(s.id);
                    await refresh();
                    onChange?.();
                  } catch (e) {
                    alert(e?.message);
                  }
                }}
                maxPoints={assignment.maxPoints}
              />
            ))}
          </ul>
        )}
      </section>

      {list.missing.length > 0 && (
        <section className="bg-[#161b22] border border-[#30363d] rounded-md">
          <div className="px-4 py-3 border-b border-[#30363d]">
            <h3 className="text-[15px] font-semibold text-gh-muted">
              Не здали ({list.missing.length})
            </h3>
          </div>
          <ul className="divide-y divide-[#30363d]">
            {list.missing.map((m) => (
              <li
                key={m.student?.id ?? Math.random()}
                className="px-4 py-2 flex items-center gap-3 opacity-70"
              >
                <Avatar user={m.student} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-gh-fg truncate">
                    {m.student?.name ?? m.student?.email ?? "—"}
                  </div>
                  <div className="text-[11px] text-gh-subtle truncate">
                    {m.student?.email}
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#30363d] text-gh-muted">
                  Не здав
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {gradingSub && (
        <GradeModal
          open={Boolean(gradingSub)}
          onClose={() => setGradingSub(null)}
          submission={gradingSub}
          maxPoints={assignment.maxPoints}
          rewardCoins={assignment.rewardCoins}
          onGraded={async () => {
            setGradingSub(null);
            await refresh();
            onChange?.();
          }}
        />
      )}
    </div>
  );
}

function SummaryStat({ label, value, accent }) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-md p-3 text-center">
      <div
        className="text-[24px] font-semibold text-mono"
        style={accent ? { color: accent } : { color: "var(--gh-fg)" }}
      >
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-gh-muted">
        {label}
      </div>
    </div>
  );
}

function SubmissionRow({
  submission,
  expanded,
  onToggle,
  onGrade,
  onReturn,
  maxPoints,
}) {
  return (
    <li>
      <div
        className="px-4 py-3 flex items-center gap-3 hover:bg-[#1f2733] cursor-pointer"
        onClick={onToggle}
      >
        <Avatar user={submission.student} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] text-gh-fg truncate">
            {submission.student?.name ?? submission.student?.email}
          </div>
          <div className="text-[12px] text-gh-muted truncate">
            {submission.repoUrl || submission.prUrl || (
              <em>тільки коментар</em>
            )}
          </div>
        </div>
        {submission.grade && (
          <div className="text-[14px] font-semibold text-mono text-[#3fb950] whitespace-nowrap">
            {submission.grade.points}/{maxPoints}
          </div>
        )}
        <StatusPill status={submission.status} />
        <button
          className="text-gh-muted hover:text-gh-fg p-1 rounded-md"
          aria-label={expanded ? "Згорнути" : "Розгорнути"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .15s" }}
          >
            <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </button>
      </div>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="px-4 py-4 bg-[#0d1117] border-t border-[#30363d] space-y-3">
            {submission.repoUrl && (
              <SubmissionLink label="Repo" href={submission.repoUrl} />
            )}
            {submission.prUrl && (
              <SubmissionLink label="PR" href={submission.prUrl} />
            )}
            {submission.note && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-md p-3 text-[13px] text-gh-fg whitespace-pre-wrap leading-relaxed">
                {submission.note}
              </div>
            )}

            <GitHubRepoPreview submissionId={submission.id} />

            {submission.grade && (
              <div className="bg-[#0d1117] border border-[#3fb950]/40 rounded-md p-3">
                <div className="text-[12px] uppercase tracking-wider text-gh-muted mb-1">
                  Поточна оцінка
                </div>
                <div className="text-[16px] font-semibold text-[#3fb950] text-mono mb-1">
                  {submission.grade.points} / {maxPoints}
                </div>
                <div className="text-[12px] text-gh-muted mb-2">
                  Нараховано:{" "}
                  <span className="text-gh-attention text-mono">
                    {submission.grade.awardedCoins ?? 0} ⓒ
                  </span>
                </div>
                {submission.grade.feedback && (
                  <p className="text-[13px] text-gh-fg whitespace-pre-wrap leading-relaxed">
                    {submission.grade.feedback}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={onGrade}
                className="btn-gh btn-gh-primary"
              >
                {submission.grade ? "Перевиставити оцінку" : "Оцінити"}
              </button>
              {submission.status !== "returned" && (
                <button
                  onClick={onReturn}
                  className="btn-gh"
                  style={{ borderColor: "#d29922", color: "#d29922" }}
                >
                  Повернути на доопрацювання
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </li>
  );
}

function Avatar({ user }) {
  if (!user) {
    return (
      <span className="w-8 h-8 rounded-full border border-[#30363d] bg-[#0d1117] flex-shrink-0" />
    );
  }
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name ?? user.email}
        className="w-8 h-8 rounded-full border border-[#30363d] flex-shrink-0"
      />
    );
  }
  const initial = (user.name ?? user.email ?? "?").slice(0, 1).toUpperCase();
  return (
    <span className="w-8 h-8 rounded-full border border-[#30363d] bg-[#0d1117] flex items-center justify-center text-[12px] font-semibold text-gh-fg flex-shrink-0">
      {initial}
    </span>
  );
}

function StatusPill({ status }) {
  const map = {
    submitted: { label: "Здано", cls: "bg-[#1f6feb]/15 border-[#1f6feb]/40 text-[#58a6ff]" },
    returned: { label: "Доопрацювати", cls: "bg-[#d29922]/15 border-[#d29922]/40 text-[#d29922]" },
    graded: { label: "Оцінено", cls: "bg-[#3fb950]/15 border-[#3fb950]/40 text-[#3fb950]" },
    draft: { label: "Чернетка", cls: "bg-[#1f2733] border-[#30363d] text-gh-muted" },
    missing: { label: "Не здано", cls: "bg-[#1f2733] border-[#30363d] text-gh-muted" },
  };
  const m = map[status] ?? map.draft;
  return (
    <span
      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap ${m.cls}`}
    >
      {m.label}
    </span>
  );
}
