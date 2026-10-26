import { getCheckinPhoto } from "../../../../../lib/trail-feed.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request, { params }) {
  const token = params?.token || "";
  try {
    const photo = await getCheckinPhoto(token);
    if (!photo) {
      return new Response("Photo not found.", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow",
        },
      });
    }

    return new Response(photo.bytes, {
      status: 200,
      headers: {
        "Content-Type": photo.contentType,
        "Content-Length": String(photo.bytes.length),
        "Content-Disposition": `inline; filename="${photo.filename}"`,
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    const missing = error && error.code === "NO_DATABASE_URL";
    console.error("trail check-in photo failed", error instanceof Error ? error.message : "error");
    return new Response(missing ? "The trail feed is not available yet." : "Photo not found.", {
      status: missing ? 503 : 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
}
