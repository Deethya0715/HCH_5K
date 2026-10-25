import { randomBytes } from "node:crypto";
import { ensureTributesTable, getPool } from "./db.mjs";

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PHOTO_TOKEN = /^[A-Za-z0-9_-]{32}$/;

const RIBBON_INPUT = {
  treatment: "gold",
  gold: "gold",
  survivor: "teal",
  teal: "teal",
  memory: "white",
  white: "white",
  dove: "white",
};

const RELATIONSHIPS = new Set([
  "Parent or guardian",
  "Sibling",
  "Family",
  "Friend",
  "This is me",
  "Sponsor",
  "Other",
]);

export const RIBBON_LABELS = {
  gold: "In Treatment (gold)",
  teal: "Survivor (teal)",
  white: "In Loving Memory (white dove)",
};

export const SIGN_LABELS = {
  family: "Patient family free",
  sponsor: "Corporate sponsored",
};

export const RETURN_LABELS = {
  pickup: "Pickup at the Pavilion after 3:30 PM",
  mail: "Mail the sign",
};

const COLUMNS = `
  id,
  created_at,
  "timestamp",
  contact_email,
  hero_name,
  ribbon_color,
  message,
  sign_type,
  submitter_name,
  phone,
  relationship,
  photo_url,
  photo_filename,
  qr_link,
  caring_bridge_url,
  treatment_date,
  milestone,
  sponsor_name,
  return_method,
  mail_address
`;

function field(value, max) {
  const text = String(value ?? "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (text.length > max) return { tooLong: true, value: "" };
  return { tooLong: false, value: text };
}

function wordCount(value) {
  if (!value) return 0;
  return value.split(/\s+/).length;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUrl(value) {
  return /^https?:\/\/\S+$/i.test(value);
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

function safePhotoName(name, contentType) {
  const ext = contentType === "image/png" ? ".png" : ".jpg";
  const base = String(name || "")
    .split(/[/\\]/)
    .pop()
    .replace(/\.(png|jpe?g)$/i, "")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 80);
  if (!base) return `hero-photo${ext}`;
  return `${base}${ext}`;
}

export function photoPath(token) {
  return `/api/tributes/photos/${token}`;
}

export async function readHeroPhoto(file) {
  if (!file || typeof file.arrayBuffer !== "function" || typeof file.size !== "number") {
    return { error: "Attach a photo of your hero." };
  }
  if (!file.size) return { error: "Attach a photo of your hero." };
  if (file.size > MAX_PHOTO_BYTES) return { error: "Use a photo smaller than 4 MB." };

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.length) return { error: "Attach a photo of your hero." };
  if (bytes.length > MAX_PHOTO_BYTES) return { error: "Use a photo smaller than 4 MB." };

  const contentType = sniffImage(bytes);
  if (!contentType) return { error: "Use a PNG, JPG, or JPEG photo." };

  return {
    data: {
      bytes,
      contentType,
      filename: safePhotoName(file.name, contentType),
    },
  };
}

function photoToken() {
  return randomBytes(24).toString("base64url");
}

export function validateTribute(input) {
  const source = input && typeof input === "object" ? input : {};
  const submitterName = field(source.submitterName, 80);
  const contactEmail = field(source.contactEmail, 120);
  const phone = field(source.phone, 30);
  const relationship = field(source.relationship, 40);
  const heroName = field(source.heroName, 40);
  const message = field(source.message, 280);
  const ribbon = field(source.ribbon, 20);
  const signType = field(source.signType, 20);
  const qrLink = field(source.qrLink || source.caringBridge, 300);
  const treatmentDate = field(source.treatmentDate, 40);
  const milestone = field(source.milestone, 80);
  const sponsorName = field(source.sponsorName, 80);
  const returnMethod = field(source.returnMethod, 20);
  const mailAddress = field(source.mailAddress, 200);

  const limited = [
    submitterName,
    contactEmail,
    phone,
    relationship,
    heroName,
    message,
    ribbon,
    signType,
    qrLink,
    treatmentDate,
    milestone,
    sponsorName,
    returnMethod,
    mailAddress,
  ];
  if (limited.some((item) => item.tooLong)) {
    return { error: "One of the fields is too long." };
  }

  if (!submitterName.value) return { error: "Enter your name." };
  const email = contactEmail.value.toLowerCase();
  if (!isEmail(email)) return { error: "Enter a valid email so we can confirm the sign." };

  const digits = phone.value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return { error: "Enter a phone number for the trail marker text." };
  }
  if (!RELATIONSHIPS.has(relationship.value)) {
    return { error: "Choose how you know this hero." };
  }
  if (!heroName.value) return { error: "Enter your hero's first name." };

  const words = wordCount(message.value);
  if (!words) return { error: "Write a short message for the sign." };
  if (words > 25) return { error: "Keep the message to 25 words so it fits the sign." };

  const ribbonColor = RIBBON_INPUT[ribbon.value];
  if (!ribbonColor) return { error: "Choose a ribbon." };
  if (signType.value !== "family" && signType.value !== "sponsor") {
    return { error: "Choose a dedication type." };
  }
  if (qrLink.value && !isUrl(qrLink.value)) {
    return { error: "Use a full link starting with https:// for the QR code, or leave it blank." };
  }
  if (signType.value === "sponsor" && !sponsorName.value) {
    return { error: "Enter the sponsor or business name for the logo line." };
  }
  if (returnMethod.value !== "pickup" && returnMethod.value !== "mail") {
    return { error: "Choose how the sign should come home." };
  }
  if (returnMethod.value === "mail" && mailAddress.value.length < 8) {
    return { error: "Enter the mailing address for the sign." };
  }

  const survivor = ribbonColor === "teal";
  return {
    data: {
      contactEmail: email,
      heroName: heroName.value,
      ribbonColor,
      message: message.value,
      signType: signType.value,
      submitterName: submitterName.value,
      phone: phone.value,
      relationship: relationship.value,
      qrLink: qrLink.value || null,
      treatmentDate: survivor ? treatmentDate.value || null : null,
      milestone: survivor ? milestone.value || null : null,
      sponsorName: signType.value === "sponsor" ? sponsorName.value : null,
      returnMethod: returnMethod.value,
      mailAddress: returnMethod.value === "mail" ? mailAddress.value : null,
    },
  };
}

