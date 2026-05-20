import { useEffect, useState } from "react";
import { Modal } from "../UI/Modal";
import { submissionsApi } from "../../utils/api";
import { FormError, FormField } from "../Auth/AuthLayout";

export function GradeModal({ open, onClose, submission, maxPoints, rewardCoins, onGraded }) {
  const [points, setPoints] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && submission) {
      setPoints(submission.grade?.points ?? maxPoints ?? 100);
      setFeedback(submission.grade?.feedback ?? "");
      setError(null);
      setSubmitting(false);
    }
  }, [open, submission, maxPoints]);

  const earnedCoins = Math.round(
    Math.max(0, Number(rewardCoins ?? maxPoints ?? 100) || 0) *
      Math.max(0, Math.min(1, Number(points) / Math.max(1, Number(maxPoints) || 100))),
  );

  const submit = async (e) => {
    e?.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { submission: graded } = await submissionsApi.grade(submission.id, {
        points: Number(points),
        feedback,
      });
      onGraded?.(graded);
    } catch (e) {
      setError(e?.message ?? "Не вдалось оцінити");
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Оцінити: ${submission?.student?.name ?? submission?.student?.email ?? "—"}`}
      footer={
        <>
          <button onClick={onClose} className="btn-gh">
            Скасувати
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="btn-gh btn-gh-primary"
          >
            {submitting ? "Зберігаємо..." : "Виставити оцінку"}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        <FormField
          label="Оцінка"
          hint={`з ${maxPoints} макс. (зайве буде обрізано на бекенді)`}
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={maxPoints}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="flex-1 accent-[#3fb950]"
            />
            <input
              type="number"
              min={0}
              max={maxPoints}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="input-gh w-24 text-center text-[18px] text-mono"
              required
            />
          </div>
        </FormField>
        <div className="bg-[#0d1117] border border-[#30363d] rounded-md p-3 text-[13px] text-gh-muted mb-3">
          Нагорода за цю оцінку:{" "}
          <span className="text-gh-attention text-mono font-semibold">
            {earnedCoins} ⓒ
          </span>{" "}
          з {rewardCoins ?? maxPoints ?? 100} можливих коїнів.
        </div>
        <FormField
          label="Фідбек"
          hint={`${feedback.length}/2000 · markdown скоро`}
        >
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Що сподобалось, що покращити, які ресурси переглянути..."
            className="input-gh resize-y min-h-[120px]"
            maxLength={2000}
            rows={5}
          />
        </FormField>
        {error && <FormError>{error}</FormError>}
      </form>
    </Modal>
  );
}
