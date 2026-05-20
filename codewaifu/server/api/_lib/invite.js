import crypto from "node:crypto";
import { Room } from "./models/index.js";

/*
 * Invite code helpers.
 *
 * Format: 8 chars from a Crockford-base32-like alphabet that drops
 * visually-ambiguous characters (no I, L, O, 0, 1). With ~30^8 ≈ 6.5e11
 * possibilities and ~10^4 active rooms expected, collision odds are
 * negligible. We still retry up to 5 times on the (extremely rare)
 * race-conditioned collision against the unique index.
 */

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LEN = 8;
const MAX_TRIES = 5;

/**
 * Generate one random invite code (no DB check).
 */
export function generateInviteCode(len = CODE_LEN) {
  const bytes = crypto.randomBytes(len);
  let s = "";
  for (let i = 0; i < len; i++) {
    s += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return s;
}

/**
 * Generate a code that doesn't yet exist in `rooms`. Catches the rare
 * collision case and retries.
 */
export async function generateUniqueInviteCode() {
  for (let i = 0; i < MAX_TRIES; i++) {
    const code = generateInviteCode();
    const exists = await Room().exists({ inviteCode: code });
    if (!exists) return code;
  }
  // Should be unreachable, but throw rather than silently produce a dup.
  throw new Error("Could not allocate a unique invite code, try again");
}

/**
 * Normalise user input — case-insensitive, strip dashes/spaces.
 *   "k4-m9 x7p2" → "K4M9X7P2"
 */
export function normaliseInviteCode(raw) {
  if (typeof raw !== "string") return "";
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
