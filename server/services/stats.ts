/** Numbers for the shop owner: return rate, reasons, time to close, problem products. */
import type { StatsPeriod, StatsResponse } from "../../shared/api-types.ts";
import { addDays, type IsoDate } from "../../shared/dates.ts";
import { CLOSED_STATUSES, type ClaimReason, type ClaimStatus, type ClaimType } from "../../shared/domain.ts";
import { shopToday } from "../clock.ts";
import { query, queryOne } from "../db.ts";

const OPEN_SQL = `status NOT IN (${CLOSED_STATUSES.map((s) => `'${s}'`).join(", ")})`;

function periodStart(period: StatsPeriod, today: IsoDate): IsoDate | null {
  if (period === "90d") return addDays(today, -90);
  if (period === "12m") return addDays(today, -365);
  return null;
}

const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

export async function computeStats(period: StatsPeriod): Promise<StatsResponse> {
  const today = shopToday();
  const since = periodStart(period, today);

  const delivered = await queryOne<{ orders: number; units: number }>(
    `SELECT count(DISTINCT o.id)::int AS orders, coalesce(sum(oi.quantity), 0)::int AS units
       FROM orders o JOIN order_items oi ON oi.order_id = o.id
      WHERE o.delivered_on IS NOT NULL AND ($1::date IS NULL OR o.delivered_on >= $1::date)`,
    [since],
  );

  // Claims opened in the period, with the order they belong to.
  const claimScope = `FROM claims c JOIN order_items oi ON oi.id = c.order_item_id
                      WHERE ($1::date IS NULL OR c.opened_on >= $1::date)`;

  const totals = await queryOne<{ total: number; withdrawal: number; warranty: number }>(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE c.type = 'withdrawal')::int AS withdrawal,
            count(*) FILTER (WHERE c.type = 'warranty')::int AS warranty
       ${claimScope}`,
    [since],
  );

  // Cohort rates: of the orders delivered in the period, how many had a claim.
  const cohort = await queryOne<{ withdrawal_orders: number; warranty_orders: number }>(
    `SELECT count(DISTINCT o.id) FILTER (WHERE c.type = 'withdrawal')::int AS withdrawal_orders,
            count(DISTINCT o.id) FILTER (WHERE c.type = 'warranty')::int AS warranty_orders
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN claims c ON c.order_item_id = oi.id
      WHERE o.delivered_on IS NOT NULL AND ($1::date IS NULL OR o.delivered_on >= $1::date)`,
    [since],
  );

  // Current workload, independent of the period.
  const workload = await queryOne<{ open: number; overdue: number }>(
    `SELECT count(*) FILTER (WHERE ${OPEN_SQL})::int AS open,
            count(*) FILTER (WHERE ${OPEN_SQL} AND due_on < $1)::int AS overdue
       FROM claims`,
    [today],
  );

  const closing = await queryOne<{ all_days: number | null; withdrawal_days: number | null; warranty_days: number | null; closed: number }>(
    `SELECT avg(extract(epoch FROM closed_at - created_at) / 86400)::float AS all_days,
            avg(extract(epoch FROM closed_at - created_at) / 86400) FILTER (WHERE type = 'withdrawal')::float AS withdrawal_days,
            avg(extract(epoch FROM closed_at - created_at) / 86400) FILTER (WHERE type = 'warranty')::float AS warranty_days,
            count(*)::int AS closed
       FROM claims
      WHERE closed_at IS NOT NULL AND ($1::date IS NULL OR closed_at >= $1::date)`,
    [since],
  );

  const byStatus = await query<{ status: ClaimStatus; count: number }>(
    `SELECT c.status, count(*)::int AS count ${claimScope} GROUP BY c.status`,
    [since],
  );

  const topReasons = await query<{ reason: ClaimReason; type: ClaimType; count: number }>(
    `SELECT c.reason, c.type, count(*)::int AS count ${claimScope}
      GROUP BY c.reason, c.type ORDER BY count DESC, c.reason LIMIT 8`,
    [since],
  );

  // Same cohort for products: units delivered in the period and the claims on those units.
  const products = await query<{ product_id: number; product_name: string; claims: number; units: number }>(
    `WITH cohort AS (
       SELECT oi.id, oi.product_id, oi.quantity
         FROM order_items oi JOIN orders o ON o.id = oi.order_id
        WHERE o.delivered_on IS NOT NULL AND ($1::date IS NULL OR o.delivered_on >= $1::date)
     ), sold AS (
       SELECT product_id, sum(quantity)::int AS units FROM cohort GROUP BY product_id
     ), claimed AS (
       SELECT cohort.product_id, count(*)::int AS claims
         FROM claims c JOIN cohort ON cohort.id = c.order_item_id
        GROUP BY cohort.product_id
     )
     SELECT p.id AS product_id, p.name AS product_name, claimed.claims, sold.units
       FROM claimed
       JOIN sold ON sold.product_id = claimed.product_id
       JOIN products p ON p.id = claimed.product_id
      ORDER BY claimed.claims DESC, claimed.claims::float / sold.units DESC, p.name
      LIMIT 8`,
    [since],
  );

  const monthlyRows = await query<{ month: string; type: ClaimType; count: number }>(
    `SELECT to_char(date_trunc('month', opened_on), 'YYYY-MM') AS month, type, count(*)::int AS count
       FROM claims WHERE opened_on >= date_trunc('month', $1::date) - interval '11 months'
      GROUP BY 1, 2`,
    [today],
  );
  const months: string[] = [];
  const [year, month] = today.split("-").map(Number) as [number, number];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  const monthly = months.map((m) => ({
    month: m,
    withdrawal: monthlyRows.find((r) => r.month === m && r.type === "withdrawal")?.count ?? 0,
    warranty: monthlyRows.find((r) => r.month === m && r.type === "warranty")?.count ?? 0,
  }));

  const deliveredOrders = delivered?.orders ?? 0;
  const ratio = (n: number, d: number) => (d > 0 ? n / d : 0);

  return {
    period,
    today,
    deliveredOrders,
    unitsDelivered: delivered?.units ?? 0,
    claims: {
      total: totals?.total ?? 0,
      withdrawal: totals?.withdrawal ?? 0,
      warranty: totals?.warranty ?? 0,
      open: workload?.open ?? 0,
      overdue: workload?.overdue ?? 0,
    },
    returnRate: ratio(cohort?.withdrawal_orders ?? 0, deliveredOrders),
    warrantyClaimRate: ratio(cohort?.warranty_orders ?? 0, deliveredOrders),
    avgCloseDays: {
      all: round1(closing?.all_days ?? null),
      withdrawal: round1(closing?.withdrawal_days ?? null),
      warranty: round1(closing?.warranty_days ?? null),
    },
    closedCount: closing?.closed ?? 0,
    byStatus,
    topReasons,
    products: products.map((p) => ({
      productId: p.product_id,
      productName: p.product_name,
      claims: p.claims,
      units: p.units,
      rate: ratio(p.claims, p.units),
    })),
    monthly,
  };
}
