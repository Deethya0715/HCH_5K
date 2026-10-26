import { randomBytes } from "node:crypto";
import { ensureTrailCheckinsTable, getPool } from "./db.mjs";

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export const FEED_LIMIT = 120;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PHOTO_TOKEN = /^[A-Za-z0-9_-]{32}$/;
const REACTION_KEYS = ["hearts", "candles", "hugs"];

export const LOCATION_TAGS = [
  "Pavilion",
  "Station 1",
  "Station 2",
  "Station 3",
  "North Loop",
  "Honoring Our Heroes Trail",
  "Finish Line",
  "Participating from Home",
];

const LOCATIONS = new Set(LOCATION_TAGS);

export const RIBBON_LABELS = {
  gold: "Gold ribbon",
  teal: "Teal ribbon",
  white: "White dove",
};

const RIBBON_EDGE = {
  gold: "#d97706",
  teal: "#0f766e",
  white: "#64748b",
};

const windows = new Map();

function limited(value, max) {
  const text = String(value ?? "")
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length > max) return { tooLong: true, value: "" };
  return { tooLong: false, value: text };
}

const ABBREVIATION = /^(dr|mr|mrs|ms|st|jr|sr|mt|ft)$/i;

function hasMultipleSentences(value) {
  const parts = value
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  let count = 0;
  let pendingAbbreviation = false;
  for (const part of parts) {
    const words = part.split(/\s+/).filter(Boolean);
    const token = words[0] || "";
    if (words.length === 1 && (ABBREVIATION.test(token) || /^[A-Za-z]$/.test(token))) {
      pendingAbbreviation = true;
      continue;
    }
    count += 1;
    pendingAbbreviation = false;
  }
  if (pendingAbbreviation) count += 1;
  return count > 1;
}

function countOf(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.min(Math.floor(number), 1000000);
}

export function normalizeReactions(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    hearts: countOf(source.hearts),
    candles: countOf(source.candles),
    hugs: countOf(source.hugs),
  };
}

function sniffImage(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= PNG_SIGNATURE.length && bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return "image/png";
  }
  return "";
}

function photoToken() {
  return randomBytes(24).toString("base64url");
}

export function checkinPhotoPath(token) {
  return `/api/trail-feed/photos/${token}`;
}

function photoFilename(contentType) {
  return contentType === "image/png" ? "trail-checkin.png" : "trail-checkin.jpg";
}

export function formatFeedTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `${formatted} CT`;
}

function toPublic(row) {
  const createdAt = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
  return {
    id: String(row.id),
    userName: row.user_name,
    photoUrl: row.photo_url,
    caption: row.caption,
    ribbonColor: row.ribbon_color,
    locationTag: row.location_tag,
    reactions: normalizeReactions(row.reactions),
    createdAt: Number.isNaN(createdAt.getTime()) ? "" : createdAt.toISOString(),
  };
}

export function validateCheckin(input) {
  const source = input && typeof input === "object" ? input : {};
  const userName = limited(source.userName, 80);
  const caption = limited(source.caption, 180);
  const ribbonColor = limited(source.ribbonColor, 20);
  const locationTag = limited(source.locationTag, 80);
  const fields = [userName, caption, ribbonColor, locationTag];
  if (fields.some((field) => field.tooLong)) {
    return { error: "One of the fields is too long." };
  }
  if (userName.value.length < 2) return { error: "Enter your name." };
  if (caption.value.length < 3 || !/[A-Za-z]/.test(caption.value)) {
    return { error: "Write a one-sentence kindness note." };
  }
  if (hasMultipleSentences(caption.value)) {
    return { error: "Keep the note to a single sentence." };
  }
  if (!RIBBON_LABELS[ribbonColor.value]) return { error: "Choose a ribbon." };
  if (!LOCATIONS.has(locationTag.value)) return { error: "Choose a trail location." };
  return {
    data: {
      userName: userName.value,
      caption: caption.value,
      ribbonColor: ribbonColor.value,
      locationTag: locationTag.value,
    },
  };
}

