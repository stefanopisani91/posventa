import type { Config } from "@netlify/functions";
import { z } from "zod";
import { HttpError, json, readJson, route } from "../../server/http.ts";
import { getDemoInfo, resetDemoData } from "../../server/services/demo.ts";

/** Demo helpers: public credentials/showcase orders, and "restore initial data". */
export default route({
  GET: async () => json(await getDemoInfo()),
  POST: async (req) => {
    if (new URL(req.url).pathname !== "/api/demo/reset") throw new HttpError(405, "method_not_allowed");
    await readJson(req, z.object({}));
    return json(await resetDemoData());
  },
});

export const config: Config = { path: ["/api/demo", "/api/demo/reset"] };
