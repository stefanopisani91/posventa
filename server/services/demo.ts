import type { DemoInfoResponse, ShowcaseOrder } from "../../shared/api-types.ts";
import { daysBetween, type IsoDate } from "../../shared/dates.ts";
import { staffCredentials } from "../auth.ts";
import { shopToday } from "../clock.ts";
import { query, withTransaction, type Queryable } from "../db.ts";
import { isDemoMode } from "../env.ts";
import { HttpError } from "../http.ts";
import { generateSeedData } from "../seed/generate.ts";
import { writeSeedData } from "../seed/write.ts";

/** Demo data is regenerated when older than this, so example orders stay inside their legal windows. */
const STALE_AFTER_DAYS = 7;
/** Minimum time between two manual resets (protects the public reset button). */
const RESET_COOLDOWN_MS = 15_000;
const SEED_LOCK_KEY = 7_340_211;
const RECHECK_EVERY_MS = 5 * 60_000;

let lastCheckedAt = 0;

async function readMeta(key: string, client?: Queryable): Promise<{ value: string; updated_at: Date } | undefined> {
  const rows = await query<{ value: string; updated_at: Date }>(
    "SELECT value, updated_at FROM app_meta WHERE key = $1",
    [key],
    client,
  );
  return rows[0];
}

function isStale(seededOn: IsoDate | undefined, today: IsoDate): boolean {
  return seededOn === undefined || daysBetween(seededOn, today) >= STALE_AFTER_DAYS;
}

/**
 * In demo mode, makes sure there is (fresh) demo data. Cheap after the first
 * call in a warm function instance.
 */
export async function ensureDemoData(): Promise<void> {
  if (!isDemoMode() || Date.now() - lastCheckedAt < RECHECK_EVERY_MS) return;
  const today = shopToday();
  const meta = await readMeta("seeded_on");
  if (isStale(meta?.value, today)) {
    await withTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock($1)", [SEED_LOCK_KEY]);
      // Another instance may have seeded while we waited for the lock.
      const again = await readMeta("seeded_on", client);
      if (isStale(again?.value, today)) await writeSeedData(client, generateSeedData(today));
    });
  }
  lastCheckedAt = Date.now();
}

/** Restores the initial demo data (relative to today). */
export async function resetDemoData(): Promise<{ seededOn: IsoDate }> {
  if (!isDemoMode()) throw new HttpError(403, "demo_disabled");
  const today = shopToday();
  await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock($1)", [SEED_LOCK_KEY]);
    const last = await readMeta("last_reset", client);
    if (last && Date.now() - new Date(last.updated_at).getTime() < RESET_COOLDOWN_MS) {
      throw new HttpError(429, "reset_too_soon");
    }
    await writeSeedData(client, generateSeedData(today));
    await client.query(
      `INSERT INTO app_meta (key, value, updated_at) VALUES ('last_reset', $1, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [new Date().toISOString()],
    );
  });
  lastCheckedAt = Date.now();
  return { seededOn: today };
}

export async function getDemoInfo(): Promise<DemoInfoResponse> {
  if (!isDemoMode()) {
    return { demoMode: false, showcaseOrders: [], showcaseClaimCodes: [], seededOn: null };
  }
  await ensureDemoData();
  const [seeded, showcase] = await Promise.all([readMeta("seeded_on"), readMeta("showcase")]);
  const parsed = showcase
    ? (JSON.parse(showcase.value) as { orders: ShowcaseOrder[]; claimCodes: string[] })
    : { orders: [], claimCodes: [] };
  return {
    demoMode: true,
    credentials: staffCredentials(),
    showcaseOrders: parsed.orders,
    showcaseClaimCodes: parsed.claimCodes,
    seededOn: seeded?.value ?? null,
  };
}

/** Test helper: forget the cached "data is fresh" check. */
export function resetDemoCheckCache(): void {
  lastCheckedAt = 0;
}
