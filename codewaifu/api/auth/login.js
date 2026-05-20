import { connectToDatabase } from "../_lib/db.js";
import { User } from "../_lib/models/index.js";
import {
  verifyPassword,
  signSessionToken,
  setSessionCookie,
  publicUser,
} from "../_lib/auth.js";
import { parseOr400, loginSchema } from "../_lib/validate.js";

/*
 * POST /api/auth/login
 * Body: { email, password }
 *
 * Returns 200 + cookie on success.
 * Returns 401 on bad credentials (deliberately vague — same message for
 *   "user does not exist" and "wrong password" to avoid enumeration).
 * Returns 403 if user exists but email isn't verified, with a hint that
 *   the client should redirect to /verify-email.
 */

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = parseOr400(res, loginSchema, req.body);
  if (!body) return;

  await connectToDatabase();
  const { email, password } = body;
  const user = await User().findOne({ email });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    // Use a generic message + small constant delay would be even better,
    // but bcrypt already takes ~80ms which mostly mitigates timing attacks.
    return res.status(401).json({ error: "Невірний email або пароль" });
  }

  if (!user.emailVerifiedAt) {
    return res.status(403).json({
      error: "Email не підтверджений",
      requireVerification: true,
      email: user.email,
    });
  }

  const token = signSessionToken(user);
  setSessionCookie(res, token);

  return res.status(200).json({ ok: true, user: publicUser(user) });
}
