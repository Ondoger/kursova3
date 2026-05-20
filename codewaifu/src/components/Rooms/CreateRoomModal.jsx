import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../UI/Modal";
import { roomsApi } from "../../utils/api";
import { FormError, FormField } from "../Auth/AuthLayout";

export function CreateRoomModal({ open, onClose, onCreated }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Reset whenever modal re-opens.
  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const submit = async (e) => {
    e?.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { room } = await roomsApi.create({ name, description });
      onCreated?.(room);
      // Send teacher straight into the new room — they'll want to copy
      // the invite code right away.
      navigate(`/rooms/${room.id}`);
    } catch (e) {
      setError(e?.message ?? "Не вдалось створити клас");
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Новий клас"
      footer={
        <>
          <button onClick={onClose} className="btn-gh">
            Скасувати
          </button>
          <button
            onClick={submit}
            disabled={submitting || name.trim().length < 2}
            className="btn-gh btn-gh-primary"
          >
            {submitting ? "Створюємо..." : "Створити"}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        <FormField label="Назва" hint={`${name.length}/80`}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Web Programming 2026"
            className="input-gh"
            maxLength={80}
            autoFocus
            required
          />
        </FormField>
        <FormField
          label="Опис"
          hint={
            <span className="text-gh-subtle">
              опційно · {description.length}/500
            </span>
          }
        >
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Що буде в цьому класі — стек, завдання, формат..."
            className="input-gh resize-y min-h-[88px]"
            maxLength={500}
            rows={3}
          />
        </FormField>
        {error && <FormError>{error}</FormError>}
        <p className="text-[12px] text-gh-muted mt-3 leading-relaxed">
          Після створення ти отримаєш код-запрошення, який можна кинути
          студентам у будь-якому месенджері.
        </p>
      </form>
    </Modal>
  );
}
