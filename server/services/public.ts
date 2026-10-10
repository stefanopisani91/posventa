/** What customers can do without an account: look up an order, open a claim, track it. */
import { randomInt } from "node:crypto";
import type {
  ClaimSummary,
  CreateClaimResponse,
  OrderLookupResponse,
  TrackingResponse,
} from "../../shared/api-types.ts";
import type { IsoDate } from "../../shared/dates.ts";
import {
  CLAIM_CODE_ALPHABET,
  isClosed,
  type ClaimEventKind,
  type ClaimReason,
  type ClaimStatus,
  type ClaimType,
  type ProductCategory,
} from "../../shared/domain.ts";
import { claimDueDate, computeEligibility } from "../../shared/eligibility.ts";
import type { createClaimInput } from "../../shared/schemas.ts";
import type { z } from "zod";
import { shopToday } from "../clock.ts";
import { isUniqueViolation, query, queryOne, toIsoTimestamp, withTransaction } from "../db.ts";
import { HttpError } from "../http.ts";

interface OrderRow {
  id: number;
  order_number: string;
  placed_on: IsoDate;
  delivered_on: IsoDate | null;
  full_name: string;
}

interface ItemRow {
  id: number;
  quantity: number;
  unit_price_cents: number;
  name: string;
  category: ProductCategory;
}

interface ClaimRow {
  order_item_id: number;
  code: string;
  type: ClaimType;
  status: ClaimStatus;
  opened_on: IsoDate;
}

async function findOrder(orderNumber: string, email: string): Promise<OrderRow> {
  // Same error for "no such order" and "wrong e-mail" so order numbers cannot be probed.
  const order = await queryOne<OrderRow>(
    `SELECT o.id, o.order_number, o.placed_on::text AS placed_on, o.delivered_on::text AS delivered_on, c.full_name
       FROM orders o JOIN customers c ON c.id = o.customer_id
      WHERE o.order_number = $1 AND lower(c.email) = $2`,
    [orderNumber, email],
  );
  if (!order) throw new HttpError(404, "order_not_found");
  return order;
}

/** A line is "returned" once a withdrawal on it has been refunded. */
function isReturned(claims: ClaimSummary[]): boolean {
  return claims.some((c) => c.type === "withdrawal" && c.status === "refunded");
}

export async function lookupOrder(orderNumber: string, email: string): Promise<OrderLookupResponse> {
  const order = await findOrder(orderNumber, email);
  const today = shopToday();
  const items = await query<ItemRow>(
    `SELECT oi.id, oi.quantity, oi.unit_price_cents, p.name, p.category
       FROM order_items oi JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = $1 ORDER BY oi.id`,
    [order.id],
  );
  const claims = await query<ClaimRow>(
    `SELECT order_item_id, code, type, status, opened_on::text AS opened_on
       FROM claims WHERE order_item_id = ANY($1::int[]) ORDER BY created_at DESC`,
    [items.map((i) => i.id)],
  );

  return {
    orderNumber: order.order_number,
    placedOn: order.placed_on,
    deliveredOn: order.delivered_on,
    customerFirstName: order.full_name.split(" ")[0] ?? "",
    today,
    items: items.map((item) => {
      const itemClaims: ClaimSummary[] = claims
        .filter((c) => c.order_item_id === item.id)
        .map((c) => ({ code: c.code, type: c.type, status: c.status, openedOn: c.opened_on }));
      const eligibility = computeEligibility(order.delivered_on, today);
      if (isReturned(itemClaims)) {
        eligibility.withdrawal.available = false;
        eligibility.warranty.available = false;
      }
      return {
        id: item.id,
        productName: item.name,
        category: item.category,
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
        eligibility,
        claims: itemClaims,
        hasOpenClaim: itemClaims.some((c) => !isClosed(c.status)),
      };
    }),
  };
}

export function generateClaimCode(): string {
  const part = () =>
    Array.from({ length: 4 }, () => CLAIM_CODE_ALPHABET[randomInt(CLAIM_CODE_ALPHABET.length)]).join("");
  return `PV-${part()}-${part()}`;
}

