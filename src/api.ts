import type { ApiErrorBody, ApiErrorCode } from "../shared/api-types.ts";

export type ClientErrorCode = ApiErrorCode | "network" | "too_many_requests" | "generic";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ClientErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ClientErrorCode, details?: unknown) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Field paths reported by server-side validation, e.g. ["email"]. */
  get fields(): string[] {
    return Array.isArray(this.details)
      ? this.details.map((d: { path?: string }) => d.path ?? "").filter(Boolean)
      : [];
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? { accept: "application/json" } : { "content-type": "application/json", accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network");
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // e.g. an HTML error page from a proxy
  }
  if (!res.ok) {
    const error = (data as ApiErrorBody | null)?.error;
    const code: ClientErrorCode = error?.code ?? (res.status === 429 ? "too_many_requests" : "generic");
    throw new ApiError(res.status, code, error?.details);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown = {}) => request<T>("POST", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
