/*
 * GitHub OAuth helper for *linking* a GitHub account to the currently
 * authenticated GitQuest user. (Pre-Phase-1 this was used as the primary
 * sign-in mechanism; now it's an account-augmentation step.)
 *
 * Flow:
 *   1. beginGitHubLink()         → store PKCE state, redirect to GitHub
 *   2. (GitHub redirects back to /auth/callback with ?code=…&state=…)
 *   3. completeGitHubLink({code, state}) → POST /api/auth/link-github
 *
 * PKCE provides defence-in-depth: even if the OAuth `code` is somehow
 * intercepted between GitHub and our callback URL, the attacker also
 * needs the `code_verifier` we kept in sessionStorage to exchange it.
 */
const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const DEFAULT_SCOPE = "read:user";
const OAUTH_STORAGE_KEY = "gitquest:github-oauth";
const CALLBACK_PATH = "/auth/callback";
const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID;

function randomString(size = 48) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function base64Url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

function getRedirectUri() {
  return `${window.location.origin}${CALLBACK_PATH}`;
}

function readPending() {
  try {
    const raw = sessionStorage.getItem(OAUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearPending() {
  sessionStorage.removeItem(OAUTH_STORAGE_KEY);
}

export function isGitHubOAuthConfigured() {
  return Boolean(githubClientId?.trim());
}

/**
 * Kick off the link flow. `returnTo` is where /auth/callback should
 * navigate after a successful link (defaults to /dashboard).
 */
export async function beginGitHubLink({ returnTo = "/dashboard" } = {}) {
  if (!githubClientId) {
    throw new Error(
      "GitHub OAuth не налаштований. Додай VITE_GITHUB_CLIENT_ID у .env.",
    );
  }
  if (!crypto?.subtle) {
    throw new Error(
      "OAuth потребує HTTPS або localhost для Web Crypto API.",
    );
  }
  const state = randomString(32);
  const codeVerifier = randomString(64);
  const codeChallenge = base64Url(await sha256(codeVerifier));
  const redirectUri = getRedirectUri();

  sessionStorage.setItem(
    OAUTH_STORAGE_KEY,
    JSON.stringify({
      state,
      codeVerifier,
      redirectUri,
      returnTo,
      createdAt: Date.now(),
    }),
  );

  const params = new URLSearchParams({
    client_id: githubClientId,
    redirect_uri: redirectUri,
    scope: DEFAULT_SCOPE,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    allow_signup: "false",
  });
  window.location.assign(`${AUTHORIZE_URL}?${params.toString()}`);
}

/**
 * Finish the link flow. Returns { user, returnTo }.
 * Throws on any error (invalid state, GitHub error, server error).
 */
export async function completeGitHubLink({ code, state }) {
  const pending = readPending();
  if (!pending?.state || !pending?.codeVerifier) {
    throw new Error("OAuth-сесію не знайдено. Спробуй ще раз.");
  }
  if (pending.state !== state) {
    clearPending();
    throw new Error("OAuth state не співпадає. Спробуй ще раз.");
  }
  if (Date.now() - pending.createdAt > 10 * 60 * 1000) {
    clearPending();
    throw new Error("OAuth-сесія застаріла. Спробуй ще раз.");
  }

  const response = await fetch("/api/auth/link-github", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      code_verifier: pending.codeVerifier,
      redirect_uri: pending.redirectUri,
    }),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.error ?? `Не вдалось завершити OAuth (status ${response.status})`,
    );
  }

  clearPending();
  return {
    user: data?.user ?? null,
    returnTo: pending.returnTo ?? "/dashboard",
  };
}
