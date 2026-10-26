import { readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-static";
export const runtime = "nodejs";

export function GET() {
  const html = readFileSync(join(process.cwd(), "trail-feed", "new", "index.html"), "utf8");
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
