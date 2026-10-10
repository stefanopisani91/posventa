import type { NetlifyDB } from "@netlify/database-dev";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import adminClaims from "../netlify/functions/admin-claims.mts";
import adminLogin from "../netlify/functions/admin-login.mts";
import adminSession from "../netlify/functions/admin-session.mts";
import adminStats from "../netlify/functions/admin-stats.mts";
import claimTracking from "../netlify/functions/claim-tracking.mts";
import demo from "../netlify/functions/demo.mts";
import publicOrders from "../netlify/functions/public-orders.mts";
import type {
  AdminClaimDetail,
  AdminClaimListResponse,
  ApiErrorBody,
  CreateClaimResponse,
  DemoInfoResponse,
  OrderLookupResponse,
  ShowcaseOrder,
  StatsResponse,
  TrackingResponse,
} from "../shared/api-types.ts";
import { CLAIM_CODE_PATTERN } from "../shared/domain.ts";
import { query } from "../server/db.ts";
import { TEST_ADMIN, call, cookieFrom, startTestDatabase, stopTestDatabase } from "./helpers.ts";

let db: NetlifyDB;
let demoInfo: DemoInfoResponse;
let staffCookie: string;

const showcase = (scenario: ShowcaseOrder["scenario"]): ShowcaseOrder => {
  const order = demoInfo.showcaseOrders.find((o) => o.scenario === scenario);
  if (!order) throw new Error(`missing showcase order ${scenario}`);
  return order;
};

const lookup = (order: { orderNumber: string; email: string }) =>
  call<OrderLookupResponse>(publicOrders, "POST", "/api/orders/lookup", { body: order });

beforeAll(async () => {
  db = await startTestDatabase();
  demoInfo = (await call<DemoInfoResponse>(demo, "GET", "/api/demo")).body;
});

afterAll(async () => {
  await stopTestDatabase(db);
});

describe("demo data", () => {
  it("is generated on first use with the expected volumes", async () => {
    const [counts] = await query<{ products: number; orders: number; claims: number; statuses: number }>(
      `SELECT (SELECT count(*) FROM products)::int AS products,
              (SELECT count(*) FROM orders)::int AS orders,
              (SELECT count(*) FROM claims)::int AS claims,
              (SELECT count(DISTINCT status) FROM claims)::int AS statuses`,
    );
    expect(counts).toEqual({ products: 15, orders: 120, claims: 40, statuses: 6 });
  });

  it("exposes the demo credentials and example orders in demo mode", () => {
    expect(demoInfo.demoMode).toBe(true);
    expect(demoInfo.credentials).toEqual(TEST_ADMIN);
    expect(demoInfo.showcaseOrders).toHaveLength(6);
    expect(demoInfo.showcaseClaimCodes).toHaveLength(3);
  });
});

describe("customer: order lookup", () => {
  it("shows both windows open for a recent delivery", async () => {
    const res = await lookup(showcase("recent"));
    expect(res.status).toBe(200);
    const item = res.body.items[0];
    expect(item?.eligibility.withdrawal.available).toBe(true);
    expect(item?.eligibility.withdrawal.daysLeft).toBeGreaterThanOrEqual(11);
    expect(item?.eligibility.warranty).toMatchObject({ available: true, presumptionActive: true });
  });

  it("accepts the order number in lower case and the e-mail in mixed case", async () => {
    const order = showcase("recent");
    const res = await lookup({ orderNumber: order.orderNumber.toLowerCase(), email: order.email.toUpperCase() });
    expect(res.status).toBe(200);
  });

  it("shows only the warranty after 14 days, without presumption in the third year", async () => {
    const res = await lookup(showcase("warranty_third_year"));
    expect(res.body.items[0]?.eligibility.withdrawal.available).toBe(false);
    expect(res.body.items[0]?.eligibility.warranty).toMatchObject({ available: true, presumptionActive: false });
  });

  it("shows nothing available after three years", async () => {
    const res = await lookup(showcase("expired"));
    expect(res.body.items[0]?.eligibility.withdrawal.available).toBe(false);
    expect(res.body.items[0]?.eligibility.warranty.available).toBe(false);
  });

  it("returns the same 404 for an unknown order and for a wrong e-mail", async () => {
    const wrongEmail = await lookup({ orderNumber: showcase("recent").orderNumber, email: "someone@example.com" });
    const unknown = await lookup({ orderNumber: "CG-99999", email: showcase("recent").email });
    expect(wrongEmail.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect((wrongEmail.body as unknown as ApiErrorBody).error.code).toBe("order_not_found");
  });

  it("validates the input on the server", async () => {
    const res = await lookup({ orderNumber: "12345", email: "not-an-email" });
    expect(res.status).toBe(400);
    const error = (res.body as unknown as ApiErrorBody).error;
    expect(error.code).toBe("validation_error");
    expect(error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "orderNumber" }), expect.objectContaining({ path: "email" })]),
    );
  });

  it("rejects requests that are not JSON", async () => {
    const res = await call(publicOrders, "POST", "/api/orders/lookup", {
      body: "orderNumber=CG-10001",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    expect(res.status).toBe(415);
  });

  it("rejects cross-site browser requests", async () => {
    const res = await call(publicOrders, "POST", "/api/orders/lookup", {
      body: showcase("recent"),
      headers: { origin: "https://evil.example" },
    });
    expect(res.status).toBe(403);
  });
});

