import { isAuthed } from "../../../../lib/admin-auth.mjs";
import { csvFilename, listTributes, requestOrigin, tributesToCsv } from "../../../../lib/tributes.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  if (!process.env.ADMIN_SECRET_KEY || !isAuthed(request)) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/admin/tributes",
        "Cache-Control": "no-store",
      },
    });
  }

  try {
    const rows = await listTributes();
    return new Response(tributesToCsv(rows, requestOrigin(request)), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename()}"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    console.error("tribute export failed", error instanceof Error ? error.message : "error");
    return new Response("The tribute list could not be exported.", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}
