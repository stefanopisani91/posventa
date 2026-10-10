import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env.ts";
import { HttpError } from "./http.ts";

/**
 * Staff authentication: one shared shop account whose credentials come from
 * environment variables, and a stateless session cookie signed with HMAC-SHA256.
 */
const COOKIE_NAME = "pv_session";
const SESSION_SECONDS = 8 * 60 * 60;

interface SessionPayload {
  sub: string;
  exp: number;
}

function requireEnv(key: string): string {
  const value = env(key);
  if (!value) throw new HttpError(500, "server_misconfigured", `${key} is not set`);
  return value;
}

function sessionSecret(): string {
  const secret = requireEnv("SESSION_SECRET");
  if (secret.length < 32) throw new HttpError(500, "server_misconfigured", "SESSION_SECRET is too short");
  return secret;
}

function sign(data: string): string {
  return createHmac("sha256", sessionSecret()).update(data).digest("base64url");
}

/** Constant-time comparison of two strings of any length. */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function staffCredentials(): { email: string; password: string } {
  return {
    email: requireEnv("ADMIN_EMAIL").trim().toLowerCase(),
    password: requireEnv("ADMIN_PASSWORD"),
  };
}

export function credentialsMatch(email: string, password: string): boolean {
  const expected = staffCredentials();
  // Evaluate both comparisons to keep timing independent of which one fails.
  const emailOk = safeEqual(email.trim().toLowerCase(), expected.email);
  const passwordOk = safeEqual(password, expected.password);
  return emailOk && passwordOk;
}

export function createSessionToken(email: string, now = Date.now()): string {
  const payload: SessionPayload = { sub: email, exp: Math.floor(now / 1000) + SESSION_SECONDS };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifySessionToken(token: string, now = Date.now()): SessionPayload | null {
  const [data, signature] = token.split(".");
  if (!data || !signature || !safeEqual(signature, sign(data))) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

function cookieAttributes(req: Request): string {
  // `Secure` everywhere except plain-http local development.
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function sessionCookie(req: Request, token: string): string {
  return `${COOKIE_NAME}=${token}; Max-Age=${SESSION_SECONDS}; ${cookieAttributes(req)}`;
}

export function clearedSessionCookie(req: Request): string {
  return `${COOKIE_NAME}=; Max-Age=0; ${cookieAttributes(req)}`;
}

export function currentStaff(req: Request): SessionPayload | null {
  const token = readCookie(req, COOKIE_NAME);
  return token ? verifySessionToken(token) : null;
}

export function requireStaff(req: Request): SessionPayload {
  const session = currentStaff(req);
  if (!session) throw new HttpError(401, "unauthorized");
  return session;
}
