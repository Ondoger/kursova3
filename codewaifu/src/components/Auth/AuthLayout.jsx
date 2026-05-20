import { Link } from "react-router-dom";

/*
 * Centred GitHub-style auth shell. Single column, header strip with the
 * GitQuest mark, max-width form card, footer with switch link.
 */
export function AuthLayout({ title, subtitle, children, footer, side }) {
  return (
    <div className="min-h-screen bg-gh-canvas flex flex-col">
      <header className="border-b border-[#30363d] bg-[#161b22]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 hover:no-underline">
            <span
              className="w-7 h-7 rounded-md flex items-center justify-center text-white"
              style={{ background: "linear-gradient(180deg,#1f6feb,#1158c7)" }}
              aria-hidden
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
                />
              </svg>
            </span>
            <span className="text-[15px] font-semibold text-gh-fg">
              GitQuest
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center pt-16 pb-10 px-4">
        <div className={`w-full grid gap-4 items-start ${side ? "max-w-[760px] md:grid-cols-[340px_minmax(0,1fr)]" : "max-w-[340px]"}`}>
          <div>
          <h1 className="text-[24px] font-light text-center text-gh-fg mb-6 tracking-tight">
            {title}
          </h1>
          <div className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
            {subtitle && (
              <p className="text-[13px] text-gh-muted mb-4 leading-relaxed">
                {subtitle}
              </p>
            )}
            {children}
          </div>
          {footer && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-md p-4 mt-4 text-center text-[14px] text-gh-fg">
              {footer}
            </div>
          )}
          </div>
          {side && <div className="md:pt-[56px]">{side}</div>}
        </div>
      </main>
    </div>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return (
    <div className="text-[12px] text-gh-danger bg-[#0d1117] border border-[#f85149]/40 px-3 py-2 rounded-md">
      {children}
    </div>
  );
}

export function FormField({ label, hint, error, children }) {
  return (
    <label className="block mb-3">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[14px] font-semibold text-gh-fg">{label}</span>
        {hint && <span className="text-[12px] text-gh-muted">{hint}</span>}
      </div>
      {children}
      {error && (
        <span className="text-[12px] text-gh-danger mt-1 block">{error}</span>
      )}
    </label>
  );
}
