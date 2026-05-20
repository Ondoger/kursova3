import { motion } from "framer-motion";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";

/*
 * Public landing page. After Phase 1 the primary CTAs route to
 * /register and /login. The legacy "Connect GitHub username" form is
 * dropped — username-only access doesn't make sense once we have real
 * accounts. (GitHub OAuth gets reintroduced as an account-linking step
 * later, in Phase 3.)
 */
export function Landing() {
  const navigate = useNavigate();
  const authUser = useStore((s) => s.authUser);
  const authReady = useStore((s) => s.authReady);

  useEffect(() => {
    document.body.classList.add("landing-jp");
    return () => document.body.classList.remove("landing-jp");
  }, []);

  // Already signed in? Bounce to dashboard.
  useEffect(() => {
    if (authReady && authUser) navigate("/dashboard", { replace: true });
  }, [authReady, authUser, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gh-canvas">
      <header className="border-b border-[#30363d] bg-[#161b22]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
          <span
            className="w-7 h-7 rounded-md flex items-center justify-center text-white"
            style={{ background: "linear-gradient(180deg,#1f6feb,#1158c7)" }}
            aria-hidden
          >
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
              />
            </svg>
          </span>
          <span className="text-[15px] font-semibold text-gh-fg">GitQuest</span>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/login" className="btn-gh">
              Увійти
            </Link>
            <Link to="/register" className="btn-gh btn-gh-primary">
              Реєстрація
            </Link>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-6 py-12 flex items-center min-h-[calc(100vh-49px)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-6 z-10 max-w-2xl"
        >
          <h1 className="text-[44px] md:text-[56px] leading-[1.05] tracking-tight font-semibold text-gh-fg">
            Навчай і вчись на{" "}
            <span style={{ color: "#58a6ff" }}>GitHub</span>
            <br />
            як на справжній платформі.
          </h1>

          <p className="text-gh-muted max-w-lg text-[16px] leading-relaxed">
            Викладачі створюють класи, видають завдання й перевіряють їх
            виконання прямо по GitHub-активності студента. Студенти
            отримують коїни, рівні, ачівки та винагороди — і прокачують
            справжній dev-профіль одночасно з оцінками.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              to="/register"
              className="btn-gh btn-gh-primary px-6 py-3 text-[15px]"
            >
              Створити акаунт безкоштовно →
            </Link>
            <Link to="/login" className="btn-gh px-6 py-3 text-[15px]">
              Маю акаунт — увійти
            </Link>
          </div>

        </motion.div>

      </div>
    </div>
  );
}

// Kept for compatibility with any imports that still reference BrushStroke.
export function BrushStroke() {
  return null;
}
