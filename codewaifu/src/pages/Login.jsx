import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { ApiError } from "../utils/api";
import { AuthLayout, FormError, FormField } from "../components/Auth/AuthLayout";

export function Login() {
  const navigate = useNavigate();
  const login = useStore((s) => s.login);
  const devLogin = useStore((s) => s.devLogin);
  const authLoading = useStore((s) => s.authLoading);
  const authError = useStore((s) => s.authError);
  const canUseDevLogin = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login({ email, password });
      navigate("/dashboard");
    } catch (err) {
      // Server says the account exists but isn't verified — bounce to /verify-email.
      if (err instanceof ApiError && err.data?.requireVerification) {
        navigate("/verify-email");
      }
      /* else authError is shown */
    }
  };

  const handleDevLogin = async (role) => {
    try {
      await devLogin(role);
      navigate("/dashboard");
    } catch {
      /* authError is shown */
    }
  };

  return (
    <AuthLayout
      title="Увійти в GitQuest"
      footer={
        <>
          Ще не маєш акаунту?{" "}
          <Link to="/register" className="text-gh-accent hover:underline">
            Зареєструватись
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <FormField label="Email">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            type="email"
            className="input-gh text-mono"
            autoComplete="email"
            autoFocus
            required
          />
        </FormField>

        <FormField
          label="Пароль"
          hint={
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="text-gh-accent hover:underline"
            >
              {showPass ? "Сховати" : "Показати"}
            </button>
          }
        >
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPass ? "text" : "password"}
            className="input-gh"
            autoComplete="current-password"
            required
          />
        </FormField>

        {authError && (
          <div className="mb-3">
            <FormError>{authError}</FormError>
          </div>
        )}

        <button
          type="submit"
          disabled={authLoading}
          className="btn-gh btn-gh-primary w-full justify-center"
        >
          {authLoading ? "Входимо..." : "Увійти"}
        </button>

        {canUseDevLogin && (
          <div className="mt-4 pt-4 border-t border-[#30363d]">
            <div className="text-[12px] text-gh-muted text-center mb-2">
              Швидкий тестовий вхід без email і пароля
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDevLogin("student")}
                disabled={authLoading}
                className="btn-gh justify-center text-[13px]"
              >
                Студент
              </button>
              <button
                type="button"
                onClick={() => handleDevLogin("teacher")}
                disabled={authLoading}
                className="btn-gh justify-center text-[13px]"
              >
                Викладач
              </button>
            </div>
          </div>
        )}
      </form>
    </AuthLayout>
  );
}
