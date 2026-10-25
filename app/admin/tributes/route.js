import {
  clearFailures,
  clearSessionCookie,
  clientIp,
  isAuthed,
  loginAllowed,
  recordFailure,
  secretsMatch,
  sessionCookie,
} from "../../../lib/admin-auth.mjs";
import { renderLogin, renderMessage, renderTable } from "../../../lib/admin-page.mjs";
import { listTributes } from "../../../lib/tributes.mjs";

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

export async function GET(request) {
  if (!process.env.ADMIN_SECRET_KEY) {
    return html(renderMessage("Admin access is not configured."), 503);
  }
  if (!isAuthed(request)) return html(renderLogin());
  try {
    const rows = await listTributes();
    return html(renderTable(rows));
  } catch (error) {
    console.error("tribute list failed", error instanceof Error ? error.message : "error");
    return html(renderMessage("The tribute list could not be loaded. Try again in a moment."), 500);
  }
}

export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return html(renderLogin("Enter the admin password."), 400);
  }

  if (String(form.get("action") || "") === "logout") {
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/admin/tributes",
        "Set-Cookie": clearSessionCookie(request),
        "Cache-Control": "no-store",
      },
    });
  }

  if (!process.env.ADMIN_SECRET_KEY) {
    return html(renderMessage("Admin access is not configured."), 503);
  }

  const ip = clientIp(request);
  if (!loginAllowed(ip)) {
    return html(renderLogin("Too many attempts. Try again in a few minutes."), 429);
  }

  const password = String(form.get("password") || "");
  if (!secretsMatch(password, process.env.ADMIN_SECRET_KEY)) {
    recordFailure(ip);
    return html(renderLogin("That password is not correct."), 401);
  }

  clearFailures(ip);
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/admin/tributes",
      "Set-Cookie": sessionCookie(request),
      "Cache-Control": "no-store",
    },
  });
}