type CreateClaim = z.output<typeof createClaimInput>;

export async function createClaim(input: CreateClaim): Promise<CreateClaimResponse> {
  const order = await findOrder(input.orderNumber, input.email);
  const item = await queryOne<{ id: number }>(
    "SELECT id FROM order_items WHERE id = $1 AND order_id = $2",
    [input.orderItemId, order.id],
  );
  if (!item) throw new HttpError(404, "item_not_found");

  const today = shopToday();
  const eligibility = computeEligibility(order.delivered_on, today);
  const window = input.type === "withdrawal" ? eligibility.withdrawal : eligibility.warranty;
  if (!window.available) {
    throw new HttpError(422, "not_eligible", `The ${input.type} period is not open for this item`);
  }
  const previous = await query<{ type: ClaimType; status: ClaimStatus }>(
    "SELECT type, status FROM claims WHERE order_item_id = $1",
    [item.id],
  );
  if (previous.some((c) => c.type === "withdrawal" && c.status === "refunded")) {
    throw new HttpError(422, "not_eligible", "This item has already been returned and refunded");
  }
  if (previous.some((c) => !isClosed(c.status))) throw new HttpError(409, "claim_already_open");

  const dueOn = claimDueDate(input.type, today);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateClaimCode();
    try {
      await withTransaction(async (client) => {
        const inserted = await queryOne<{ id: number }>(
          `INSERT INTO claims (code, order_item_id, type, reason, description, status, opened_on, due_on)
           VALUES ($1, $2, $3, $4, $5, 'received', $6, $7) RETURNING id`,
          [code, item.id, input.type, input.reason, input.description, today, dueOn],
          client,
        );
        await client.query(
          `INSERT INTO claim_events (claim_id, kind, actor, to_status, is_public)
           VALUES ($1, 'created', 'customer', 'received', TRUE)`,
          [inserted?.id],
        );
      });
      return { code, type: input.type, status: "received", dueOn };
    } catch (error) {
      if (isUniqueViolation(error, "claims_one_open_per_item")) throw new HttpError(409, "claim_already_open");
      if (isUniqueViolation(error, "claims_code_key")) continue; // astronomically rare: retry with a new code
      throw error;
    }
  }
  throw new HttpError(500, "internal_error", "Could not generate a unique claim code");
}

export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 2)}•••@${domain}`;
}

export async function trackClaim(code: string): Promise<TrackingResponse> {
  const claim = await queryOne<{
    id: number;
    code: string;
    type: ClaimType;
    status: ClaimStatus;
    reason: ClaimReason;
    opened_on: IsoDate;
    product_name: string;
    order_number: string;
    email: string;
  }>(
    `SELECT c.id, c.code, c.type, c.status, c.reason, c.opened_on::text AS opened_on,
            p.name AS product_name, o.order_number, cu.email
       FROM claims c
       JOIN order_items oi ON oi.id = c.order_item_id
       JOIN orders o ON o.id = oi.order_id
       JOIN customers cu ON cu.id = o.customer_id
       JOIN products p ON p.id = oi.product_id
      WHERE c.code = $1`,
    [code],
  );
  if (!claim) throw new HttpError(404, "claim_not_found");

  // Internal notes are never sent to the customer.
  const events = await query<{ created_at: Date; kind: ClaimEventKind; to_status: ClaimStatus | null; message: string | null }>(
    `SELECT created_at, kind, to_status, message FROM claim_events
      WHERE claim_id = $1 AND is_public ORDER BY created_at, id`,
    [claim.id],
  );

  return {
    code: claim.code,
    type: claim.type,
    status: claim.status,
    reason: claim.reason,
    productName: claim.product_name,
    orderNumber: claim.order_number,
    openedOn: claim.opened_on,
    maskedEmail: maskEmail(claim.email),
    closed: isClosed(claim.status),
    events: events.map((e) => ({
      at: toIsoTimestamp(e.created_at),
      kind: e.kind,
      toStatus: e.to_status,
      message: e.message,
    })),
  };
}
