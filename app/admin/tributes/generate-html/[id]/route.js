import { isAuthed } from "../../../../../lib/admin-auth.mjs";
import { renderMessage } from "../../../../../lib/admin-page.mjs";
import { renderSignHtml } from "../../../../../lib/sign-page.mjs";
import { getTributeById } from "../../../../../lib/tributes.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function html(body, status = 200, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      ...extraHeaders,
    },
  });
}

function redirect(location) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request, { params }) {
  if (!process.env.ADMIN_SECRET_KEY) {
    return html(renderMessage("Admin access is not configured."), 503);
  }
  if (!isAuthed(request)) return redirect("/admin/tributes");

  const id = String(params?.id || "");
  if (!/^[1-9]\d{0,17}$/.test(id)) {
    return html(renderMessage("That tribute sign could not be found."), 404);
  }

  try {
    const row = await getTributeById(id);
    if (!row) return html(renderMessage("That tribute sign could not be found."), 404);
    return html(renderSignHtml(row));
  } catch (error) {
    console.error("tribute sign failed", error instanceof Error ? error.message : "error");
    return html(renderMessage("The tribute sign could not be generated. Try again in a moment."), 500);
  }
}
