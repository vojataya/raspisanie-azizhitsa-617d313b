// Netlify serverless function: same-origin image proxy for public Supabase
// Storage objects in the `event-images` bucket. Browsers on networks that
// block supabase.co (e.g. some Russian ISPs without VPN) cannot fetch images
// directly, so we stream them through this same-origin endpoint.
//
// Query parameters:
//   path  – storage object path (preferred), e.g. "abc/cover.jpg".
//           Resolved against /storage/v1/{render/image|object}/public/event-images/.
//   url   – full Supabase public URL (object or render). Optional fallback.
//           Only accepted when host matches the configured Supabase host AND
//           path starts with one of the allowed prefixes.
//   w     – target width, clamped to [320, 1600]. Optional.
//   q     – encode quality, clamped to [60, 90]. Optional.
//
// Behavior:
//   - Tries the render/image endpoint first when w or q are supplied.
//   - Falls back to the original object URL on any non-2xx render response.
//   - Returns base64 image bytes (Netlify requires isBase64Encoded for binary).
//   - Sets long-lived public cache headers; the bucket contents are immutable
//     in practice (admin re-uploads under new keys).

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://gupcgjwnattzhcsqecku.supabase.co";

const SUPABASE_HOST = (() => {
  try { return new URL(SUPABASE_URL).host; } catch (_) { return ""; }
})();

const ALLOWED_BUCKET = "event-images";
const OBJECT_PREFIX = "/storage/v1/object/public/" + ALLOWED_BUCKET + "/";
const RENDER_PREFIX = "/storage/v1/render/image/public/" + ALLOWED_BUCKET + "/";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function clampInt(v, lo, hi) {
  var n = parseInt(v, 10);
  if (!Number.isFinite(n)) return null;
  if (n < lo) n = lo;
  if (n > hi) n = hi;
  return n;
}

function safeStorageKey(raw) {
  if (!raw || typeof raw !== "string") return null;
  // Disallow any leading slashes, scheme, query, or path traversal.
  if (raw.indexOf("..") !== -1) return null;
  // Strip leading slashes; refuse if it starts with the storage prefix again.
  var key = raw.replace(/^\/+/, "");
  if (key.startsWith("storage/")) return null;
  // Drop any query string accidentally included.
  var qIdx = key.indexOf("?");
  if (qIdx !== -1) key = key.slice(0, qIdx);
  if (!key) return null;
  // Restrict to a conservative charset (paths Supabase actually emits).
  if (!/^[A-Za-z0-9._\-\/%()]+$/.test(key)) return null;
  return key;
}

function keyFromFullUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  var u;
  try { u = new URL(raw); } catch (_) { return null; }
  if (u.host !== SUPABASE_HOST) return null;
  var p = u.pathname;
  if (p.startsWith(OBJECT_PREFIX)) return safeStorageKey(p.slice(OBJECT_PREFIX.length));
  if (p.startsWith(RENDER_PREFIX)) return safeStorageKey(p.slice(RENDER_PREFIX.length));
  return null;
}

async function fetchUpstream(url) {
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, 12000);
  try {
    var res = await fetch(url, {
      headers: { Accept: "image/*,*/*;q=0.8" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export const handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod && event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
    return {
      statusCode: 405,
      headers: Object.assign({ "Content-Type": "text/plain" }, CORS_HEADERS),
      body: "Method not allowed",
    };
  }

  var qs = event.queryStringParameters || {};
  var key = safeStorageKey(qs.path) || keyFromFullUrl(qs.url);
  if (!key) {
    return {
      statusCode: 400,
      headers: Object.assign({ "Content-Type": "text/plain" }, CORS_HEADERS),
      body: "Bad request: missing or invalid path/url (must reference event-images)",
    };
  }

  var w = clampInt(qs.w, 320, 1600);
  var q = clampInt(qs.q, 60, 90);

  var base = SUPABASE_URL.replace(/\/+$/, "");
  var renderURL = base + RENDER_PREFIX + key;
  var objectURL = base + OBJECT_PREFIX + key;

  if (w || q) {
    var rp = [];
    if (w) rp.push("width=" + w);
    if (q) rp.push("quality=" + q);
    renderURL += "?" + rp.join("&");
  }

  var attempts = (w || q) ? [renderURL, objectURL] : [objectURL];
  var lastStatus = 502;
  var lastErr = "";

  for (var i = 0; i < attempts.length; i++) {
    try {
      var res = await fetchUpstream(attempts[i]);
      if (!res.ok) {
        lastStatus = res.status;
        lastErr = "upstream HTTP " + res.status;
        continue;
      }
      var ct = res.headers.get("content-type") || "application/octet-stream";
      var buf = Buffer.from(await res.arrayBuffer());
      return {
        statusCode: 200,
        headers: Object.assign({
          "Content-Type": ct,
          "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800, immutable",
          "X-Image-Source": i === 0 && (w || q) ? "render" : "object",
        }, CORS_HEADERS),
        body: buf.toString("base64"),
        isBase64Encoded: true,
      };
    } catch (err) {
      lastErr = (err && err.message) || "fetch failed";
      if (err && err.name === "AbortError") lastStatus = 504;
    }
  }

  return {
    statusCode: lastStatus,
    headers: Object.assign({ "Content-Type": "text/plain" }, CORS_HEADERS),
    body: "Image proxy error: " + lastErr,
  };
};
