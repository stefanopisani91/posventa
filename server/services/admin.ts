/** Shop-side claim management: queue, detail, status changes and internal notes. */
import type {
  AdminClaimDetail,
  AdminClaimListResponse,
  ProductOption,
} from "../../shared/api-types.ts";
import { addDays, daysBetween, type IsoDate } from "../../shared/dates.ts";
import {
  CLOSED_STATUSES,
  canTransition,
  isClosed,
  nextStatuses,
  type Actor,
  type ClaimEventKind,
  type ClaimReason,
  type ClaimStatus,
  type ClaimType,
} from "../../shared/domain.ts";
import { computeEligibility, dueState } from "../../shared/eligibility.ts";
import type { claimListQuery, statusChangeInput } from "../../shared/schemas.ts";
import { SHOP_POLICY } from "../../shared/shop-policy.ts";
import type { z } from "zod";
import { shopToday } from "../clock.ts";
import { query, queryOne, toIsoTimestamp, withTransaction } from "../db.ts";
import { HttpError } from "../http.ts";

export const PAGE_SIZE = 25;
const OPEN_SQL = `c.status NOT IN (${CLOSED_STATUSES.map((s) => `'${s}'`).join(", ")})`;

type ListQuery = z.output<typeof claimListQuery>;

interface ListRow {
  id: number;
  code: string;
  type: ClaimType;
  status: ClaimStatus;
  reason: ClaimReason;
  product_id: number;
  product_name: string;
  order_number: string;
  full_name: string;
  opened_on: IsoDate;
  due_on: IsoDate;
  updated_at: Date;
  total: number;
}

export async function listClaims(filters: ListQuery): Promise<AdminClaimListResponse> {
  const today = shopToday();
  const dueSoonLimit = addDays(today, SHOP_POLICY.dueSoonDays);
  const where: string[] = [];
  const params: unknown[] = [];
  const param = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.status === "open") where.push(OPEN_SQL);
  else if (filters.status === "closed") where.push(`NOT (${OPEN_SQL})`);
  else if (filters.status) where.push(`c.status = ${param(filters.status)}`);
  if (filters.type) where.push(`c.type = ${param(filters.type)}`);
  if (filters.productId) where.push(`p.id = ${param(filters.productId)}`);
  if (filters.due === "overdue") where.push(`${OPEN_SQL} AND c.due_on < ${param(today)}`);
  if (filters.due === "due_soon") {
    where.push(`${OPEN_SQL} AND c.due_on BETWEEN ${param(today)} AND ${param(dueSoonLimit)}`);
  }
  if (filters.due === "on_track") where.push(`${OPEN_SQL} AND c.due_on > ${param(dueSoonLimit)}`);
  if (filters.due === "closed") where.push(`NOT (${OPEN_SQL})`);
  if (filters.q) {
    const like = param(`%${filters.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`);
    where.push(
      `(c.code ILIKE ${like} OR o.order_number ILIKE ${like} OR cu.full_name ILIKE ${like} OR cu.email ILIKE ${like})`,
    );
  }

  const orderBy = {
    due: `CASE WHEN ${OPEN_SQL} THEN 0 ELSE 1 END, CASE WHEN ${OPEN_SQL} THEN c.due_on END ASC, c.updated_at DESC`,
    newest: "c.created_at DESC",
    updated: "c.updated_at DESC",
  }[filters.sort];

  const rows = await query<ListRow>(
    `SELECT c.id, c.code, c.type, c.status, c.reason, p.id AS product_id, p.name AS product_name,
            o.order_number, cu.full_name, c.opened_on::text AS opened_on, c.due_on::text AS due_on,
            c.updated_at, count(*) OVER ()::int AS total
       FROM claims c
       JOIN order_items oi ON oi.id = c.order_item_id
       JOIN orders o ON o.id = oi.order_id
       JOIN customers cu ON cu.id = o.customer_id
       JOIN products p ON p.id = oi.product_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY ${orderBy}, c.id
      LIMIT ${PAGE_SIZE} OFFSET ${param((filters.page - 1) * PAGE_SIZE)}`,
    params,
  );

  const counts = await queryOne<{ open: number; overdue: number; due_soon: number }>(
    `SELECT count(*) FILTER (WHERE ${OPEN_SQL})::int AS open,
            count(*) FILTER (WHERE ${OPEN_SQL} AND c.due_on < $1)::int AS overdue,
            count(*) FILTER (WHERE ${OPEN_SQL} AND c.due_on BETWEEN $1 AND $2)::int AS due_soon
       FROM claims c`,
    [today, dueSoonLimit],
  );

  return {
    items: rows.map((r) => ({
      id: r.id,
      code: r.code,
      type: r.type,
      status: r.status,
      reason: r.reason,
      productId: r.product_id,
      productName: r.product_name,
      orderNumber: r.order_number,
      customerName: r.full_name,
      openedOn: r.opened_on,
      dueOn: r.due_on,
      dueState: dueState(r.status, r.due_on, today),
      daysToDue: daysBetween(today, r.due_on),
      updatedAt: toIsoTimestamp(r.updated_at),
    })),
    total: rows[0]?.total ?? 0,
    page: filters.page,
    pageSize: PAGE_SIZE,
    today,
    counts: { open: counts?.open ?? 0, overdue: counts?.overdue ?? 0, dueSoon: counts?.due_soon ?? 0 },
  };
}

