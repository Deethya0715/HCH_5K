import { readFileSync } from "node:fs";
import { join } from "node:path";
import { listPublicCheckins, renderFeedCards, renderFeedError } from "../../lib/trail-feed.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MARKER = /<!--FEED_CARDS-->[\s\S]*?<!--\/FEED_CARDS-->/;

export async function GET() {
  const html = readFileSync(join(process.cwd(), "trail-feed", "index.html"), "utf8");
  let cards = "";
  try {
    const feed = await listPublicCheckins();
    cards = renderFeedCards(feed.checkins, feed.limited);
  } catch (error) {
    const missing = error && error.code === "NO_DATABASE_URL";
    console.error("trail feed page failed", error instanceof Error ? error.message : "error");
    cards = renderFeedError(
      missing ? "The trail feed is not available yet." : "The trail feed could not be loaded."
    );
  }

  const body = html.replace(MARKER, cards);
  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
