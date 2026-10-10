import { NetlifyDB } from "@netlify/database-dev";
import { closeDb } from "../server/db.ts";
import { resetDemoCheckCache } from "../server/services/demo.ts";

export const TEST_ADMIN = { email: "tienda@posventa.test", password: "correct horse battery" };
const BASE = "http://localhost:8888";

/** Starts an embedded Postgres-compatible database with the real migrations applied. */
export async function startTestDatabase(): Promise<NetlifyDB> {
  const db = new NetlifyDB({ logger: () => undefined });
  const connectionString = await db.start();
  await db.applyMigrations("./netlify/database/migrations");
  process.env.NETLIFY_DB_URL = connectionString;
  process.env.DEMO_MODE = "true";
  process.env.ADMIN_EMAIL = TEST_ADMIN.email;
  process.env.ADMIN_PASSWORD = TEST_ADMIN.password;
  process.env.SESSION_SECRET = "test-secret-that-is-at-least-32-characters-long";
  resetDemoCheckCache();
  return db;
}

export async function stopTestDatabase(db: NetlifyDB): Promise<void> {
  await closeDb();
  await db.stop();
}

type Fn = (req: Request, context?: { params?: Record<string, string> }) => Promise<Response>;

interface CallOptions {
  body?: unknown;
  params?: Record<string, string>;
  cookie?: string;
  headers?: Record<string, string>;
}

/** Invokes a Netlify Function handler the way the platform would. */
export async function call<T = unknown>(
  fn: Fn,
  method: string,
  path: string,
  options: CallOptions = {},
): Promise<{ status: number; body: T; headers: Headers }> {
  const headers: Record<string, string> = { ...options.headers };
  if (options.body !== undefined) headers["content-type"] ??= "application/json";
  if (options.cookie) headers.cookie = options.cookie;
  const req = new Request(`${BASE}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : typeof options.body === "string" ? options.body : JSON.stringify(options.body),
  });
  const res = await fn(req, { params: options.params ?? {} });
  const text = await res.text();
  return { status: res.status, body: (text ? JSON.parse(text) : null) as T, headers: res.headers };
}

/** Extracts "name=value" from a Set-Cookie header. */
export function cookieFrom(headers: Headers): string {
  const setCookie = headers.get("set-cookie") ?? "";
  return setCookie.split(";")[0] ?? "";
}