function assertPhoto(photo) {
  if (!photo?.bytes?.length) return false;
  if (photo.bytes.length > MAX_PHOTO_BYTES) return false;
  if (photo.contentType !== "image/png" && photo.contentType !== "image/jpeg") return false;
  if (sniffImage(photo.bytes) !== photo.contentType) return false;
  return true;
}

export async function insertTribute(data) {
  if (!assertPhoto(data.photo)) {
    const error = new Error("Attach a photo of your hero.");
    error.code = "PHOTO_REQUIRED";
    throw error;
  }

  await ensureTributesTable();
  const pool = getPool();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = photoToken();
    try {
      const result = await pool.query(
        `INSERT INTO tributes (
          created_at,
          contact_email,
          hero_name,
          ribbon_color,
          message,
          sign_type,
          submitter_name,
          phone,
          relationship,
          photo_url,
          qr_link,
          caring_bridge_url,
          treatment_date,
          milestone,
          sponsor_name,
          return_method,
          mail_address,
          photo_token,
          photo_bytes,
          photo_content_type,
          photo_filename
        ) VALUES (
          NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        )
        RETURNING id, created_at`,
        [
          data.contactEmail,
          data.heroName,
          data.ribbonColor,
          data.message,
          data.signType,
          data.submitterName,
          data.phone,
          data.relationship,
          photoPath(token),
          data.qrLink,
          data.qrLink,
          data.treatmentDate,
          data.milestone,
          data.sponsorName,
          data.returnMethod,
          data.mailAddress,
          token,
          data.photo.bytes,
          data.photo.contentType,
          data.photo.filename,
        ]
      );
      return result.rows[0];
    } catch (error) {
      if (error && error.code === "23505" && attempt === 0) continue;
      throw error;
    }
  }
  const error = new Error("Could not store the hero photo.");
  error.code = "PHOTO_REQUIRED";
  throw error;
}

