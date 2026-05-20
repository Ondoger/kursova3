import { connectToDatabase } from "../_lib/db.js";
import { User, EmailCode } from "../_lib/models/index.js";
import { generateNumericCode, hashCode } from "../_lib/auth.js";
import { sendCodeEmail } from "../_lib/email.js";
import { parseOr400, resendCodeSchema } from "../_lib/validate.js";

/*
 * POST /api/auth/resend-code
 * Body: { email, purpose }
 *
 * Re-issues a verification code. Throttled: one code per minute per email.
 *
 * Note on user enumeration: we always return 200 with the same shape,
 * even if the email isn't registered, so an attacker can't probe which
 * emails exist. Codes are only created+sent for actual users.
 */

const CODE_TTL_MIN = 10;
const RESEND_WINDOW_MIN = 1;
const MAX_PER_HOUR = 5;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = parseOr400(res, resendCodeSchema, req.body);
  if (!body) return;
  const { email, purpose } = body;

  await connectToDatabase();
  const user = await User().findOne({ email });

  // Always pretend we sent — never leak whether email is registered.
  const baseResponse = {
    ok: true,
    email,
    expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60_000),
    delivered: false,
  };
  if (!user) return res.status(200).json(baseResponse);

  // For signup purpose, refuse if already verified.
  if (purpose === "signup" && user.emailVerifiedAt) {
    return res
      .status(200)
      .json({ ...baseResponse, error: "Вже підтверджено", noOp: true });
  }

  const oneMinuteAgo = new Date(Date.now() - RESEND_WINDOW_MIN * 60_000);
  const oneHourAgo = new Date(Date.now() - 60 * 60_000);
  const recent = await EmailCode().findOne({
    email,
    purpose,
    createdAt: { $gte: oneMinuteAgo },
  });
  if (recent) {
    return res.status(429).json({
      error: "Зачекай хвилину перед запитом нового коду.",
    });
  }
  const lastHour = await EmailCode().countDocuments({
    email,
    purpose,
    createdAt: { $gte: oneHourAgo },
  });
  if (lastHour >= MAX_PER_HOUR) {
    return res.status(429).json({ error: "Забагато спроб. Спробуй пізніше." });
  }

  // Invalidate previous unconsumed codes of the same purpose.
  await EmailCode().updateMany(
    { email, purpose, consumedAt: null },
    { $set: { consumedAt: new Date() } },
  );

  const code = generateNumericCode(6);
  const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60_000);
  await EmailCode().create({
    email,
    purpose,
    codeHash: hashCode(code),
    expiresAt,
  });

  const result = await sendCodeEmail({
    to: email,
    code,
    purpose,
    name: user.name,
  });

  return res.status(200).json({
    ...baseResponse,
    expiresAt,
    delivered: result.delivered,
    ...(result.devCode ? { devCode: result.devCode } : {}),
  });
}
