import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { AuthLayout, FormError, FormField } from "../components/Auth/AuthLayout";

const TEST_STUDENTS = [
  { persona: "student-1", name: "Анна Debug", stack: "React · CSS · Jest" },
  { persona: "student-2", name: "Максим Merge", stack: "Node.js · MongoDB · Git" },
  { persona: "student-3", name: "Софія Commit", stack: "Python · FastAPI · SQL" },
  { persona: "student-4", name: "Данило Branch", stack: "TypeScript · Vite · Tailwind" },
  { persona: "student-5", name: "Ірина Review", stack: "Vue · Testing · UX" },
];

export function Register() {
  const navigate = useNavigate();
  const register = useStore((s) => s.register);
  const devLogin = useStore((s) => s.devLogin);
  const authLoading = useStore((s) => s.authLoading);
  const authError = useStore((s) => s.authError);
  const [quickLogin, setQuickLogin] = useState(null);

  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register({ email, password, name, role });
      navigate("/verify-email");
    } catch {
      /* error rendered below from store */
    }
  };

  const loginAsTestStudent = async (persona) => {
    setQuickLogin(persona);
    try {
      await devLogin("student", persona);
      navigate("/dashboard");
    } catch {
      /* error rendered from store */
    } finally {
      setQuickLogin(null);
    }
  };

  return (
    <AuthLayout
      title="Створити акаунт"
      subtitle="Це безкоштовно. Викладач — створює класи й завдання. Студент — приєднується по запрошенню."
      footer={
        <>
          Вже є акаунт?{" "}
          <Link to="/login" className="text-gh-accent hover:underline">
            Увійти
          </Link>
        </>
      }
      side={
        <section className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-[15px] font-semibold text-gh-fg">
                Тестові студенти
              </h2>
              <p className="text-[12px] text-gh-muted mt-1">
                Dev-режим: швидкий вхід без email-коду.
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#d29922]/40 text-gh-attention bg-[#d29922]/10">
              test
            </span>
          </div>
          <div className="space-y-2">
            {TEST_STUDENTS.map((student) => (
              <button
                key={student.persona}
                type="button"
                onClick={() => loginAsTestStudent(student.persona)}
                disabled={authLoading}
                className="w-full text-left rounded-md border border-[#30363d] bg-[#0d1117] p-3 hover:border-[#8b949e] hover:bg-[#1f2733] transition-colors disabled:opacity-60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-gh-fg">
                    {student.name}
                  </span>
                  <span className="text-[11px] text-gh-muted">
                    {quickLogin === student.persona ? "входим..." : "увійти"}
                  </span>
                </div>
                <div className="text-[11px] text-gh-muted mt-1">
                  {student.stack}
                </div>
              </button>
            ))}
          </div>
        </section>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <FormField label="Хто ти?">
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "student", label: "Студент" },
              { value: "teacher", label: "Викладач" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRole(opt.value)}
                className={`px-3 py-2 rounded-md text-[14px] transition-colors border ${
                  role === opt.value
                    ? "bg-[#1f6feb] border-[#1f6feb] text-white"
                    : "bg-[#0d1117] border-[#30363d] text-gh-fg hover:border-[#8b949e]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="Ім'я">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Як до тебе звертатись"
            className="input-gh"
            autoComplete="name"
            minLength={2}
            maxLength={60}
            required
          />
        </FormField>

        <FormField label="Email">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            type="email"
            className="input-gh text-mono"
            autoComplete="email"
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
            autoComplete="new-password"
            minLength={8}
            required
          />
          <span className="text-[12px] text-gh-muted mt-1 block">
            Мінімум 8 символів. Бажано — суміш літер, цифр і символу.
          </span>
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
          {authLoading ? "Реєструємо..." : "Зареєструватись"}
        </button>

        <p className="text-[12px] text-gh-muted text-center mt-4 leading-relaxed">
          Створюючи акаунт, ти погоджуєшся отримати email з кодом підтвердження.
        </p>
      </form>
    </AuthLayout>
  );
}
