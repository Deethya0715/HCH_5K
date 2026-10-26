import {
  addReaction,
  allowTrailAction,
  clientIp,
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
    return json({ ok: false, error: "That reaction could not be saved." }, 403);
  }
  const id = params?.id || "";
  if (!isCheckinId(id)) {
    return json({ ok: false, error: "This check-in is no longer on the feed." }, 404);
  }

  let reaction = "";
  try {
    const body = await request.json();
    reaction = body && typeof body.reaction === "string" ? body.reaction : "";
  } catch {
    return json({ ok: false, error: "Choose a heart, candle, or hug." }, 400);
  }
  if (reaction !== "hearts" && reaction !== "candles" && reaction !== "hugs") {
    return json({ ok: false, error: "Choose a heart, candle, or hug." }, 400);
  }

  if (!allowTrailAction(clientIp(request), "react", 180, 10 * 60 * 1000)) {
    return json({ ok: false, error: "Please wait a moment, then try that reaction again." }, 429, {
      "Retry-After": "30",
    });
  }

  try {
    const reactions = await addReaction(id, reaction);
    if (!reactions) {
      return json({ ok: false, error: "This check-in is no longer on the feed." }, 404);
    }
    return json({ ok: true, reactions }, 200);
  } catch (error) {
    const missing = error && error.code === "NO_DATABASE_URL";
    console.error("trail reaction failed", error instanceof Error ? error.message : "error");
    return json(
      { ok: false, error: missing ? "The trail feed is not available yet." : "That reaction could not be saved." },
      missing ? 503 : 500
    );
  }
}
