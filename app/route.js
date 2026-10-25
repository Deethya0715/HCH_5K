import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { applySiteLinks } = require("../config/site-links");

export const dynamic = "force-static";
export const runtime = "nodejs";

export function GET() {
  const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
  const htmlWithLinks = applySiteLinks(html, {
    HCH_REGISTER_URL: process.env.HCH_REGISTER_URL,
    HCH_DONATE_URL: process.env.HCH_DONATE_URL,
    HCH_WISHLIST_EVENT_OPS_URL: process.env.HCH_WISHLIST_EVENT_OPS_URL,
    HCH_WISHLIST_AMAZON_TARGET_URL: process.env.HCH_WISHLIST_AMAZON_TARGET_URL,
    HCH_WISHLIST_COSTCO_VISA_URL: process.env.HCH_WISHLIST_COSTCO_VISA_URL,
  });
  return new Response(htmlWithLinks, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
