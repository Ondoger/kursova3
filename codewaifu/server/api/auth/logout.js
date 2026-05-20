import { clearSessionCookie } from "../_lib/auth.js";

/*
 * POST /api/auth/logout
 * Clears the session cookie. Stateless — we don't currently track
 * server-side sessions, so this is just "remove the JWT cookie".
 */
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}
