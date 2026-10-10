import type { Config } from "@netlify/functions";
import { claimCode } from "../../shared/schemas.ts";
import { json, parseInput, route } from "../../server/http.ts";
import { ensureDemoData } from "../../server/services/demo.ts";
import { trackClaim } from "../../server/services/public.ts";

/** Public: status and public timeline of a claim, by its tracking code. */
export default route({
  GET: async (_req, params) => {
    await ensureDemoData();
    const code = parseInput(claimCode, params.code ?? "");
    return json(await trackClaim(code));
  },
});

export const config: Config = { path: "/api/claims/:code" };
