import { connectToDatabase } from "../_lib/db.js";
import { User, EmailCode } from "../_lib/models/index.js";
import {
  hashPassword,
  generateNumericCode,
  hashCode,
} from "../_lib/auth.js";
import { sendCodeEmail } from "../_lib/email.js";
import { parseOr400, registerSchema } from "../_lib/validate.js";

/*
 * POST /api/auth/register
 * Body: { email, password, name, role: "teacher" | "student" }
 *
 * Creates an unverified user (or re-uses an existing unverified one),
 * issues a fresh 6-digit code, emails it to the user, and returns
 * { ok: true, requireVerification: true }.
 *
 * Re-registration with the same email:
 *   - if user exists and IS verified → 409 (must use login)
 *   - if user exists but NOT verified → password/name/role get refreshed
 *     and a new code is sent. Stops attackers/typoers from spamming
 *     fresh accounts under one address.
 */

const CODE_TTL_MIN = 10;
const RESEND_WINDOW_MIN = 1; // throttle: 1 new code per minute per email
const MAX_PENDING_CODES_PER_EMAIL = 5; // hard cap in any given hour

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = parseOr400(res, registerSchema, req.body);
  if (!body) return;

  await connectToDatabase();

  const { email, password, name, role } = body;
  const existing = await User().findOne({ email });

  if (existing?.emailVerifiedAt) {
    return res
      .status(409)
      .json({ error: "Email вже зареєстрований. Спробуй увійти." });
  }

  // Throttle: don't allow a flurry of registration codes.
  const oneMinuteAgo = new Date(Date.now() - RESEND_WINDOW_MIN * 60_000);
  const oneHourAgo = new Date(Date.now() - 60 * 60_000);
  const recent = await EmailCode().findOne({
    email,
    purpose: "signup",
    createdAt: { $gte: oneMinuteAgo },
  });
  if (recent) {
    return res.status(429).json({
      error: "Ми щойно надіслали код. Зачекай хвилину перед наступним.",
    });
  }
  const lastHour = await EmailCode().countDocuments({
    email,
    purpose: "signup",
    createdAt: { $gte: oneHourAgo },
  });
  if (lastHour >= MAX_PENDING_CODES_PER_EMAIL) {
    return res.status(429).json({
      error: "Забагато спроб. Спробуй пізніше.",
    });
  }

  const passwordHash = await hashPassword(password);

  let user;
  if (existing) {
    // Refresh credentials of an unverified record.
    existing.passwordHash = passwordHash;
    existing.name = name;
    existing.role = role;
    user = await existing.save();
  } else {
    user = await User().create({
      email,
      passwordHash,
      name,
      role,
      emailVerifiedAt: null,
    });
  }

  // Invalidate any prior signup codes for this email so only the latest one works.
  await EmailCode().updateMany(
    { email, purpose: "signup", consumedAt: null },
    { $set: { consumedAt: new Date() } },
  );

  const code = generateNumericCode(6);
  const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60_000);
  await EmailCode().create({
    email,
    purpose: "signup",
    codeHash: hashCode(code),
    expiresAt,
  });

  const result = await sendCodeEmail({
    to: email,
    code,
    purpose: "signup",
    name,
  });

  return res.status(201).json({
    ok: true,
    requireVerification: true,
    email,
    expiresAt,
    delivered: result.delivered,
    // devCode is set only when no Resend key + non-prod, for local testing.
    ...(result.devCode ? { devCode: result.devCode } : {}),
  });
}
