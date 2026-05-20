import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../UI/Modal";
import { roomsApi } from "../../utils/api";
import { FormError, FormField } from "../Auth/AuthLayout";

export function JoinRoomModal({ open, onClose, onJoined }) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setCode("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const submit = async (e) => {
    e?.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { room, alreadyMember } = await roomsApi.join(code);
      onJoined?.(room);
      navigate(`/rooms/${room.id}`, {
        state: { alreadyMember },
      });
    } catch (e) {
      setError(e?.message ?? "Не вдалось приєднатись");
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Приєднатись до класу"
      footer={
        <>
          <button onClick={onClose} className="btn-gh">
            Скасувати
          </button>
          <button
            onClick={submit}
            disabled={submitting || code.trim().length < 4}
            className="btn-gh btn-gh-primary"
          >
            {submitting ? "Перевіряємо..." : "Приєднатись"}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        <FormField label="Код-запрошення">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="K4M9X7P2"
            className="input-gh text-mono text-[18px] tracking-[0.2em] uppercase"
            maxLength={20}
            autoFocus
            required
          />
        </FormField>
        {error && <FormError>{error}</FormError>}
        <p className="text-[12px] text-gh-muted mt-3 leading-relaxed">
          Код повинен дати викладач. Регістр і дефіси не важливі —
          <span className="text-mono"> k4-m9x7p2 </span>
          еквівалентно
          <span className="text-mono"> K4M9X7P2</span>.
        </p>
      </form>
    </Modal>
  );
}
