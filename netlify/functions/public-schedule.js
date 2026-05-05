// Netlify serverless function: returns a single JSON payload
// (widget_settings, lesson_types, events) for the public schedule widget.
//
// The browser cannot reach supabase.co directly from networks that block it
// (e.g. some Russian ISPs without VPN), so we proxy the read-only public
// queries through this same-origin function.

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://gupcgjwnattzhcsqecku.supabase.co";

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

const REST = SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1";

const COMMON_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: "Bearer " + SUPABASE_ANON_KEY,
  Accept: "application/json",
};

const RESPONSE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function fetchJSON(url, label) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, {
      headers: COMMON_HEADERS,
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const snippet = body && body.length > 300 ? body.slice(0, 300) + "…" : body;
      const err = new Error(label + ": HTTP " + res.status + (snippet ? " — " + snippet : ""));
      err.statusCode = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export const handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: RESPONSE_HEADERS, body: "" };
  }
  if (event.httpMethod && event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: RESPONSE_HEADERS,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  if (!SUPABASE_ANON_KEY) {
    return {
      statusCode: 500,
      headers: RESPONSE_HEADERS,
      body: JSON.stringify({
        error:
          "Server misconfigured: SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) is not set.",
      }),
    };
  }

  try {
    const settingsURL =
      REST + "/widget_settings?select=show_past_events,max_events&limit=1";
    const ltURL =
      REST +
      "/lesson_types?select=id,name,card_bg_color,card_bg_opacity,date_box_color,text_color";

    const [settingsRows, lessonTypes] = await Promise.all([
      fetchJSON(settingsURL, "widget_settings"),
      fetchJSON(ltURL, "lesson_types"),
    ]);

    const settings =
      (Array.isArray(settingsRows) && settingsRows[0]) || {
        show_past_events: false,
        max_events: 200,
      };

    const rawMax = parseInt(settings.max_events, 10);
    const maxEvents = Math.min(Math.max(Number.isFinite(rawMax) ? rawMax : 200, 1), 500);

    const fields = [
      "id",
      "title",
      "image_url",
      "lesson_type_id",
      "mode",
      "location",
      "start_at",
      "end_at",
      "description_short",
      "description_full",
      "teacher",
      "schedule",
      "is_published",
    ].join(",");

    let eventsURL =
      REST +
      "/events?select=" +
      encodeURIComponent(fields) +
      "&is_published=eq.true" +
      "&order=start_at.asc" +
      "&limit=" +
      maxEvents;

    if (!settings.show_past_events) {
      eventsURL += "&start_at=gte." + encodeURIComponent(new Date().toISOString());
    }

    const events = await fetchJSON(eventsURL, "events");

    return {
      statusCode: 200,
      headers: RESPONSE_HEADERS,
      body: JSON.stringify({
        settings,
        lesson_types: Array.isArray(lessonTypes) ? lessonTypes : [],
        events: Array.isArray(events) ? events : [],
      }),
    };
  } catch (err) {
    const isAbort = err && err.name === "AbortError";
    const message = isAbort
      ? "Upstream Supabase timeout"
      : err && err.message
      ? err.message
      : "Unknown error";
    return {
      statusCode: 502,
      headers: RESPONSE_HEADERS,
      body: JSON.stringify({ error: message }),
    };
  }
};
