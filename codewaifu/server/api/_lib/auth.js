import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import crypto from "node:crypto";
import { User } from "./models/index.js";
import { connectToDatabase } from "./db.js";

/*
 * Auth primitives — JWT issued in an httpOnly cookie, password hashing,
 * 6-digit code generation/verification, requireAuth() middleware.
 *
 * Cookie strategy:
 *   - HttpOnly so JS in the browser can't read it (defends XSS)
 *   - Secure in prod, off in dev (otherwise localhost http breaks)
 *   - SameSite=Lax — strict enough for CSRF + still allows top-level navigation
 *   - 7-day TTL — short enough that a compromised token expires quickly,
 *     long enough that users don't re-login daily. We can add refresh
 *     rotation later if needed.
 */

const COOKIE_NAME = "gq_session";
const ACCESS_TOKEN_TTL_DAYS = 7;
const SALT_ROUNDS = 10;

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "JWT_SECRET is missing or too short. Set a 32+ char hex string in .env.local.",
    );
  }
  return s;
}

/* ── Password ────────────────────────────────────────────────────────── */

export async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

/* ── 6-digit codes ───────────────────────────────────────────────────── */

/**
 * Generate a cryptographically random 6-digit numeric code.
 * Math.random is NOT acceptable here — codes must be unguessable.
 */
export function generateNumericCode(digits = 6) {
  const max = 10 ** digits;
  // Use rejection sampling so we don't bias toward lower numbers.
  const buf = crypto.randomBytes(4);
  const n = buf.readUInt32BE(0) % max;
  return String(n).padStart(digits, "0");
}

/**
 * Hash a code (so we never store the raw value, just like passwords).
 * We use a fast HMAC keyed with JWT_SECRET — bcrypt is overkill for a
 * 6-digit value with a short TTL, and HMAC is constant-time-comparable.
 */
export function hashCode(code) {
  return crypto.createHmac("sha256", getJwtSecret()).update(code).digest("hex");
}

export function compareCodeHash(code, storedHash) {
  if (!code || !storedHash) return false;
  const candidate = hashCode(code);
  // Constant-time compare to avoid timing attacks.
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ── JWT + cookie ────────────────────────────────────────────────────── */

export function signSessionToken(user) {
  const payload = {
    sub: String(user._id),
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: `${ACCESS_TOKEN_TTL_DAYS}d`,
  });
}

export function verifySessionToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

export function setSessionCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  const serialized = cookie.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_DAYS * 24 * 60 * 60,
  });
  // Append-style: don't clobber other Set-Cookie headers if present.
  const existing = res.getHeader("Set-Cookie");
  if (!existing) {
    res.setHeader("Set-Cookie", serialized);
  } else if (Array.isArray(existing)) {
    res.setHeader("Set-Cookie", [...existing, serialized]);
  } else {
    res.setHeader("Set-Cookie", [existing, serialized]);
  }
}

export function clearSessionCookie(res) {
  const serialized = cookie.serialize(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  res.setHeader("Set-Cookie", serialized);
}

export function getSessionFromRequest(req) {
  const header = req.headers?.cookie;
  if (!header) return null;
  const parsed = cookie.parse(header);
  const token = parsed[COOKIE_NAME];
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Wrap a handler to require an authenticated user. Loads the User
 * document and attaches it as `req.user`. If `roles` is provided, the
 * user must have one of those roles.
 *
 *   export default requireAuth(["teacher"], async (req, res) => {...});
 */
export function requireAuth(rolesOrHandler, maybeHandler) {
  let allowedRoles = null;
  let handler;
  if (typeof rolesOrHandler === "function") {
    handler = rolesOrHandler;
  } else {
    allowedRoles = rolesOrHandler;
    handler = maybeHandler;
  }
  return async (req, res) => {
    const session = getSessionFromRequest(req);
    if (!session?.sub) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    await connectToDatabase();
    const user = await User().findById(session.sub).lean();
    if (!user) {
      return res.status(401).json({ error: "Session user not found" });
    }
    if (!user.emailVerifiedAt) {
      return res.status(403).json({ error: "Email not verified" });
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden for this role" });
    }
    req.user = user;
    return handler(req, res);
  };
}

/**
 * Project a user document into the safe shape returned to clients.
 * Strips passwordHash and other internals.
 */
export function publicUser(user) {
  if (!user) return null;
  return {
    id: String(user._id ?? user.id),
    email: user.email,
    name: user.name,
    role: user.role,
    // Prefer the GitHub avatar over the bare avatarUrl when both exist —
    // it usually looks better and is auto-updated by GitHub.
    avatarUrl: user.avatarUrl ?? user.githubAvatarUrl ?? null,
    githubLogin: user.githubLogin ?? null,
    githubLinkedAt: user.githubLinkedAt ?? null,
    emailVerified: Boolean(user.emailVerifiedAt),
    totals: user.totals ?? { coins: 0, xp: 0 },
    profileStyle: user.profileStyle ?? {},
    createdAt: user.createdAt,
  };
}
