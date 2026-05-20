import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/*
 * Generic dev-time loader for Vercel-style API routes under /api/*.
 *
 * Maps an incoming /api/foo/bar request to:
 *   1. api/foo/bar.js       (preferred)
 *   2. api/foo/bar/index.js
 *
 * Wraps Node's req/res with the Express-like helpers Vercel's runtime
 * adds (res.status, res.json, etc.) so the same handler runs locally
 * and in production without changes.
 *
 * Loads .env.local automatically (via Vite's loadEnv) so MONGODB_URI etc.
 * are visible to the handler.
 */

function loadEnvIntoProcess(mode) {
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of Object.keys(env)) {
    // Don't override real env, just fill gaps (Vercel/CI/etc. take priority).
    if (process.env[key] === undefined) process.env[key] = env[key];
  }
  return env;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      if (!body) return resolve(undefined);
      const ct = req.headers["content-type"] || "";
      if (ct.includes("application/json")) {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(e); }
      } else if (ct.includes("application/x-www-form-urlencoded")) {
        resolve(Object.fromEntries(new URLSearchParams(body)));
      } else {
        resolve(body);
      }
    });
    req.on("error", reject);
  });
}

function decorateResponse(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => {
    if (!res.getHeader("Content-Type")) {
      res.setHeader("Content-Type", "application/json");
    }
    res.end(JSON.stringify(data));
    return res;
  };
  res.send = (data) => {
    if (typeof data === "object") return res.json(data);
    res.end(String(data ?? ""));
    return res;
  };
  return res;
}

/**
 * Resolve a URL path like "/api/rooms/abc123/members/xyz" to:
 *   1. an exact static file (api/rooms/abc123/members/xyz.js — unlikely)
 *   2. a static index    (api/rooms/abc123/members/xyz/index.js)
 *   3. a [param] dynamic segment match
 *      (api/rooms/[id]/members/[userId].js or .../[userId]/index.js)
 *
 * Returns { filePath, params } or null. `params` mirrors Vercel:
 * each [name] segment becomes req.query[name].
 */
function resolveHandlerPath(apiRoot, urlPath) {
  const cleanPath = urlPath.split("?")[0].replace(/^\/api\/?/, "");
  if (!cleanPath) return null;
  const segments = cleanPath.split("/").filter(Boolean);

  /** @type {{ filePath: string, params: Record<string,string> } | null} */
  let bestMatch = null;
  let bestStaticDepth = -1;

  function walk(dirAbs, segIdx, params) {
    if (!existsSync(dirAbs)) return;
    let entries;
    try { entries = readdirSync(dirAbs); } catch { return; }

    // No more URL segments → look for index.js in this dir.
    if (segIdx === segments.length) {
      const idx = path.join(dirAbs, "index.js");
      if (existsSync(idx)) recordMatch(idx, params, segIdx);
      return;
    }

    const seg = segments[segIdx];
    const isLast = segIdx === segments.length - 1;

    // 1) Static file match `<seg>.js` (only when this is the last segment).
    if (isLast) {
      const staticFile = path.join(dirAbs, `${seg}.js`);
      if (existsSync(staticFile) && statSync(staticFile).isFile()) {
        recordMatch(staticFile, params, segIdx + 1);
      }
    }

    // 2) Static directory match `<seg>/`.
    const staticDir = path.join(dirAbs, seg);
    if (existsSync(staticDir) && statSync(staticDir).isDirectory()) {
      walk(staticDir, segIdx + 1, params);
    }

    // 3) Dynamic [param] match — file `[name].js` or directory `[name]/`.
    //    Also supports catch-all `[...name].js` and `[...name]/`.
    for (const entry of entries) {
      const fileMatch = /^\[(\.\.\.)?([^\]]+)\]\.js$/.exec(entry);
      const dirMatch = /^\[(\.\.\.)?([^\]]+)\]$/.exec(entry);
      const m = fileMatch ?? dirMatch;
      if (!m) continue;
      const isFile = Boolean(fileMatch);
      const isCatchAll = Boolean(m[1]);
      const paramName = m[2];
      const entryAbs = path.join(dirAbs, entry);

      if (isCatchAll) {
        const restSegs = segments.slice(segIdx);
        if (isFile) {
          recordMatch(
            entryAbs,
            { ...params, [paramName]: restSegs.join("/") },
            segments.length,
          );
        } else {
          const idx = path.join(entryAbs, "index.js");
          if (existsSync(idx)) {
            recordMatch(
              idx,
              { ...params, [paramName]: restSegs.join("/") },
              segments.length,
            );
          }
        }
        continue;
      }

      if (isFile && isLast) {
        recordMatch(entryAbs, { ...params, [paramName]: seg }, segIdx + 1);
      } else if (!isFile) {
        // Directory: descend further.
        walk(entryAbs, segIdx + 1, { ...params, [paramName]: seg });
      }
    }
  }

  function recordMatch(filePath, params, depth) {
    // Prefer matches with more static segments (e.g. /rooms/join over /rooms/[id]).
    const staticDepth = depth - Object.keys(params).length;
    if (staticDepth > bestStaticDepth) {
      bestMatch = { filePath, params };
      bestStaticDepth = staticDepth;
    }
  }

  walk(apiRoot, 0, {});
  return bestMatch;
}

function vercelApiDevServer() {
  return {
    name: "vercel-api-dev-server",
    configureServer(server) {
      const apiRoot = path.resolve(process.cwd(), "server/api");

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/")) return next();

        const match = resolveHandlerPath(apiRoot, req.url);
        if (!match) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: `No API route for ${req.url}` }));
          return;
        }
        const { filePath: handlerPath, params } = match;

        try {
          // Parse body once (skip for GET/HEAD)
          const method = (req.method || "GET").toUpperCase();
          if (!["GET", "HEAD"].includes(method)) {
            try {
              req.body = await readJsonBody(req);
            } catch (e) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Invalid request body", detail: e.message }));
              return;
            }
          }

          // Parse query string and merge with route params, like Vercel does.
          const u = new URL(req.url, "http://localhost");
          req.query = {
            ...Object.fromEntries(u.searchParams),
            ...params,
          };

          // Use Vite's SSR module loader so:
          //   - Edits to the handler AND its transitive deps (e.g.
          //     api/_lib/validate.js) are picked up immediately.
          //   - We don't accumulate a leaked Node ESM cache from
          //     `import(file://…?t=...)`.
          // The transform pipeline is bypassed for plain JS, so this is
          // ~free perf-wise.
          const mod = await server.ssrLoadModule(handlerPath);
          const handler = mod.default;
          if (typeof handler !== "function") {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
              error: `Handler at ${handlerPath} has no default export`,
            }));
            return;
          }

          decorateResponse(res);
          await handler(req, res);
        } catch (err) {
          console.error(`[api-dev] error in ${req.url}:`, err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
              error: "Internal server error",
              detail: err instanceof Error ? err.message : String(err),
            }));
          } else {
            res.end();
          }
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  loadEnvIntoProcess(mode);
  return {
    plugins: [react(), vercelApiDevServer()],
  };
});
