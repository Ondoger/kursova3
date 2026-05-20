import { connectToDatabase } from "../_lib/db.js";
import { User, EmailCode } from "../_lib/models/index.js";
import {
  compareCodeHash,
  signSessionToken,
  setSessionCookie,
  publicUser,
} from "../_lib/auth.js";
import { parseOr400, verifyEmailSchema } from "../_lib/validate.js";

/*
 * POST /api/auth/verify-email
 * Body: { email, code }
 *
 * On success: marks user as verified, issues session cookie, returns user.
 * Codes are single-use (consumedAt). Failed attempts increment `attempts`;
 * after 5 wrong tries the code is invalidated.
 */

const MAX_ATTEMPTS = 5;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = parseOr400(res, verifyEmailSchema, req.body);
  if (!body) return;
  const { email, code } = body;

  await connectToDatabase();

  // Pull the most recent unconsumed signup code for this email.
  const record = await EmailCode().findOne({
    email,
    purpose: "signup",
    consumedAt: null,
  })
    .sort({ createdAt: -1 });

  if (!record) {
    return res
      .status(400)
      .json({ error: "Код не знайдено або вже використаний. Запитай новий." });
  }
  if (record.expiresAt && record.expiresAt < new Date()) {
    return res
      .status(400)
      .json({ error: "Код прострочений. Запитай новий." });
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    // Mark as consumed so attempts can't continue against this code.
    record.consumedAt = new Date();
    await record.save();
    return res
      .status(400)
      .json({ error: "Забагато невдалих спроб. Запитай новий код." });
  }

  if (!compareCodeHash(code, record.codeHash)) {
    record.attempts = (record.attempts ?? 0) + 1;
    await record.save();
    const left = MAX_ATTEMPTS - record.attempts;
    return res.status(400).json({
      error:
        left > 0
          ? `Невірний код. Залишилось спроб: ${left}.`
          : "Невірний код. Запитай новий.",
    });
  }

  // Mark consumed.
  record.consumedAt = new Date();
  await record.save();

  const user = await User().findOneAndUpdate(
    { email },
    { $set: { emailVerifiedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const token = signSessionToken(user);
  setSessionCookie(res, token);

  return res.status(200).json({ ok: true, user: publicUser(user) });
}
