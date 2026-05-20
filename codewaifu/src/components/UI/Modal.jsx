import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/*
 * Minimal accessible modal.
 *
 * - Closes on Escape and on backdrop click.
 * - Locks body scroll while open (prevents background page from
 *   scrolling on touch devices).
 * - Doesn't trap focus yet — good enough for forms with autoFocus on
 *   the first input. Full focus-trap is a future polish.
 */
export function Modal({ open, onClose, title, children, footer }) {
  const pointerDownOnBackdrop = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const handleBackdropPointerDown = (e) => {
    pointerDownOnBackdrop.current = e.target === e.currentTarget;
  };

  const handleBackdropClick = (e) => {
    if (e.target !== e.currentTarget || !pointerDownOnBackdrop.current) return;
    pointerDownOnBackdrop.current = false;
    onClose?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          onPointerDown={handleBackdropPointerDown}
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            className="bg-[#161b22] border border-[#30363d] rounded-md w-full max-w-md shadow-2xl mt-10 sm:mt-0"
          >
            {title && (
              <div className="border-b border-[#30363d] px-4 py-3 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-gh-fg">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  aria-label="Закрити"
                  className="text-gh-muted hover:text-gh-fg w-7 h-7 rounded-md hover:bg-[#1f2733] flex items-center justify-center"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </button>
              </div>
            )}
            <div className="p-4">{children}</div>
            {footer && (
              <div className="border-t border-[#30363d] px-4 py-3 bg-[#0d1117]/40 flex justify-end gap-2 rounded-b-md">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