describe("customer: opening and tracking a claim", () => {
  let createdCode = "";

  it("opens a withdrawal without a reason and returns a tracking code", async () => {
    const order = showcase("recent");
    const item = (await lookup(order)).body.items[0];
    const res = await call<CreateClaimResponse>(publicOrders, "POST", "/api/claims", {
      body: { ...order, orderItemId: item?.id, type: "withdrawal" },
    });
    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(CLAIM_CODE_PATTERN);
    expect(res.body.status).toBe("received");
    createdCode = res.body.code;
  });

  it("does not allow a second open claim on the same line", async () => {
    const order = showcase("recent");
    const item = (await lookup(order)).body.items[0];
    expect(item?.hasOpenClaim).toBe(true);
    const res = await call<ApiErrorBody>(publicOrders, "POST", "/api/claims", {
      body: { ...order, orderItemId: item?.id, type: "warranty", reason: "battery", description: "It stopped charging." },
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("claim_already_open");
  });

  it("requires a reason and a description for warranty claims", async () => {
    const order = showcase("warranty_third_year");
    const item = (await lookup(order)).body.items[0];
    const res = await call<ApiErrorBody>(publicOrders, "POST", "/api/claims", {
      body: { ...order, orderItemId: item?.id, type: "warranty", reason: "screen", description: "bad" },
    });
    expect(res.status).toBe(400);
  });

  it("refuses a warranty claim after three years", async () => {
    const order = showcase("expired");
    const item = (await lookup(order)).body.items[0];
    const res = await call<ApiErrorBody>(publicOrders, "POST", "/api/claims", {
      body: { ...order, orderItemId: item?.id, type: "warranty", reason: "audio", description: "No sound from the speaker." },
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("not_eligible");
  });

  it("refuses an item that belongs to another order", async () => {
    const res = await call<ApiErrorBody>(publicOrders, "POST", "/api/claims", {
      body: { ...showcase("expired"), orderItemId: 1, type: "withdrawal" },
    });
    expect([404, 422]).toContain(res.status);
  });

  it("allows withdrawing before delivery but not a warranty claim", async () => {
    const order = showcase("in_transit");
    const item = (await lookup(order)).body.items[0];
    const warranty = await call(publicOrders, "POST", "/api/claims", {
      body: { ...order, orderItemId: item?.id, type: "warranty", reason: "screen", description: "Screen is broken already." },
    });
    expect(warranty.status).toBe(422);
    const withdrawal = await call(publicOrders, "POST", "/api/claims", {
      body: { ...order, orderItemId: item?.id, type: "withdrawal", reason: "changed_mind" },
    });
    expect(withdrawal.status).toBe(201);
  });

  it("tracks the new claim by its code with a masked e-mail", async () => {
    const res = await call<TrackingResponse>(claimTracking, "GET", `/api/claims/${createdCode}`, {
      params: { code: createdCode.toLowerCase() },
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ code: createdCode, status: "received", type: "withdrawal", closed: false });
    expect(res.body.maskedEmail).not.toContain(showcase("recent").email.split("@")[0]);
    expect(res.body.events).toHaveLength(1);
  });

  it("answers 404 for unknown codes and 400 for malformed ones", async () => {
    expect((await call(claimTracking, "GET", "/api/claims/PV-2222-2222", { params: { code: "PV-2222-2222" } })).status).toBe(404);
    expect((await call(claimTracking, "GET", "/api/claims/hello", { params: { code: "hello" } })).status).toBe(400);
  });
});

describe("shop: authentication", () => {
  it("protects every staff endpoint", async () => {
    expect((await call(adminClaims, "GET", "/api/admin/claims")).status).toBe(401);
    expect((await call(adminStats, "GET", "/api/admin/stats")).status).toBe(401);
    expect((await call(adminClaims, "POST", "/api/admin/claims/1/notes", { params: { id: "1", action: "notes" }, body: { text: "x" } })).status).toBe(401);
  });

  it("rejects a wrong password", async () => {
    const res = await call<ApiErrorBody>(adminLogin, "POST", "/api/admin/login", {
      body: { email: TEST_ADMIN.email, password: "wrong" },
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("invalid_credentials");
  });

  it("logs in with an HttpOnly session cookie", async () => {
    const res = await call(adminLogin, "POST", "/api/admin/login", { body: TEST_ADMIN });
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    staffCookie = cookieFrom(res.headers);
    const session = await call(adminSession, "GET", "/api/admin/session", { cookie: staffCookie });
    expect(session.body).toEqual({ authenticated: true, email: TEST_ADMIN.email });
  });

  it("logs out by clearing the cookie", async () => {
    const res = await call(adminSession, "DELETE", "/api/admin/session", { cookie: staffCookie });
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("rejects a tampered cookie", async () => {
    const tampered = staffCookie.replace(/.$/, (c) => (c === "A" ? "B" : "A"));
    expect((await call(adminClaims, "GET", "/api/admin/claims", { cookie: tampered })).status).toBe(401);
  });
});

describe("shop: claim queue", () => {
  const list = (qs = "") =>
    call<AdminClaimListResponse>(adminClaims, "GET", `/api/admin/claims${qs}`, { cookie: staffCookie });

  it("lists claims, open ones first by due date", async () => {
    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(42); // 40 demo claims + 2 opened above
    const open = res.body.items.filter((c) => c.dueState !== "closed");
    const dueDates = open.map((c) => c.dueOn);
    expect(dueDates).toEqual([...dueDates].sort());
  });

  it("filters by status, type, product and deadline", async () => {
    const received = await list("?status=received");
    expect(received.body.items.every((c) => c.status === "received")).toBe(true);

    const warranty = await list("?type=warranty&status=open");
    expect(warranty.body.items.every((c) => c.type === "warranty" && c.dueState !== "closed")).toBe(true);

    const overdue = await list("?due=overdue");
    expect(overdue.body.items.length).toBeGreaterThan(0);
    expect(overdue.body.items.every((c) => c.dueState === "overdue" && c.daysToDue < 0)).toBe(true);

    const buds = await list("?productId=1");
    expect(buds.body.items.length).toBeGreaterThan(5);
    expect(buds.body.items.every((c) => c.productName === "Ondaluz Buds Pro")).toBe(true);
  });

  it("searches by claim code, order number or customer", async () => {
    const code = demoInfo.showcaseClaimCodes[0] as string;
    const res = await list(`?q=${code}`);
    expect(res.body.items.map((c) => c.code)).toEqual([code]);
  });

  it("rejects unknown filter values", async () => {
    expect((await list("?status=lost")).status).toBe(400);
  });
});

describe("shop: working on a claim", () => {
  let claimId = 0;
  let code = "";

  const detail = () =>
    call<AdminClaimDetail>(adminClaims, "GET", `/api/admin/claims/${claimId}`, {
      params: { id: String(claimId) },
      cookie: staffCookie,
    });
  const post = (action: string, body: unknown) =>
    call<AdminClaimDetail & ApiErrorBody>(adminClaims, "POST", `/api/admin/claims/${claimId}/${action}`, {
      params: { id: String(claimId), action },
      body,
      cookie: staffCookie,
    });

  beforeAll(async () => {
    const received = await call<AdminClaimListResponse>(adminClaims, "GET", "/api/admin/claims?status=received&type=warranty", {
      cookie: staffCookie,
    });
    claimId = received.body.items[0]?.id ?? 0;
    code = received.body.items[0]?.code ?? "";
  });

  it("shows the claim with its allowed next steps and legal context", async () => {
    const res = await detail();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("received");
    expect(res.body.nextStatuses).toEqual(["approved", "rejected"]);
    expect(res.body.legalAtOpening.warranty.available).toBe(true);
  });

  it("moves the claim forward and records it in the timeline", async () => {
    const res = await post("status", { from: "received", to: "approved", message: "Te enviamos la etiqueta." });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("approved");
    expect(res.body.events.at(-1)).toMatchObject({ kind: "status_changed", fromStatus: "received", toStatus: "approved" });

    // The change is persisted: a fresh read returns it.
    expect((await detail()).body.status).toBe("approved");
  });

  it("refuses steps that skip the workflow", async () => {
    const res = await post("status", { from: "approved", to: "replaced" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("invalid_transition");
  });

  it("detects a concurrent change", async () => {
    const res = await post("status", { from: "received", to: "approved" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("status_conflict");
  });

  it("requires an explanation to reject", async () => {
    expect((await post("status", { from: "approved", to: "rejected" })).status).toBe(400);
  });

  it("keeps internal notes away from the customer", async () => {
    const res = await post("notes", { text: "Llamar al proveedor por este lote." });
    expect(res.status).toBe(200);
    expect(res.body.events.at(-1)).toMatchObject({ kind: "internal_note", isPublic: false });

    const tracking = await call<TrackingResponse>(claimTracking, "GET", `/api/claims/${code}`, { params: { code } });
    expect(tracking.body.status).toBe("approved");
    expect(tracking.body.events.some((e) => e.message === "Te enviamos la etiqueta.")).toBe(true);
    expect(tracking.body.events.some((e) => e.message?.includes("proveedor"))).toBe(false);
  });

  it("closes the claim and sets the closing time", async () => {
    await post("status", { from: "approved", to: "product_returned" });
    const res = await post("status", { from: "product_returned", to: "replaced", message: "Unidad nueva enviada." });
    expect(res.body.status).toBe("replaced");
    expect(res.body.closedAt).not.toBeNull();
    expect(res.body.nextStatuses).toEqual([]);
  });
});

describe("shop: numbers", () => {
  it("computes rates, reasons, closing time and problem products", async () => {
    const res = await call<StatsResponse>(adminStats, "GET", "/api/admin/stats?period=all", { cookie: staffCookie });
    expect(res.status).toBe(200);
    const s = res.body;
    expect(s.deliveredOrders).toBeGreaterThan(100);
    expect(s.claims.total).toBe(42);
    expect(s.byStatus.reduce((sum, row) => sum + row.count, 0)).toBe(42);
    expect(s.returnRate).toBeGreaterThan(0);
    expect(s.returnRate).toBeLessThan(1);
    expect(s.avgCloseDays.all).toBeGreaterThan(0);
    expect(s.products[0]?.productName).toBe("Ondaluz Buds Pro");
    expect(s.topReasons[0]?.reason).toBe("battery");
    expect(s.monthly).toHaveLength(12);
  });

  it("validates the period", async () => {
    expect((await call(adminStats, "GET", "/api/admin/stats?period=week", { cookie: staffCookie })).status).toBe(400);
  });
});

describe("demo reset", () => {
  it("restores the initial data and refuses an immediate second reset", async () => {
    const res = await call(demo, "POST", "/api/demo/reset", { body: {} });
    expect(res.status).toBe(200);
    const [row] = await query<{ claims: number }>("SELECT count(*)::int AS claims FROM claims");
    expect(row?.claims).toBe(40);

    const again = await call<ApiErrorBody>(demo, "POST", "/api/demo/reset", { body: {} });
    expect(again.status).toBe(429);
    expect(again.body.error.code).toBe("reset_too_soon");
  });

  it("does not reset on POST /api/demo", async () => {
    expect((await call(demo, "POST", "/api/demo", { body: {} })).status).toBe(405);
  });
});
