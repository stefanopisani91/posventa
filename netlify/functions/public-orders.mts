import type { Config } from "@netlify/functions";
import { createClaimInput, orderLookupInput } from "../../shared/schemas.ts";
import { json, readJson, route } from "../../server/http.ts";
import { ensureDemoData } from "../../server/services/demo.ts";
import { createClaim, lookupOrder } from "../../server/services/public.ts";

/** Public: look up an order by number + e-mail, and open a claim on one of its lines. */
export default route({
  POST: async (req) => {
    await ensureDemoData();
    if (new URL(req.url).pathname === "/api/orders/lookup") {
      const input = await readJson(req, orderLookupInput);
      return json(await lookupOrder(input.orderNumber, input.email));
    }
    const input = await readJson(req, createClaimInput);
    return json(await createClaim(input), 201);
  },
});

export const config: Config = {
  path: ["/api/orders/lookup", "/api/claims"],
  // Slows down guessing of order number + e-mail pairs (free plan: 2 rules per project).
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