export async function readCheckinPhoto(file) {
  if (!file || typeof file.arrayBuffer !== "function" || typeof file.size !== "number") {
    return { error: "Add a photo to check in." };
  }
  if (!file.size) return { error: "Add a photo to check in." };
  if (file.size > MAX_PHOTO_BYTES) return { error: "Use a photo smaller than 4 MB." };

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.length) return { error: "Add a photo to check in." };
  if (bytes.length > MAX_PHOTO_BYTES) return { error: "Use a photo smaller than 4 MB." };

  const contentType = sniffImage(bytes);
  if (!contentType) return { error: "Use a PNG or JPG photo." };
  return { data: { bytes, contentType, filename: photoFilename(contentType) } };
}

function assertPhoto(photo) {
  if (!photo?.bytes?.length || photo.bytes.length > MAX_PHOTO_BYTES) return false;
  if (photo.contentType !== "image/png" && photo.contentType !== "image/jpeg") return false;
  return sniffImage(photo.bytes) === photo.contentType;
}

export async function insertCheckin(data) {
  if (!assertPhoto(data.photo)) {
    const error = new Error("Add a photo to check in.");
    error.code = "PHOTO_REQUIRED";
    throw error;
  }

  await ensureTrailCheckinsTable();
  const pool = getPool();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = photoToken();
    try {
      const result = await pool.query(
        `INSERT INTO trail_checkins (
          user_name,
          photo_url,
          caption,
          ribbon_color,
          location_tag,
          photo_token,
          photo_bytes,
          photo_content_type,
          photo_filename
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, created_at, reactions, photo_url, user_name, caption, ribbon_color, location_tag`,
        [
          data.userName,
          checkinPhotoPath(token),
          data.caption,
          data.ribbonColor,
          data.locationTag,
          token,
          data.photo.bytes,
          data.photo.contentType,
          data.photo.filename,
        ]
      );
      return toPublic(result.rows[0]);
    } catch (error) {
      if (error && error.code === "23505" && attempt === 0) continue;
      throw error;
    }
  }
  const error = new Error("Could not store the check-in photo.");
  error.code = "PHOTO_REQUIRED";
  throw error;
}

export async function listPublicCheckins() {
  await ensureTrailCheckinsTable();
  const result = await getPool().query(
    `SELECT id, user_name, photo_url, caption, ribbon_color, location_tag, reactions, created_at
     FROM trail_checkins
     WHERE is_approved = TRUE
       AND is_flagged = FALSE
     ORDER BY created_at DESC, id DESC
     LIMIT $1`,
    [FEED_LIMIT]
  );
  return {
    checkins: result.rows.map(toPublic),
    limited: result.rows.length === FEED_LIMIT,
  };
}

export async function addReaction(id, reaction) {
  if (!REACTION_KEYS.includes(reaction)) return null;
  await ensureTrailCheckinsTable();
  const result = await getPool().query(
    `UPDATE trail_checkins
     SET reactions = jsonb_set(
       COALESCE(reactions, '{"hearts":0,"candles":0,"hugs":0}'::jsonb),
       CASE $2
         WHEN 'hearts' THEN ARRAY['hearts']::text[]
         WHEN 'candles' THEN ARRAY['candles']::text[]
         WHEN 'hugs' THEN ARRAY['hugs']::text[]
       END,
       to_jsonb(LEAST(
         COALESCE(
           CASE $2
             WHEN 'hearts' THEN reactions->>'hearts'
             WHEN 'candles' THEN reactions->>'candles'
             WHEN 'hugs' THEN reactions->>'hugs'
           END,
           '0'
         )::int + 1,
         1000000
       )),
       true
     )
     WHERE id = $1::bigint
       AND is_approved = TRUE
       AND is_flagged = FALSE
     RETURNING reactions`,
    [id, reaction]
  );
  const row = result.rows[0];
  if (!row) return null;
  return normalizeReactions(row.reactions);
}

export async function flagCheckin(id) {
  await ensureTrailCheckinsTable();
  const result = await getPool().query(
    `UPDATE trail_checkins
     SET is_flagged = TRUE
     WHERE id = $1::bigint
       AND is_approved = TRUE
       AND is_flagged = FALSE
     RETURNING id`,
    [id]
  );
  return Boolean(result.rows[0]);
}

export async function getCheckinPhoto(token) {
  if (!PHOTO_TOKEN.test(String(token || ""))) return null;
  await ensureTrailCheckinsTable();
  const result = await getPool().query(
    `SELECT photo_bytes, photo_content_type, photo_filename
     FROM trail_checkins
     WHERE photo_token = $1
       AND is_approved = TRUE
       AND is_flagged = FALSE
       AND photo_bytes IS NOT NULL`,
    [token]
  );
  const row = result.rows[0];
  if (!row?.photo_bytes?.length) return null;
  if (row.photo_content_type !== "image/png" && row.photo_content_type !== "image/jpeg") return null;
  return {
    bytes: row.photo_bytes,
    contentType: row.photo_content_type,
    filename: photoFilename(row.photo_content_type),
  };
}

