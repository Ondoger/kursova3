import { connectToDatabase } from "./_lib/db.js";
import { User } from "./_lib/models/index.js";

/*
 * GET /api/health
 *
 * Verifies the API container is alive and the MongoDB connection works.
 * Returns timing info so we can spot slow Atlas regions in production.
 *
 * NOT for monitoring uptime in prod — exposes too much, and runs a real
 * query. Wrap behind an auth check or remove before going live.
 */
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const start = Date.now();
  try {
    const conn = await connectToDatabase();
    const dbConnectMs = Date.now() - start;

    // Run a tiny round-trip query to confirm reads also work.
    const queryStart = Date.now();
    const userCount = await User().estimatedDocumentCount();
    const queryMs = Date.now() - queryStart;

    return res.status(200).json({
      ok: true,
      env: process.env.NODE_ENV || "development",
      db: {
        host: conn.host,
        name: conn.name,
        readyState: conn.readyState, // 1 === connected
        connectMs: dbConnectMs,
        queryMs,
        userCount,
      },
      ts: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[health] error:", err);
    return res.status(503).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      env: {
        nodeEnv: process.env.NODE_ENV || null,
        hasMongoDbUri: Boolean(process.env.MONGODB_URI),
        hasMongoDbUrl: Boolean(process.env.MONGODB_URL),
        hasMongoUri: Boolean(process.env.MONGO_URI),
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        vercelEnv: process.env.VERCEL_ENV || null,
      },
    });
  }
}
