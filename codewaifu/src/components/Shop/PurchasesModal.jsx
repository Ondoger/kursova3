import { useEffect, useState } from "react";
import { Modal } from "../UI/Modal";
import { shopApi } from "../../utils/api";

/*
 * Read-only list of purchases for a room.
 * - Teacher view: every buyer + what they bought.
 * - Student view: their own history (the API filters this server-side).
 */
export function PurchasesModal({ open, onClose, roomId, isStaff }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setItems(null);
    setError(null);
    shopApi
      .purchases(roomId)
      .then(({ purchases }) => setItems(purchases))
      .catch((e) =>
        setError(e?.message ?? "Не вдалось завантажити покупки"),
      );
  }, [open, roomId]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isStaff ? "Покупки в кімнаті" : "Мої покупки"}
      footer={
        <button onClick={onClose} className="btn-gh">
          Закрити
        </button>
      }
    >
      {error && (
        <div className="bg-[#0d1117] border border-[#f85149]/40 text-gh-danger rounded-md p-3 text-[13px]">
          {error}
        </div>
      )}

      {items === null && !error && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-md skeleton" />
          ))}
        </div>
      )}

      {items?.length === 0 && (
        <div className="text-[13px] text-gh-muted py-4 text-center">
          {isStaff
            ? "Ще ніхто нічого не купував."
            : "Ти ще нічого не купував у цій кімнаті."}
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="divide-y divide-[#30363d] -mx-4">
          {items.map((p) => (
            <li
              key={p.id}
              className="px-4 py-2 flex items-center gap-3 hover:bg-[#1f2733]"
            >
              {isStaff && p.user && (
                <>
                  {p.user.avatarUrl ? (
                    <img
                      src={p.user.avatarUrl}
                      alt={p.user.name}
                      className="w-6 h-6 rounded-full border border-[#30363d] flex-shrink-0"
                    />
                  ) : (
                    <span className="w-6 h-6 rounded-full border border-[#30363d] bg-[#0d1117] flex items-center justify-center text-[11px] text-gh-fg flex-shrink-0">
                      {(p.user.name ?? p.user.email ?? "?")
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>
                  )}
                </>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-gh-fg truncate">
                  {p.item?.title ?? "—"}
                </div>
                {isStaff && p.user && (
                  <div className="text-[11px] text-gh-muted truncate">
                    {p.user.name ?? p.user.email}
                  </div>
                )}
                <div className="text-[10px] text-gh-subtle">
                  {p.item?.kindLabel ?? p.item?.kind ?? ""} ·{" "}
                  {new Date(p.createdAt).toLocaleString("uk-UA")}
                </div>
              </div>
              <div className="text-[13px] font-mono text-[#d29922] whitespace-nowrap flex-shrink-0">
                −{p.cost}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
