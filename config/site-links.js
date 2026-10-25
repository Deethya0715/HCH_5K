/**
 * External registration, donation, and wishlist destinations.
 *
 * The matching hrefs in index.html are the placeholder link variables.
 * Set the environment variables in .env.example to a Zelle, Venmo, Stripe,
 * RunSignup, Amazon, or other https link. The homepage route substitutes
 * them when the site is built or served by Next.js.
 */

const PLACEHOLDER_LINKS = {
  HCH_REGISTER_URL: "https://example.com/hch/register",
  HCH_DONATE_URL: "https://example.com/hch/donate",
  HCH_WISHLIST_EVENT_OPS_URL:
    "https://example.com/hch/wishlist/event-operations",
  HCH_WISHLIST_AMAZON_TARGET_URL:
    "https://example.com/hch/wishlist/amazon-target",
  HCH_WISHLIST_COSTCO_VISA_URL: "https://example.com/hch/wishlist/costco-visa",
};

const LINK_KEYS = Object.keys(PLACEHOLDER_LINKS);

function isSafeHttpUrl(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "#") return false;

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return false;
  }

  return url.protocol === "https:" || url.protocol === "http:";
}

function resolveSiteLinks(env = process.env) {
  const links = {};

  for (const key of LINK_KEYS) {
    const configured = env[key];
    links[key] = isSafeHttpUrl(configured)
      ? configured.trim()
      : PLACEHOLDER_LINKS[key];
  }

  return links;
}

function applySiteLinks(html, env = process.env) {
  for (const url of Object.values(PLACEHOLDER_LINKS)) {
    if (!html.includes(url)) {
      throw new Error(
        `index.html is missing placeholder link ${url}. Keep it in sync with config/site-links.js.`
      );
    }
  }

  const links = resolveSiteLinks(env);
  const keysByLength = [...LINK_KEYS].sort(
    (a, b) => PLACEHOLDER_LINKS[b].length - PLACEHOLDER_LINKS[a].length
  );

  let next = html;
  for (const key of keysByLength) {
    next = next.split(PLACEHOLDER_LINKS[key]).join(links[key]);
  }
  return next;
}

module.exports = {
  LINK_KEYS,
  PLACEHOLDER_LINKS,
  isSafeHttpUrl,
  resolveSiteLinks,
  applySiteLinks,
};
