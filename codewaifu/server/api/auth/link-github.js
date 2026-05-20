import { connectToDatabase } from "../_lib/db.js";
import { User } from "../_lib/models/index.js";
import { requireAuth, publicUser } from "../_lib/auth.js";

/*
 * POST /api/auth/link-github
 * Body: { code, code_verifier, redirect_uri }
 *
 * Completes the GitHub OAuth flow and links the GitHub account to the
 * currently authenticated GitQuest user.
 *
 *   1. Trade `code` + `code_verifier` for an access_token (PKCE flow,
 *      so we don't need to send client_secret… but GitHub's OAuth
 *      apps still require it on the server side. PKCE here is just
 *      defence-in-depth against intercepted codes).
 *   2. GET /user with that token to learn who we authorised.
 *   3. Reject if that GitHub account is already linked to a *different*
 *      GitQuest user (`githubId` has a unique sparse index).
 *   4. Persist githubLogin / githubId / githubAvatarUrl on the caller.
 *
 * NOTE: We don't currently store the access_token. We don't need it
 * for grading (public commits suffice). When Phase 7 needs private-repo
 * access we'll add an encrypted token field.
 */
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const USER_URL = "https://api.github.com/user";

export default requireAuth(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const clientId = process.env.GITHUB_CLIENT_ID || req.body?.client_id;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const code = req.body?.code;
  const codeVerifier = req.body?.code_verifier;
  const redirectUri = req.body?.redirect_uri;

  if (!clientId || !clientSecret) {
    return res
      .status(500)
      .json({ error: "GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET не налаштовані" });
  }
  if (!code || !codeVerifier || !redirectUri) {
    return res.status(400).json({ error: "Некоректний OAuth callback" });
  }

  // 1. Code → access_token
  let tokenResp;
  try {
    tokenResp = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }),
    });
  } catch (e) {
    return res.status(502).json({ error: `GitHub network error: ${e.message}` });
  }
  let tokenData;
  try {
    tokenData = await tokenResp.json();
  } catch {
    tokenData = null;
  }
  if (!tokenResp.ok || tokenData?.error) {
    return res.status(400).json({
      error: tokenData?.error_description || tokenData?.error || `GitHub returned ${tokenResp.status}`,
    });
  }
  const accessToken = tokenData?.access_token;
  if (!accessToken) {
    return res.status(502).json({ error: "GitHub не повернув access token" });
  }

  // 2. Token → GitHub user info
  let ghUser;
  try {
    const r = await fetch(USER_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "GitQuest-server",
      },
    });
    if (!r.ok) {
      return res
        .status(502)
        .json({ error: `GitHub /user returned ${r.status}` });
    }
    ghUser = await r.json();
  } catch (e) {
    return res
      .status(502)
      .json({ error: `GitHub network error: ${e.message}` });
  }
  if (!ghUser?.id || !ghUser?.login) {
    return res
      .status(502)
      .json({ error: "GitHub /user payload incomplete" });
  }

  await connectToDatabase();

  // 3. Conflict check — is this GitHub account already linked elsewhere?
  const conflict = await User().findOne({
    githubId: ghUser.id,
    _id: { $ne: req.user._id },
  });
  if (conflict) {
    return res.status(409).json({
      error: `GitHub @${ghUser.login} вже прив'язаний до іншого акаунту`,
    });
  }

  // 4. Save link.
  const updates = {
    githubId: ghUser.id,
    githubLogin: ghUser.login,
    githubAvatarUrl: ghUser.avatar_url ?? null,
    githubLinkedAt: new Date(),
  };
  // Only auto-set the user's main avatar if they don't have one yet.
  if (!req.user.avatarUrl && ghUser.avatar_url) {
    updates.avatarUrl = ghUser.avatar_url;
  }
  const user = await User().findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { returnDocument: "after" },
  );

  return res.status(200).json({
    ok: true,
    user: publicUser(user),
  });
});
