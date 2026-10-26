import {
  allowTrailAction,
  clientIp,
  insertCheckin,
  listPublicCheckins,
  readCheckinPhoto,
  sameOrigin,
  validateCheckin,
} from "../../../lib/trail-feed.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body, status, extraHeaders) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders },
  });
}

function fail(error, status, extraHeaders) {
  return json({ ok: false, error }, status, extraHeaders);
}

function textField(form, name) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export async function GET() {
  try {
    const feed = await listPublicCheckins();
    return json({ ok: true, checkins: feed.checkins, limited: feed.limited }, 200);
  } catch (error) {
    const missing = error && error.code === "NO_DATABASE_URL";
    console.error("trail feed list failed", error instanceof Error ? error.message : "error");
    return fail(
      missing ? "The trail feed is not available yet." : "The trail feed could not be loaded.",
      missing ? 503 : 500
    );
  }
}

export async function POST(request) {
  if (!sameOrigin(request)) return fail("This check-in could not be saved.", 403);

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) return fail("Add a photo to check in.", 415);

  let form;
  try {
    form = await request.formData();
  } catch {
    return fail("This check-in could not be saved.", 400);
  }

  const validated = validateCheckin({
    userName: textField(form, "userName"),
    caption: textField(form, "caption"),
    ribbonColor: textField(form, "ribbonColor"),
    locationTag: textField(form, "locationTag"),
  });
  if (validated.error) return fail(validated.error, 400);

  const photo = await readCheckinPhoto(form.get("photo"));
  if (photo.error) return fail(photo.error, 400);

  if (!allowTrailAction(clientIp(request), "create", 8, 30 * 60 * 1000)) {
    return fail("Please wait a little while before sharing another check-in.", 429, {
      "Retry-After": "60",
    });
  }

  try {
    const saved = await insertCheckin({ ...validated.data, photo: photo.data });
    return json({ ok: true, id: saved.id, photoUrl: saved.photoUrl }, 201);
  } catch (error) {
    if (error && error.code === "PHOTO_REQUIRED") return fail("Add a photo to check in.", 400);
    const missing = error && error.code === "NO_DATABASE_URL";
    console.error("trail check-in insert failed", error instanceof Error ? error.message : "error");
    return fail(
      missing ? "The trail feed is not available yet." : "We could not save this check-in. Please try again.",
      missing ? 503 : 500
    );
  }
}
