import {
  allowTrailAction,
  clientIp,
  flagCheckin,
  isCheckinId,
  sameOrigin,
} from "../../../../../lib/trail-feed.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body, status, extraHeaders) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders },
  });
}

export async function POST(request, { params }) {
  if (!sameOrigin(request)) {
    return json({ ok: false, error: "This check-in could not be hidden." }, 403);
  }
  const id = params?.id || "";
  if (!isCheckinId(id)) {
    return json({ ok: false, error: "This check-in is no longer on the feed." }, 404);
  }
  if (!allowTrailAction(clientIp(request), "flag", 20, 15 * 60 * 1000)) {
    return json({ ok: false, error: "Please wait a moment before reporting another post." }, 429, {
      "Retry-After": "60",
    });
  }

  try {
    const hidden = await flagCheckin(id);
    if (!hidden) {
      return json({ ok: false, error: "This check-in is no longer on the feed." }, 404);
    }
    return json({ ok: true }, 200);
  } catch (error) {
    const missing = error && error.code === "NO_DATABASE_URL";
    console.error("trail flag failed", error instanceof Error ? error.message : "error");
    return json(
      { ok: false, error: missing ? "The trail feed is not available yet." : "This check-in could not be hidden." },
      missing ? 503 : 500
    );
  }
}
