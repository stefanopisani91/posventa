import type { z } from "zod";
import type { ApiErrorCode } from "../shared/api-types.ts";

export class HttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ApiErrorCode, message?: string, details?: unknown) {
    super(message ?? code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

const MAX_BODY_BYTES = 16_384;

/**
 * Parses and validates a JSON body. Mutating requests must be JSON: browsers
 * cannot send a cross-site JSON POST without a CORS preflight, which together
 * with the SameSite session cookie protects the staff endpoints from CSRF.
 */
export async function readJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "unsupported_media_type");
  }
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "payload_too_large");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new HttpError(400, "validation_error", "Body is not valid JSON");
  }
  return parseInput(schema, body);
}

export function parseInput<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    throw new HttpError(400, "validation_error", "Invalid input", fields);
  }
  return result.data;
}

/** Rejects cross-origin browser requests to mutating endpoints. */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients (curl, tests) do not send Origin
  if (origin !== new URL(req.url).origin) throw new HttpError(403, "forbidden_origin");
}

type Handler = (req: Request, params: Record<string, string>) => Promise<Response>;
type Routes = Partial<Record<"GET" | "POST" | "PATCH" | "DELETE", Handler>>;

/**
 * Wraps route handlers: method dispatch, origin check for writes and a single
 * error format `{ error: { code, message, details } }`.
 */
export function route(routes: Routes) {
  return async (req: Request, context?: { params?: Record<string, string> }): Promise<Response> => {
    const handler = routes[req.method as keyof Routes];
    if (!handler) {
      return json({ error: { code: "method_not_allowed" } }, 405, {
        allow: Object.keys(routes).join(", "),
      });
    }
    try {
      if (req.method !== "GET") assertSameOrigin(req);
      return await handler(req, context?.params ?? {});
    } catch (error) {
      if (error instanceof HttpError) {
        return json(
          { error: { code: error.code, message: error.message, details: error.details } },
          error.status,
        );
      }
      console.error("Unhandled error", error);
      return json({ error: { code: "internal_error" } }, 500);
    }
  };
}
