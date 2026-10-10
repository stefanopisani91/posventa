import { getDatabase, type DatabaseConnection } from "@netlify/database";

/** The subset of pg / Neon clients we use; both drivers share this shape. */
export interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount?: number | null }>;
}
interface PoolClientLike extends Queryable {
  release(): void;
}
interface PoolLike extends Queryable {
  connect(): Promise<PoolClientLike>;
  end(): Promise<void>;
}

// One client per function instance, created on first use (not per request).
let connection: DatabaseConnection | undefined;

function pool(): PoolLike {
  connection ??= getDatabase();
  return connection.pool as unknown as PoolLike;
}

export async function query<T>(text: string, params: unknown[] = [], client?: Queryable): Promise<T[]> {
  const result = await (client ?? pool()).query(text, params);
  return result.rows as T[];
}

export async function queryOne<T>(text: string, params: unknown[] = [], client?: Queryable): Promise<T | undefined> {
  const rows = await query<T>(text, params, client);
  return rows[0];
}

export async function withTransaction<T>(fn: (client: Queryable) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Postgres unique-violation error code. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const e = error as { code?: string; constraint?: string };
  return e?.code === "23505" && (constraint === undefined || e.constraint === constraint);
}

/** Test helper: closes the pool so the next call reconnects (e.g. to a new database). */
export async function closeDb(): Promise<void> {
  if (connection) {
    await (connection.pool as unknown as PoolLike).end();
    connection = undefined;
  }
}

export function toIsoTimestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
