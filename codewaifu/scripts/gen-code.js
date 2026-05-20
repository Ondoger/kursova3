/*
 * Dev helper: mint a fresh verification code for any email so we can
 * complete the registration/login flow locally without Resend's
 * sandbox restriction (which only delivers to the inbox of the
 * Resend account owner).
 *
 * Usage:
 *   node --env-file=.env.local scripts/gen-code.js <email> [purpose]
 *
 *   purpose ∈ { signup, login, reset }    (default: signup)
 *
 * The script invalidates any pending code for the same email+purpose
 * and prints a fresh one valid for 15 minutes. NEVER use in production.
 */
import { connectToDatabase } from "../api/_lib/db.js";
import { EmailCode } from "../api/_lib/models/index.js";
import { generateNumericCode, hashCode } from "../api/_lib/auth.js";

const [, , rawEmail, rawPurpose = "signup"] = process.argv;
if (!rawEmail) {
  console.error("Usage: node --env-file=.env.local scripts/gen-code.js <email> [purpose]");
  process.exit(2);
}
const email = rawEmail.trim().toLowerCase();
const purpose = rawPurpose.trim();
if (!["signup", "login", "reset"].includes(purpose)) {
  console.error(`Unknown purpose "${purpose}". Use one of: signup, login, reset.`);
  process.exit(2);
}

await connectToDatabase();

await EmailCode().updateMany(
  { email, purpose, consumedAt: null },
  { $set: { consumedAt: new Date() } },
);

const code = generateNumericCode(6);
const expiresAt = new Date(Date.now() + 15 * 60_000);
await EmailCode().create({
  email,
  purpose,
  codeHash: hashCode(code),
  expiresAt,
});

console.log("");
console.log("┌─────────────────────────────────────────┐");
console.log(`│ email:   ${email.padEnd(30)} │`);
console.log(`│ purpose: ${purpose.padEnd(30)} │`);
console.log(`│ code:    \x1b[1;33m${code}\x1b[0m                            │`);
console.log(`│ valid:   ${expiresAt.toISOString().slice(0, 19)}Z         │`);
console.log("└─────────────────────────────────────────┘");
console.log("");
process.exit(0);
