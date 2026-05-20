import { routes } from "../server/api-route-manifest.js";

function getRequestPath(req) {
  const url = new URL(req.url || "/", "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    return url.pathname.slice("/api/".length);
  }
  const dynamicPath = req.query?.path;
  if (Array.isArray(dynamicPath)) return dynamicPath.join("/");
  if (dynamicPath) return String(dynamicPath);
  if (url.searchParams.get("path")) return url.searchParams.get("path");
  if (url.pathname === "/api") return "";
  return String(dynamicPath || url.pathname).replace(/^\/+/, "");
}

function matchRoute(requestPath) {
  const cleanPath = requestPath.split("?")[0].replace(/^\/+|\/+$/g, "");
  const segments = cleanPath.split("/").filter(Boolean);
  for (const route of routes) {
    if (route.pattern.length !== segments.length) continue;
    const params = {};
    let matches = true;

    for (let i = 0; i < route.pattern.length; i += 1) {
      const expected = route.pattern[i];
      const actual = segments[i];
      const dynamic = /^\[([^\]]+)\]$/.exec(expected);
      if (dynamic) {
        params[dynamic[1]] = actual;
      } else if (expected !== actual) {
        matches = false;
        break;
      }
    }

    if (matches) return { handler: route.handler, params };
  }
  return null;
}

export default async function apiRouter(req, res) {
  try {
    const requestPath = getRequestPath(req);
    const match = matchRoute(requestPath);

    if (!match) {
      return res.status(404).json({ error: `No API route for /api/${requestPath}` });
    }

    req.query = {
      ...(req.query || {}),
      ...match.params,
    };
    delete req.query.path;

    if (typeof match.handler !== "function") {
      return res.status(500).json({ error: `Handler for /api/${requestPath} has no default export` });
    }

    return match.handler(req, res);
  } catch (err) {
    console.error("[api-router] unhandled error:", err);
    if (!res.headersSent) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return res.end();
  }
}