export async function listProducts(): Promise<ProductOption[]> {
  return query<ProductOption>("SELECT id, name FROM products ORDER BY name");
}

export async function getClaimDetail(id: number): Promise<AdminClaimDetail> {
  const today = shopToday();
  const c = await queryOne<{
    id: number;
    code: string;
    type: ClaimType;
    status: ClaimStatus;
    reason: ClaimReason;
    description: string;
    opened_on: IsoDate;
    due_on: IsoDate;
    created_at: Date;
    updated_at: Date;
    closed_at: Date | null;
    order_number: string;
    placed_on: IsoDate;
    delivered_on: IsoDate | null;
    product_name: string;
    sku: string;
    serial_number: string | null;
    unit_price_cents: number;
    quantity: number;
    full_name: string;
    email: string;
    city: string;
  }>(
    `SELECT c.id, c.code, c.type, c.status, c.reason, c.description,
            c.opened_on::text AS opened_on, c.due_on::text AS due_on, c.created_at, c.updated_at, c.closed_at,
            o.order_number, o.placed_on::text AS placed_on, o.delivered_on::text AS delivered_on,
            p.name AS product_name, p.sku, oi.serial_number, oi.unit_price_cents, oi.quantity,
            cu.full_name, cu.email, cu.city
       FROM claims c
       JOIN order_items oi ON oi.id = c.order_item_id
       JOIN orders o ON o.id = oi.order_id
       JOIN customers cu ON cu.id = o.customer_id
       JOIN products p ON p.id = oi.product_id
      WHERE c.id = $1`,
    [id],
  );
  if (!c) throw new HttpError(404, "claim_not_found");

  const events = await query<{
    id: number;
    created_at: Date;
    kind: ClaimEventKind;
    actor: Actor;
    from_status: ClaimStatus | null;
    to_status: ClaimStatus | null;
    message: string | null;
    is_public: boolean;
  }>(
    `SELECT id, created_at, kind, actor, from_status, to_status, message, is_public
       FROM claim_events WHERE claim_id = $1 ORDER BY created_at, id`,
    [id],
  );

  return {
    id: c.id,
    code: c.code,
    type: c.type,
    status: c.status,
    reason: c.reason,
    description: c.description,
    openedOn: c.opened_on,
    dueOn: c.due_on,
    dueState: dueState(c.status, c.due_on, today),
    daysToDue: daysBetween(today, c.due_on),
    createdAt: toIsoTimestamp(c.created_at),
    updatedAt: toIsoTimestamp(c.updated_at),
    closedAt: c.closed_at ? toIsoTimestamp(c.closed_at) : null,
    nextStatuses: nextStatuses(c.type, c.status),
    order: { number: c.order_number, placedOn: c.placed_on, deliveredOn: c.delivered_on },
    item: {
      productName: c.product_name,
      sku: c.sku,
      serialNumber: c.serial_number,
      unitPriceCents: c.unit_price_cents,
      quantity: c.quantity,
    },
    customer: { name: c.full_name, email: c.email, city: c.city },
    legalAtOpening: computeEligibility(c.delivered_on, c.opened_on),
    events: events.map((e) => ({
      id: e.id,
      at: toIsoTimestamp(e.created_at),
      kind: e.kind,
      actor: e.actor,
      fromStatus: e.from_status,
      toStatus: e.to_status,
      message: e.message,
      isPublic: e.is_public,
    })),
    today,
  };
}

type StatusChange = z.output<typeof statusChangeInput>;

export async function changeStatus(id: number, change: StatusChange): Promise<AdminClaimDetail> {
  await withTransaction(async (client) => {
    const current = await queryOne<{ type: ClaimType; status: ClaimStatus }>(
      "SELECT type, status FROM claims WHERE id = $1 FOR UPDATE",
      [id],
      client,
    );
    if (!current) throw new HttpError(404, "claim_not_found");
    // Someone else changed it since the page was loaded.
    if (current.status !== change.from) {
      throw new HttpError(409, "status_conflict", `The claim is now "${current.status}"`, {
        current: current.status,
      });
    }
    if (!canTransition(current.type, current.status, change.to)) {
      throw new HttpError(422, "invalid_transition", `Cannot go from ${current.status} to ${change.to}`);
    }
    await client.query(
      `UPDATE claims SET status = $2, updated_at = now(),
              closed_at = CASE WHEN $3::boolean THEN now() ELSE NULL END
        WHERE id = $1`,
      [id, change.to, isClosed(change.to)],
    );
    await client.query(
      `INSERT INTO claim_events (claim_id, kind, actor, from_status, to_status, message, is_public)
       VALUES ($1, 'status_changed', 'staff', $2, $3, $4, TRUE)`,
      [id, current.status, change.to, change.message || null],
    );
  });
  return getClaimDetail(id);
}

export async function addInternalNote(id: number, text: string): Promise<AdminClaimDetail> {
  await withTransaction(async (client) => {
    const updated = await client.query("UPDATE claims SET updated_at = now() WHERE id = $1", [id]);
    if (!updated.rowCount) throw new HttpError(404, "claim_not_found");
    await client.query(
      `INSERT INTO claim_events (claim_id, kind, actor, message, is_public)
       VALUES ($1, 'internal_note', 'staff', $2, FALSE)`,
      [id, text],
    );
  });
  return getClaimDetail(id);
}
