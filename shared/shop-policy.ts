/**
 * Choices made by the (fictional) shop. Unlike `legal-rules.ts`, nothing here
 * comes from the law — these are internal targets a shop owner can tune.
 */
export const SHOP_POLICY = {
  name: "Circuito Gòtic",
  city: "Barcelona",
  /**
   * Internal target to close a warranty claim. The law (art. 118.1.b TRLGDCU)
   * only requires repair or replacement "within a reasonable time".
   */
  warrantyResolutionTargetDays: 30,
  /** Claims due within this many days are flagged as "due soon" in the shop queue. */
  dueSoonDays: 3,
} as const;
