import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { completeGitHubLink } from "../utils/githubAuth";

/*
 * /auth/callback
 *
 * Endpoint that GitHub redirects to after the user authorises our app.
 * We pull the `code` + `state` from the URL, exchange them on our
 * backend, and refresh the auth store so the linked GitHub login shows
 * up across the UI without a full page reload.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const hydrateAuth = useStore((s) => s.hydrateAuth);
  const [status, setStatus] = useState("Завершуємо GitHub авторизацію...");
  const [error, setError] = useState(null);

  // GitHub OAuth `code` is single-use. React StrictMode in dev fires
  // useEffect twice on mount — the second call would POST the same code
  // to GitHub and get "The code passed is incorrect or expired" because
  // GitHub already burned it on the first call. The ref ensures the
  // exchange runs at most once per page mount.
  const exchangeStarted = useRef(false);

  useEffect(() => {
    // Single-shot guard: in StrictMode dev, useEffect fires twice. We
    // can't bail on the second run AND check an `active` flag during
    // the first run, because the cleanup of the first mount sets that
    // flag to false before the in-flight exchange resolves — and then
    // navigate()/setState never fire.
    //
    // Ref guarantees we only ever start the exchange once per page
    // mount, so we don't need the `active` book-keeping at all. setState
    // on unmounted component is a non-issue here because the page
    // navigates away on success.
    if (exchangeStarted.current) return;
    exchangeStarted.current = true;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const oauthError =
        params.get("error_description") || params.get("error");
      const code = params.get("code");
      const state = params.get("state");

      if (oauthError) {
        setError(oauthError);
        return;
      }
      if (!code || !state) {
        setError("GitHub не повернув code/state — спробуй ще.");
        return;
      }

      try {
        const { returnTo } = await completeGitHubLink({ code, state });
        setStatus("Підтягуємо твій GitHub профіль...");
        await hydrateAuth();
        navigate(returnTo, { replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Помилка GitHub OAuth");
      }
    })();
  }, [hydrateAuth, navigate]);

  return (
    <div className="min-h-screen bg-gh-canvas flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-[#161b22] border border-[#30363d] rounded-md p-6 text-center space-y-4">
        <h1 className="text-[20px] font-semibold text-gh-fg">
          GitHub OAuth
        </h1>

        {!error && (
          <>
            <p className="text-[13px] text-gh-muted">{status}</p>
            <div className="h-1 rounded-full bg-[#0d1117] overflow-hidden">
              <div
                className="h-full bg-[#1f6feb] animate-pulse"
                style={{ width: "60%" }}
              />
            </div>
          </>
        )}

        {error && (
          <>
            <div className="text-[13px] text-gh-danger bg-[#0d1117] border border-[#f85149]/40 px-3 py-2 rounded-md">
              {error}
            </div>
            <button
              onClick={() => navigate("/dashboard", { replace: true })}
              className="btn-gh"
            >
              Повернутись на дашборд
            </button>
          </>
        )}
      </div>
    </div>
  );
}
