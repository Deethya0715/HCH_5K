import { readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-static";
export const runtime = "nodejs";

const html = readFileSync(join(process.cwd(), "index.html"), "utf8");

export function GET() {
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
