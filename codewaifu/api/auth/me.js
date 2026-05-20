import { connectToDatabase } from "../_lib/db.js";
import { User } from "../_lib/models/index.js";
import {
  getSessionFromRequest,
  publicUser,
  clearSessionCookie,
} from "../_lib/auth.js";

/*
 * GET /api/auth/me
 *
 * Returns the current authenticated user, or { user: null } if unauthenticated.
 * Frontend uses this on app load to hydrate the auth state from the cookie.
 *
 * If the cookie's user no longer exists in DB (e.g. account deleted), we
 * clear the cookie so the SPA stops sending it.
 */
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = getSessionFromRequest(req);
  if (!session?.sub) return res.status(200).json({ user: null });

  await connectToDatabase();
  const user = await User().findById(session.sub).lean();
  if (!user) {
    clearSessionCookie(res);
    return res.status(200).json({ user: null });
  }
  return res.status(200).json({ user: publicUser(user) });
}
