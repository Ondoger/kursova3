import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { assignmentsApi } from "../../utils/api";
import { CreateAssignmentModal } from "./CreateAssignmentModal";

/*
 * Render the list of assignments inside a Room. Both teacher and student
 * land here; we branch on `isStaff` for the create CTA and submission-
 * status badges.
 */
export function AssignmentsTab({ room, isStaff }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const refresh = async () => {
    try {
      const { assignments } = await assignmentsApi.listInRoom(room.id);
      setItems(assignments);
      setError(null);
    } catch (e) {
      setError(e?.message ?? "Не вдалось завантажити завдання");
    }
  };

  useEffect(() => {
    refresh();
  }, [room.id]);

  if (error) {
    return (
      <div className="bg-[#161b22] border border-[#f85149]/40 text-gh-danger rounded-md p-4">
        {error}
      </div>
    );
  }

  if (items === null) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-md skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isStaff && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreate(true)}
            className="btn-gh btn-gh-primary"
          >
            + Нове завдання
          </button>
        </div>
      )}

      {items.length === 0 && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-md p-8 text-center">
          <div className="text-[40px] mb-2 opacity-60">📚</div>
          <h3 className="text-[16px] font-semibold text-gh-fg mb-1">
            Поки немає завдань
          </h3>
          <p className="text-gh-muted text-[13px]">
            {isStaff
              ? "Створи перше завдання для своїх студентів."
              : "Викладач ще не опублікував жодного завдання."}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <AnimatePresence>
          {items.map((a) => (
            <AssignmentRow
              key={a.id}
              assignment={a}
              isStaff={isStaff}
            />
          ))}
        </AnimatePresence>
      </div>

      <CreateAssignmentModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        roomId={room.id}
        onCreated={() => {
          setShowCreate(false);
          refresh();
        }}
      />
    </div>
  );
}

function AssignmentRow({ assignment, isStaff }) {
  const status = getStudentStatus(assignment);
  const deadline = assignment.deadlineAt
    ? new Date(assignment.deadlineAt)
    : null;
  const overdue = deadline && deadline < new Date();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-[#161b22] border border-[#30363d] rounded-md p-4 hover:border-[#8b949e] transition-colors"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Link
              to={`/assignments/${assignment.id}`}
              className="text-[15px] font-semibold text-gh-fg hover:text-gh-accent hover:no-underline"
            >
              {assignment.title}
            </Link>
            {!assignment.isPublished && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#30363d] text-gh-muted">
                Чернетка
              </span>
            )}
            {!isStaff && status && (
              <StatusBadge status={status} />
            )}
          </div>
          {assignment.description && (
            <p className="text-[13px] text-gh-muted line-clamp-2 leading-relaxed">
              {assignment.description}
            </p>
          )}
          <div className="text-[12px] text-gh-subtle mt-2 flex items-center gap-3 flex-wrap">
            <span className="text-mono">оцінка: {assignment.maxPoints}</span>
            <span className="text-mono">нагорода: {assignment.rewardCoins ?? assignment.maxPoints} ⓒ</span>
            {deadline && (
              <span
                className={
                  overdue ? "text-gh-danger" : "text-gh-attention"
                }
              >
                {overdue ? "прострочено" : "до"}{" "}
                {deadline.toLocaleDateString("uk-UA", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            {isStaff && (
              <span className="text-gh-subtle">
                {assignment.submissionCount ?? 0} здали ·{" "}
                {assignment.gradedCount ?? 0} оцінено
              </span>
            )}
            {assignment.authorName && (
              <span className="text-gh-subtle">{assignment.authorName}</span>
            )}
            {assignment.attachment && (
              <span className="text-gh-accent text-mono truncate max-w-[240px]">
                📎 {assignment.attachment.fileName}
              </span>
            )}
          </div>
        </div>
        <Link
          to={`/assignments/${assignment.id}`}
          className="btn-gh whitespace-nowrap"
        >
          Відкрити
        </Link>
      </div>
    </motion.div>
  );
}

function getStudentStatus(assignment) {
  const my = assignment.mySubmission;
  if (!my) return "missing";
  return my.status; // submitted | returned | graded | draft
}

function StatusBadge({ status }) {
  const map = {
    missing: { label: "Не здано", color: "muted" },
    draft: { label: "Чернетка", color: "muted" },
    submitted: { label: "Здано", color: "blue" },
    returned: { label: "На доопрацюванні", color: "orange" },
    graded: { label: "Оцінено", color: "green" },
  };
  const meta = map[status] ?? map.missing;
  const cls =
    meta.color === "green"
      ? "bg-[#3fb950]/15 border-[#3fb950]/40 text-[#3fb950]"
      : meta.color === "blue"
        ? "bg-[#1f6feb]/15 border-[#1f6feb]/40 text-[#58a6ff]"
        : meta.color === "orange"
          ? "bg-[#d29922]/15 border-[#d29922]/40 text-[#d29922]"
          : "bg-[#1f2733] border-[#30363d] text-gh-muted";
  return (
    <span
      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${cls}`}
    >
      {meta.label}
    </span>
  );
}