export async function getTributePhoto(token) {
  if (!PHOTO_TOKEN.test(String(token || ""))) return null;
  await ensureTributesTable();
  const result = await getPool().query(
    `SELECT photo_bytes, photo_content_type, photo_filename
     FROM tributes
     WHERE photo_token = $1
       AND photo_bytes IS NOT NULL`,
    [token]
  );
  const row = result.rows[0];
  if (!row?.photo_bytes?.length) return null;
  if (row.photo_content_type !== "image/png" && row.photo_content_type !== "image/jpeg") return null;
  return {
    bytes: row.photo_bytes,
    contentType: row.photo_content_type,
    filename: safePhotoName(row.photo_filename, row.photo_content_type),
  };
}

export function qrLinkOf(row) {
  const link = row?.qr_link || row?.caring_bridge_url || "";
  return link ? String(link) : "";
}

export async function getTributeById(id) {
  const key = String(id ?? "");
  if (!/^[1-9]\d{0,17}$/.test(key)) return null;
  await ensureTributesTable();
  const result = await getPool().query(
    `SELECT ${COLUMNS}, photo_bytes, photo_content_type
     FROM tributes
     WHERE id = $1`,
    [key]
  );
  return result.rows[0] || null;
}

export async function listTributes() {
  await ensureTributesTable();
  const result = await getPool().query(
    `SELECT ${COLUMNS}
     FROM tributes
     ORDER BY created_at DESC, id DESC`
  );
  return result.rows;
}

export function ribbonLabel(value) {
  return RIBBON_LABELS[value] || value || "";
}

export function signLabel(value) {
  return SIGN_LABELS[value] || value || "";
}

export function returnLabel(value) {
  return RETURN_LABELS[value] || value || "";
}

export function formatTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")} CT`;
}

function csvCell(value) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function requestOrigin(request) {
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .split(",")[0]
    .trim();
  if (!/^[A-Za-z0-9.\-:[\]]+$/.test(host)) return "";
  const forwarded = (request.headers.get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase();
  let proto = forwarded === "http" || forwarded === "https" ? forwarded : "";
  if (!proto) proto = /^(localhost|127\.0\.0\.1)(:|$)/i.test(host) ? "http" : "https";
  return `${proto}://${host}`;
}

export function exportPhotoUrl(photoUrl, origin) {
  const url = photoUrl == null ? "" : String(photoUrl);
  if (/^\/api\/tributes\/photos\/[A-Za-z0-9_-]{32}$/.test(url) && origin) return `${origin}${url}`;
  return url;
}

export function tributesToCsv(rows, origin = "") {
  const headers = [
    "ID",
    "Submitted (Central)",
    "Contact email",
    "Hero name",
    "Ribbon",
    "Message",
    "Sign type",
    "Submitted by",
    "Phone",
    "Relationship",
    "Photo link",
    "Photo file",
    "QR link",
    "Last treatment date",
    "Milestone",
    "Sponsor or business",
    "After the race",
    "Mailing address",
  ];
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.id,
        formatTimestamp(row.created_at || row.timestamp),
        row.contact_email,
        row.hero_name,
        ribbonLabel(row.ribbon_color),
        row.message,
        signLabel(row.sign_type),
        row.submitter_name,
        row.phone,
        row.relationship,
        exportPhotoUrl(row.photo_url, origin),
        row.photo_filename,
        qrLinkOf(row),
        row.treatment_date,
        row.milestone,
        row.sponsor_name,
        returnLabel(row.return_method),
        row.mail_address,
      ]
        .map(csvCell)
        .join(",")
    );
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function csvFilename() {
  const stamp = formatTimestamp(new Date()).slice(0, 10) || "tributes";
  return `tributes-${stamp}.csv`;
}
