import { describe, expect, it } from "vitest";
import { CLAIM_CODE_PATTERN, CLAIM_STATUSES, ORDER_NUMBER_PATTERN, isClosed } from "../../shared/domain.ts";
import { computeEligibility } from "../../shared/eligibility.ts";
import { generateSeedData } from "./generate.ts";

const TODAY = "2026-10-10";
const data = generateSeedData(TODAY);

describe("demo data generator", () => {
  it("has the requested volumes", () => {
    expect(data.products).toHaveLength(15);
    expect(data.orders).toHaveLength(120);
    expect(data.claims).toHaveLength(40);
    expect(new Set(data.claims.map((c) => c.status))).toEqual(new Set(CLAIM_STATUSES));
  });

  it("is deterministic for a given day", () => {
    expect(generateSeedData(TODAY)).toEqual(data);
  });

  it("uses only fictional e-mail addresses on the reserved example.com domain", () => {
    expect(data.customers.every((c) => c.email.endsWith("@example.com"))).toBe(true);
    expect(new Set(data.customers.map((c) => c.email)).size).toBe(data.customers.length);
  });

  it("produces well-formed, unique order numbers and claim codes", () => {
    expect(data.orders.every((o) => ORDER_NUMBER_PATTERN.test(o.orderNumber))).toBe(true);
    expect(new Set(data.orders.map((o) => o.orderNumber)).size).toBe(120);
    expect(data.claims.every((c) => CLAIM_CODE_PATTERN.test(c.code))).toBe(true);
  });

  it("only contains claims that were legally possible on the day they were opened", () => {
    for (const claim of data.claims) {
      const item = data.items.find((i) => i.id === claim.orderItemId);
      const order = data.orders.find((o) => o.id === item?.orderId);
      expect(order?.deliveredOn).toBeTruthy();
      const atOpening = computeEligibility(order?.deliveredOn ?? null, claim.openedOn);
      const window = claim.type === "withdrawal" ? atOpening.withdrawal : atOpening.warranty;
      expect(window.available, `${claim.code} (${claim.type})`).toBe(true);
    }
  });

  it("keeps every timeline in order and in the past", () => {
    const now = new Date(`${TODAY}T00:00:00Z`).getTime();
    for (const claim of data.claims) {
      const events = data.events.filter((e) => e.claimId === claim.id);
      const times = events.map((e) => e.createdAt.getTime());
      expect(times).toEqual([...times].sort((a, b) => a - b));
      expect(Math.max(...times)).toBeLessThan(now);
      const lastStatus = events.filter((e) => e.kind !== "internal_note").at(-1)?.toStatus;
      expect(lastStatus).toBe(claim.status);
      expect(claim.closedAt !== null).toBe(isClosed(claim.status));
    }
  });

  it("never replaces the product in a withdrawal", () => {
    expect(data.claims.some((c) => c.type === "withdrawal" && c.status === "replaced")).toBe(false);
  });

  it("offers one example order per scenario", () => {
    expect(data.showcase.orders.map((o) => o.scenario)).toEqual([
      "recent", "in_transit", "warranty_presumption", "warranty_third_year", "expired", "open_claim",
    ]);
  });
});
