import { useEffect, useState } from "react";
import { Modal } from "../UI/Modal";
import { assignmentsApi } from "../../utils/api";
import { FormError, FormField } from "../Auth/AuthLayout";

const MAX_ASSIGNMENT_ATTACHMENT_SIZE = 8_000_000;

export function CreateAssignmentModal({ open, onClose, roomId, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState(""); // <input type="datetime-local">
  const [maxPoints, setMaxPoints] = useState(100);
  const [rewardCoins, setRewardCoins] = useState(50);
  const [requiredPaths, setRequiredPaths] = useState("");
  const [minCommits, setMinCommits] = useState(1);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [publish, setPublish] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setDeadline("");
      setMaxPoints(100);
      setRewardCoins(50);
      setRequiredPaths("");
      setMinCommits(1);
      setAttachmentFile(null);
      setPublish(true);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const submit = async (e) => {
    e?.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (attachmentFile && attachmentFile.size > MAX_ASSIGNMENT_ATTACHMENT_SIZE) {
        setError("Файл завеликий. Максимум 8MB.");
        setSubmitting(false);
        return;
      }
      if (attachmentFile && attachmentFile.name.length > 180) {
        setError("Назва файлу задовга. Максимум 180 символів.");
        setSubmitting(false);
        return;
      }
      // Convert local datetime ("2026-06-01T18:30") to ISO. If empty, send null.
      const deadlineAt = deadline
        ? new Date(deadline).toISOString()
        : null;
      const attachmentMime = attachmentFile?.type || "application/octet-stream";
      const payload = {
        title,
        description,
        maxPoints: Number(maxPoints) || 100,
        rewardCoins: Math.max(0, Number(rewardCoins) || 0),
        publish,
        githubHint: {
          requiredPaths: requiredPaths
            .split(/\r?\n|,/)
            .map((p) => p.trim())
            .filter(Boolean),
          minCommits: Number(minCommits) || 0,
        },
      };
      if (deadlineAt) payload.deadlineAt = deadlineAt;
      if (attachmentFile) {
        payload.attachment = {
          fileName: attachmentFile.name,
          mime: attachmentMime,
          size: attachmentFile.size,
          dataUrl: await fileToDataUrl(attachmentFile, attachmentMime),
        };
      }
      const { assignment } = await assignmentsApi.createInRoom(
        roomId,
        payload,
      );
      onCreated?.(assignment);
    } catch (e) {
      setError(e?.message ?? "Не вдалось створити завдання");
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Нове завдання"
      footer={
        <>
          <button onClick={onClose} className="btn-gh">
            Скасувати
          </button>
          <button
            onClick={submit}
            disabled={submitting || title.trim().length < 2}
            className="btn-gh btn-gh-primary"
          >
            {submitting ? "Створюємо..." : publish ? "Опублікувати" : "Зберегти як чернетку"}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        <FormField label="Назва" hint={`${title.length}/120`}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lab 1: Linked List"
            className="input-gh"
            maxLength={120}
            autoFocus
            required
          />
        </FormField>
        <FormField label="Опис" hint={`${description.length}/5000`}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Що треба зробити, які вимоги, як здати..."
            className="input-gh resize-y min-h-[100px]"
            maxLength={5000}
            rows={5}
          />
        </FormField>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Дедлайн" hint="опційно">
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input-gh"
            />
          </FormField>
          <FormField label="Макс. оцінка">
            <input
              type="number"
              value={maxPoints}
              onChange={(e) => setMaxPoints(e.target.value)}
              className="input-gh"
              min={1}
              max={10000}
              required
            />
          </FormField>
          <FormField label="Макс. коїнів" hint="за 100% оцінки">
            <input
              type="number"
              value={rewardCoins}
              onChange={(e) => setRewardCoins(e.target.value)}
              className="input-gh"
              min={0}
              max={1000000}
              required
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Мін. комітів" hint="для автоперевірки">
            <input
              type="number"
              value={minCommits}
              onChange={(e) => setMinCommits(e.target.value)}
              className="input-gh"
              min={0}
              max={1000}
            />
          </FormField>
          <FormField label="Обов'язкові файли" hint="через кому або з нового рядка">
            <textarea
              value={requiredPaths}
              onChange={(e) => setRequiredPaths(e.target.value)}
              placeholder="README.md, src/main.js"
              className="input-gh resize-y min-h-[64px] text-mono text-[12px]"
              rows={2}
            />
          </FormField>
        </div>
        <FormField label="Файл до завдання" hint="опційно, до 8MB">
          <input
            type="file"
            onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
            className="input-gh text-[12px]"
          />
          {attachmentFile && (
            <div className="text-[12px] text-gh-muted mt-1">
              Обрано:{" "}
              <span className="text-gh-fg text-mono">{attachmentFile.name}</span>
            </div>
          )}
        </FormField>
        <label className="flex items-center gap-2 mt-2 mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={publish}
            onChange={(e) => setPublish(e.target.checked)}
            className="w-4 h-4 accent-[#1f6feb]"
          />
          <span className="text-[14px] text-gh-fg">
            Опублікувати одразу
            <span className="text-gh-muted text-[12px] block">
              Студенти побачать завдання і зможуть здавати. Чернетки
              видно тільки викладачам.
            </span>
          </span>
        </label>
        {error && <FormError>{error}</FormError>}
      </form>
    </Modal>
  );
}

function fileToDataUrl(file, mime) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Не вдалось прочитати файл"));
        return;
      }
      resolve(reader.result.replace(/^data:;base64,/u, `data:${mime};base64,`));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