export function allowTrailAction(ip, bucket, limit, windowMs) {
  const key = `${bucket}:${ip || "local"}`;
  const now = Date.now();
  const entry = windows.get(key);
  if (!entry || entry.reset < now) {
    windows.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

export function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const first = forwarded.split(",")[0].trim();
  return first || request.headers.get("x-real-ip") || "local";
}

export function sameOrigin(request) {
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

export function isCheckinId(value) {
  return /^[1-9]\d{0,17}$/.test(String(value || ""));
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function reactionButton(key, emoji, label, count) {
  const safeCount = countOf(count);
  return `<button type="button" data-reaction="${key}" class="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100" aria-label="${label}, ${safeCount}">
    <span aria-hidden="true">${emoji}</span>
    <span data-count="${key}">${safeCount}</span>
  </button>`;
}

function cardHtml(checkin) {
  const ribbon = RIBBON_LABELS[checkin.ribbonColor] ? checkin.ribbonColor : "white";
  const edge = RIBBON_EDGE[ribbon];
  const reactions = normalizeReactions(checkin.reactions);
  const when = formatFeedTime(checkin.createdAt);
  const photo = /^\/api\/trail-feed\/photos\/[A-Za-z0-9_-]{32}$/.test(checkin.photoUrl)
    ? checkin.photoUrl
    : "";
  const name = esc(checkin.userName);
  const caption = esc(checkin.caption);
  const location = esc(checkin.locationTag);
  const image = photo
    ? `<img src="${esc(photo)}" alt="${name}'s check-in at ${location}" width="1080" height="1350" class="w-full object-cover" loading="lazy" decoding="async">`
    : "";
  return `<article id="checkin-${esc(checkin.id)}" tabindex="-1" data-id="${esc(checkin.id)}" data-name="${name}" data-caption="${caption}" data-photo="${esc(photo)}" data-location="${location}" data-ribbon="${esc(ribbon)}" class="trail-card scroll-mt-24 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" style="border-top:4px solid ${edge}">
    ${image}
    <div class="p-4">
      <p class="text-xs font-bold uppercase tracking-wider text-slate-500">${location}</p>
      <h2 class="mt-1 text-lg font-extrabold text-slate-900">${name}</h2>
      <p class="trail-copy mt-2 text-sm leading-relaxed text-slate-700">${caption}</p>
      <p class="mt-2 text-xs font-medium text-slate-500">${esc(RIBBON_LABELS[ribbon] || "Ribbon")}${when ? ` · ${esc(when)}` : ""}</p>
      <div class="mt-4 flex flex-wrap gap-2" role="group" aria-label="Reactions">
        ${reactionButton("hearts", "❤️", "Heart", reactions.hearts)}
        ${reactionButton("candles", "🕯️", "Candle", reactions.candles)}
        ${reactionButton("hugs", "🤗", "Hug", reactions.hugs)}
      </div>
      <div class="mt-4 flex items-center justify-between gap-3">
        <button type="button" data-share class="inline-flex min-h-11 items-center rounded-full bg-gold-500 px-3.5 py-2 text-xs font-bold text-gold-950 hover:bg-gold-400" aria-label="Share ${name}'s check-in">Share to Socials</button>
        <button type="button" data-flag class="inline-flex min-h-11 items-center text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline" aria-label="Report ${name}'s check-in">Report</button>
      </div>
    </div>
  </article>`;
}

export function renderFeedCards(checkins, limited) {
  if (!checkins.length) {
    return `<p class="col-span-full rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-600">No check-ins yet. Share a photo and a one-sentence kindness note from the trail.</p>`;
  }
  const cards = checkins.map(cardHtml).join("");
  if (!limited) return cards;
  return `${cards}<p class="col-span-full text-center text-sm text-slate-500">Showing the latest ${FEED_LIMIT} check-ins.</p>`;
}

export function renderFeedError(message) {
  return `<p class="col-span-full rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold leading-relaxed text-red-700">${esc(message)}</p>`;
}
