import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "cal_session";
export const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
export const USER_IDS = ["gautham", "wife"];

export function passwordsMatch(expected, provided) {
  if (typeof expected !== "string" || typeof provided !== "string") return false;
  if (!expected || !provided) return false;
  const left = createHash("sha256").update(expected).digest();
  const right = createHash("sha256").update(provided).digest();
  return timingSafeEqual(left, right);
}

export function matchUser(users, provided) {
  let matched = null;
  for (const user of users) {
    if (passwordsMatch(user.password, provided)) matched = user;
  }
  return matched;
}

export function signSession(secret, userId, expiresAt) {
  const payload = `${userId}.${expiresAt}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifySession(secret, token, now = Date.now()) {
  if (typeof secret !== "string" || typeof token !== "string") {
    return { ok: false };
  }
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false };
  const [userId, expiresRaw, signature] = parts;
  if (!USER_IDS.includes(userId)) return { ok: false };
  const payload = `${userId}.${expiresRaw}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return { ok: false };
  if (!timingSafeEqual(left, right)) return { ok: false };
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return { ok: false };
  return { ok: true, userId };
}

export function parseSessionCookie(header) {
  if (typeof header !== "string" || !header) return "";
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === SESSION_COOKIE) {
      return trimmed.slice(eq + 1);
    }
  }
  return "";
}

export function sessionCookieHeader(token, secure) {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.floor(SESSION_MS / 1000)}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookieHeader(secure) {
  const parts = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}
