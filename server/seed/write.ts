import type { Queryable } from "../db.ts";
import type { SeedData } from "./generate.ts";

const CHUNK_ROWS = 200;

async function insertRows(client: Queryable, table: string, columns: string[], rows: unknown[][]): Promise<void> {
  for (let start = 0; start < rows.length; start += CHUNK_ROWS) {
    const chunk = rows.slice(start, start + CHUNK_ROWS);
    const params: unknown[] = [];
    const tuples = chunk.map((row) => {
      const placeholders = row.map((value) => {
        params.push(value);
        return `$${params.length}`;
      });
      return `(${placeholders.join(", ")})`;
    });
    await client.query(`INSERT INTO ${table} (${columns.join(", ")}) VALUES ${tuples.join(", ")}`, params);
  }
}

/** Replaces all business data with `data`. Must run inside a transaction. */
export async function writeSeedData(client: Queryable, data: SeedData): Promise<void> {
  await client.query(
    "TRUNCATE claim_events, claims, order_items, orders, customers, products RESTART IDENTITY CASCADE",
  );
  await insertRows(
    client,
    "products",
    ["id", "sku", "name", "brand", "category", "price_cents"],
    data.products.map((p) => [p.id, p.sku, p.name, p.brand, p.category, p.priceCents]),
  );
  await insertRows(
    client,
    "customers",
    ["id", "full_name", "email", "city"],
    data.customers.map((c) => [c.id, c.fullName, c.email, c.city]),
  );
  await insertRows(
    client,
    "orders",
    ["id", "order_number", "customer_id", "placed_on", "delivered_on", "total_cents"],
    data.orders.map((o) => [o.id, o.orderNumber, o.customerId, o.placedOn, o.deliveredOn, o.totalCents]),
  );
  await insertRows(
    client,
    "order_items",
    ["id", "order_id", "product_id", "quantity", "unit_price_cents", "serial_number"],
    data.items.map((i) => [i.id, i.orderId, i.productId, i.quantity, i.unitPriceCents, i.serialNumber]),
  );
  await insertRows(
    client,
    "claims",
    ["id", "code", "order_item_id", "type", "reason", "description", "status", "opened_on", "due_on", "created_at", "updated_at", "closed_at"],
    data.claims.map((c) => [
      c.id, c.code, c.orderItemId, c.type, c.reason, c.description, c.status,
      c.openedOn, c.dueOn, c.createdAt, c.updatedAt, c.closedAt,
    ]),
  );
  await insertRows(
    client,
    "claim_events",
    ["id", "claim_id", "kind", "actor", "from_status", "to_status", "message", "is_public", "created_at"],
    data.events.map((e) => [
      e.id, e.claimId, e.kind, e.actor, e.fromStatus, e.toStatus, e.message, e.isPublic, e.createdAt,
    ]),
  );
  // Identity columns must continue after the explicit ids inserted above.
  await client.query("SELECT setval(pg_get_serial_sequence('claims', 'id'), (SELECT max(id) FROM claims))");
  await client.query(
    "SELECT setval(pg_get_serial_sequence('claim_events', 'id'), (SELECT max(id) FROM claim_events))",
  );
  await client.query(
    `INSERT INTO app_meta (key, value, updated_at) VALUES ('seeded_on', $1, now()), ('showcase', $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [data.seededOn, JSON.stringify(data.showcase)],
  );
}
