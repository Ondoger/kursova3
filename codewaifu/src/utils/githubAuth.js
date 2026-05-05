const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const DEFAULT_SCOPE = "read:user";
const OAUTH_STORAGE_KEY = "gitquest:github-oauth";
const CALLBACK_PATH = "/auth/callback";
const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID;

function randomString(size = 48) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
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

function readPendingOAuth() {
  try {
    const raw = sessionStorage.getItem(OAUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearPendingOAuth() {
  sessionStorage.removeItem(OAUTH_STORAGE_KEY);
}

export function isGitHubOAuthConfigured() {
  return Boolean(githubClientId?.trim());
}

export async function beginGitHubOAuth({ characterName }) {
  if (!githubClientId) {
    throw new Error(
      "Додай VITE_GITHUB_CLIENT_ID у .env, щоб увімкнути GitHub OAuth.",
    );
  }
  if (!crypto?.subtle) {
    throw new Error("OAuth потребує HTTPS або localhost для Web Crypto API.");
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
      characterName,
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
    allow_signup: "true",
  });
  window.location.assign(`${AUTHORIZE_URL}?${params.toString()}`);
}

export async function completeGitHubOAuth({ code, state }) {
  if (!githubClientId) {
    throw new Error("GitHub OAuth не налаштований.");
  }
  const pending = readPendingOAuth();
  if (!pending?.state || !pending?.codeVerifier) {
    throw new Error("OAuth-сесію не знайдено. Почни вхід ще раз.");
  }
  if (pending.state !== state) {
    clearPendingOAuth();
    throw new Error("OAuth state не співпадає. Почни вхід ще раз.");
  }
  if (Date.now() - pending.createdAt > 10 * 60 * 1000) {
    clearPendingOAuth();
    throw new Error("OAuth-сесія застаріла. Почни вхід ще раз.");
  }
  const response = await fetch("/api/github/oauth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: githubClientId,
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
      data?.error ??
        `Не вдалось завершити GitHub OAuth. API status: ${response.status}.`,
    );
  }
  if (!data?.access_token) {
    throw new Error("GitHub не повернув access token.");
  }
  clearPendingOAuth();
  return {
    accessToken: data.access_token,
    characterName: pending.characterName,
  };
}
