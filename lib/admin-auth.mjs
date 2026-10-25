import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "hch_admin";
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map();

export function secretsMatch(provided, expected) {
  const left = createHash("sha256").update(String(provided)).digest();
  const right = createHash("sha256").update(String(expected)).digest();
  return timingSafeEqual(left, right);
}

function sessionToken(secret) {
  return createHmac("sha256", secret).update("hch-tributes-admin-v1").digest("base64url");
}

export function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  const prefix = `${name}=`;
  const found = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!found) return "";
  try {
    return decodeURIComponent(found.slice(prefix.length));
  } catch {
    return "";
  }
}

export function isAuthed(request) {
  const secret = process.env.ADMIN_SECRET_KEY || "";
  if (!secret) return false;
  return secretsMatch(readCookie(request, COOKIE), sessionToken(secret));
}

function cookie(value, request, maxAge) {
  const forwarded = request.headers.get("x-forwarded-proto") || "";
  const secure = forwarded.split(",")[0].trim() === "https";
  const parts = [
    `${COOKIE}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/admin",
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function sessionCookie(request) {
  return cookie(sessionToken(process.env.ADMIN_SECRET_KEY || ""), request, 60 * 60 * 12);
}

export function clearSessionCookie(request) {
  return cookie("", request, 0);
}

export function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const first = forwarded.split(",")[0].trim();
  return first || request.headers.get("x-real-ip") || "local";
}

export function loginAllowed(ip) {
  const entry = attempts.get(ip);
  if (!entry || entry.reset < Date.now()) return true;
  return entry.count < MAX_ATTEMPTS;
}

export function recordFailure(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.reset < now) {
    attempts.set(ip, { count: 1, reset: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
}

export function clearFailures(ip) {
  attempts.delete(ip);
}
