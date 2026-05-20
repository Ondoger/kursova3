import mongoose from "mongoose";
import dns from "node:dns";

/*
 * DNS fallback: mongodb+srv:// requires SRV record resolution, which Node
 * does directly against the servers reported by dns.getServers() (NOT via
 * the OS resolver). On some dev machines this list ends up as just
 * ['127.0.0.1'] (e.g. after a VPN client misconfigures it), and every
 * resolveSrv() call fails with ECONNREFUSED.
 *
 * If we detect a clearly-broken setup (only loopback servers), or if the
 * user explicitly opted in via MONGODB_DNS, swap to public resolvers.
 * This is a no-op in production (Vercel's resolvers are fine).
 */
function patchDnsIfBroken() {
  const override = process.env.MONGODB_DNS;
  if (override) {
    dns.setServers(override.split(",").map((s) => s.trim()).filter(Boolean));
    return;
  }
  const current = dns.getServers();
  const looksBroken =
    current.length === 0 ||
    current.every((ip) => ip === "127.0.0.1" || ip === "::1");
  if (looksBroken) {
    console.warn(
      `[db] system DNS looks broken (${current.join(",") || "empty"}), falling back to 8.8.8.8 / 1.1.1.1`,
    );
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
  }
}
patchDnsIfBroken();

/*
 * Cached MongoDB connection for Vercel serverless functions.
 *
 * Vercel re-uses Node containers between invocations, but new requests
 * may run in a fresh container. We stash the live connection on
 * `globalThis` so warm starts skip the handshake.
 *
 * NEVER call `mongoose.connect()` per-request without this — Atlas will
 * exhaust its connection limit very fast.
 */
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI && process.env.NODE_ENV !== "test") {
  // We don't throw here at import time — that would crash *every* function
  // even if it doesn't need the DB. Throw lazily inside connectToDatabase().
  console.warn("[db] MONGODB_URI is not set");
}

const cache = globalThis.__gqMongoose ?? { conn: null, promise: null };
globalThis.__gqMongoose = cache;
let indexesReady = false;

async function ensureUserIndexes(conn) {
  if (indexesReady || !conn?.db) return;
  const users = conn.db.collection("users");
  let indexes = [];
  try {
    indexes = await users.indexes();
  } catch (err) {
    if (err?.codeName !== "NamespaceNotFound") throw err;
  }
  const githubIdIndex = indexes.find((idx) => idx.name === "githubId_1");
  const githubIdIndexOk =
    githubIdIndex?.unique &&
    githubIdIndex?.partialFilterExpression?.githubId?.$type === "number";

  if (githubIdIndex && !githubIdIndexOk) {
    await users.dropIndex("githubId_1");
  }
  if (!githubIdIndexOk) {
    await users.createIndex(
      { githubId: 1 },
      {
        unique: true,
        name: "githubId_1",
        partialFilterExpression: { githubId: { $type: "number" } },
      },
    );
  }
  indexesReady = true;
}

export async function connectToDatabase() {
  if (cache.conn) {
    await ensureUserIndexes(cache.conn);
    return cache.conn;
  }

  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not configured. Set it in .env.local (dev) or Vercel project env (prod).",
    );
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(MONGODB_URI, {
        // Conservative pool — serverless functions are short-lived.
        maxPoolSize: 5,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 30000,
        // Avoid buffering: fail fast if disconnected.
        bufferCommands: false,
        // Keep API stable across mongoose minor versions.
        autoIndex: process.env.NODE_ENV !== "production",
      })
      .then((m) => m.connection);
  }

  cache.conn = await cache.promise;
  await ensureUserIndexes(cache.conn);
  return cache.conn;
}

/**
 * Helper for Vercel API handlers. Wraps a handler so it always has
 * a live MongoDB connection before executing.
 *
 * Usage:
 *   export default withDatabase(async (req, res) => { ... });
 */
export function withDatabase(handler) {
  return async (req, res) => {
    try {
      await connectToDatabase();
    } catch (err) {
      console.error("[db] connection error:", err);
      return res
        .status(503)
        .json({ error: "Database unavailable", detail: String(err.message) });
    }
    return handler(req, res);
  };
}
