import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { AuthLayout, FormError } from "../components/Auth/AuthLayout";

/*
 * 6-digit code input. Each digit is a separate <input> so paste/auto-fill
 * still works (we paste the full 6 chars across all boxes), but typing one
 * digit jumps to the next box like every well-known 2FA flow does.
 *
 * On valid 6-digit completion we auto-submit so the user doesn't have to
 * click anything.
 */
const CODE_LEN = 6;

export function VerifyEmail() {
  const navigate = useNavigate();
  const pendingEmail = useStore((s) => s.pendingVerifyEmail);
  const verify = useStore((s) => s.verifyEmailCode);
  const resend = useStore((s) => s.resendVerifyCode);
  const devVerifyCode = useStore((s) => s.devVerifyCode);
  const authLoading = useStore((s) => s.authLoading);
  const authError = useStore((s) => s.authError);
  const clearAuthError = useStore((s) => s.clearAuthError);

  const [digits, setDigits] = useState(Array(CODE_LEN).fill(""));
  const [resendIn, setResendIn] = useState(60);
  const [resendInfo, setResendInfo] = useState(null);
  const refs = useRef([]);

  useEffect(() => {
    if (!pendingEmail) navigate("/register");
  }, [pendingEmail, navigate]);

  // Tick down resend cooldown (server allows new code every 60s).
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const handleDigitChange = (i, value) => {
    clearAuthError();
    const onlyDigits = value.replace(/\D/g, "");
    if (!onlyDigits) {
      setDigits((d) => {
        const next = [...d];
        next[i] = "";
        return next;
      });
      return;
    }
    // Pasted multiple digits → distribute across boxes.
    if (onlyDigits.length > 1) {
      const next = Array(CODE_LEN).fill("");
      for (let k = 0; k < CODE_LEN && k < onlyDigits.length; k++) {
        next[k] = onlyDigits[k];
      }
      setDigits(next);
      const lastIdx = Math.min(onlyDigits.length, CODE_LEN) - 1;
      refs.current[lastIdx]?.focus();
      maybeAutoSubmit(next);
      return;
    }
    setDigits((d) => {
      const next = [...d];
      next[i] = onlyDigits;
      // Move focus right after typing.
      if (i < CODE_LEN - 1) refs.current[i + 1]?.focus();
      maybeAutoSubmit(next);
      return next;
    });
  };

  const maybeAutoSubmit = (arr) => {
    if (arr.every((d) => d.length === 1)) {
      submit(arr.join(""));
    }
  };

  const handleKey = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < CODE_LEN - 1)
      refs.current[i + 1]?.focus();
  };

  const submit = async (codeArg) => {
    const code = codeArg ?? digits.join("");
    if (code.length !== CODE_LEN) return;
    try {
      await verify({ email: pendingEmail, code });
      navigate("/dashboard");
    } catch {
      setDigits(Array(CODE_LEN).fill(""));
      refs.current[0]?.focus();
    }
  };

  const handleUseDevCode = () => {
    if (!devVerifyCode) return;
    setDigits(devVerifyCode.split("").slice(0, CODE_LEN));
    submit(devVerifyCode);
  };

  const handleResend = async () => {
    setResendInfo(null);
    try {
      const r = await resend({ email: pendingEmail, purpose: "signup" });
      setResendIn(60);
      setResendInfo(
        r?.devCode
          ? "Новий тестовий код показаний на сайті."
          : r?.delivered
            ? "Код надіслано ще раз. Перевір пошту."
            : "Код переоформлено.",
      );
    } catch {
      /* authError is already set */
    }
  };

  return (
    <AuthLayout
      title="Підтвердження email"
      subtitle={
        pendingEmail ? (
          <>
            Ми надіслали 6-значний код на{" "}
            <strong className="text-gh-fg text-mono">{pendingEmail}</strong>.
            Введи його нижче.
          </>
        ) : null
      }
      footer={
        <>
          Не той email?{" "}
          <Link to="/register" className="text-gh-accent hover:underline">
            Зареєструватись заново
          </Link>
        </>
      }
    >
      <div className="flex justify-center gap-2 mb-4" onPaste={(e) => {
        const text = e.clipboardData.getData("text");
        if (/^\d{6}$/.test(text.trim())) {
          e.preventDefault();
          handleDigitChange(0, text.trim());
        }
      }}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            value={d}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            inputMode="numeric"
            maxLength={1}
            autoFocus={i === 0}
            disabled={authLoading}
            className="w-11 h-12 rounded-md text-center text-[20px] font-mono bg-[#0d1117] border border-[#30363d] text-gh-fg focus:outline-none focus:border-[#58a6ff] focus:ring-2 focus:ring-[#58a6ff]/30 disabled:opacity-50"
          />
        ))}
      </div>

      {devVerifyCode && (
        <div className="mb-4 rounded-md border border-[#238636]/50 bg-[#0d1117] p-3 text-center">
          <div className="text-[12px] text-gh-muted mb-1">
            Локальний тестовий код
          </div>
          <button
            type="button"
            onClick={handleUseDevCode}
            disabled={authLoading}
            className="text-[24px] font-mono tracking-[0.28em] text-gh-success hover:text-[#56d364] disabled:opacity-50"
            title="Натисни, щоб вставити й підтвердити"
          >
            {devVerifyCode}
          </button>
          <div className="text-[11px] text-gh-muted mt-1">
            Натисни на код, щоб увійти без пошти.
          </div>
        </div>
      )}

      {authError && (
        <div className="mb-3">
          <FormError>{authError}</FormError>
        </div>
      )}

      <button
        type="button"
        onClick={() => submit()}
        disabled={authLoading || digits.some((d) => !d)}
        className="btn-gh btn-gh-primary w-full justify-center"
      >
        {authLoading ? "Перевіряємо..." : "Підтвердити"}
      </button>

      <div className="text-center mt-4 text-[13px] text-gh-muted">
        Не отримав код?{" "}
        {resendIn > 0 ? (
          <span>повторно через {resendIn}с</span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="text-gh-accent hover:underline"
          >
            Надіслати знову
          </button>
        )}
      </div>
      {resendInfo && (
        <div className="text-[12px] text-gh-success text-center mt-2">
          {resendInfo}
        </div>
      )}
    </AuthLayout>
  );
}
