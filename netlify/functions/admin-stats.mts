import type { Config } from "@netlify/functions";
import { statsQuery } from "../../shared/schemas.ts";
import { requireStaff } from "../../server/auth.ts";
import { json, parseInput, route } from "../../server/http.ts";
import { listProducts } from "../../server/services/admin.ts";
import { ensureDemoData } from "../../server/services/demo.ts";
import { computeStats } from "../../server/services/stats.ts";

/** Staff: shop numbers, and the product list used by the queue filters. */
export default route({
  GET: async (req) => {
    requireStaff(req);
    await ensureDemoData();
    const url = new URL(req.url);
    if (url.pathname === "/api/admin/products") return json(await listProducts());
    const { period } = parseInput(statsQuery, Object.fromEntries(url.searchParams));
    return json(await computeStats(period));
  },
});

export const config: Config = { path: ["/api/admin/stats", "/api/admin/products"] };
