import { insertTribute, readHeroPhoto, validateTribute } from "../../../lib/tributes.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body, status) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function fail(error, status) {
  return json({ success: false, ok: false, error }, status);
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const hosts = [request.headers.get("x-forwarded-host"), request.headers.get("host")]
    .filter(Boolean)
    .map((value) => value.split(",")[0].trim());
  return hosts.includes(originHost);
}

function textField(form, name) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export async function POST(request) {
  if (!sameOrigin(request)) {
    return fail("This dedication could not be saved.", 403);
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return fail("Attach a photo of your hero.", 415);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return fail("This dedication could not be saved.", 400);
  }

  const validated = validateTribute({
    submitterName: textField(form, "submitterName"),
    contactEmail: textField(form, "contactEmail"),
    phone: textField(form, "phone"),
    relationship: textField(form, "relationship"),
    heroName: textField(form, "heroName"),
    ribbon: textField(form, "ribbon"),
    message: textField(form, "message"),
    qrLink: textField(form, "qrLink") || textField(form, "caringBridge"),
    treatmentDate: textField(form, "treatmentDate"),
    milestone: textField(form, "milestone"),
    signType: textField(form, "signType"),
    sponsorName: textField(form, "sponsorName"),
    returnMethod: textField(form, "returnMethod"),
    mailAddress: textField(form, "mailAddress"),
  });
  if (validated.error) {
    return fail(validated.error, 400);
  }

  const photo = await readHeroPhoto(form.get("heroPhoto"));
  if (photo.error) {
    return fail(photo.error, 400);
  }

  try {
    const saved = await insertTribute({ ...validated.data, photo: photo.data });
    return json({ success: true, ok: true, id: saved.id }, 201);
  } catch (error) {
    if (error && error.code === "PHOTO_REQUIRED") {
      return fail("Attach a photo of your hero.", 400);
    }
    const missing = error && error.code === "NO_DATABASE_URL";
    console.error("tribute insert failed", error instanceof Error ? error.message : "error");
    return fail(
      missing
        ? "Tribute storage is not configured yet."
        : "We could not save this dedication. Please try again.",
      missing ? 503 : 500
    );
  }
}
