import type { Config } from "@netlify/functions";
import { claimListQuery, idParam, noteInput, statusChangeInput } from "../../shared/schemas.ts";
import { requireStaff } from "../../server/auth.ts";
import { HttpError, json, parseInput, readJson, route } from "../../server/http.ts";
import {
  addInternalNote,
  changeStatus,
  getClaimDetail,
  listClaims,
} from "../../server/services/admin.ts";
import { ensureDemoData } from "../../server/services/demo.ts";

/** Staff: claim queue with filters, claim detail, status changes and internal notes. */
export default route({
  GET: async (req, params) => {
    requireStaff(req);
    await ensureDemoData();
    if (params.id) return json(await getClaimDetail(parseInput(idParam, params.id)));
    const search = Object.fromEntries(new URL(req.url).searchParams);
    return json(await listClaims(parseInput(claimListQuery, search)));
  },
  POST: async (req, params) => {
    requireStaff(req);
    const id = parseInput(idParam, params.id ?? "");
    if (params.action === "status") return json(await changeStatus(id, await readJson(req, statusChangeInput)));
    if (params.action === "notes") return json(await addInternalNote(id, (await readJson(req, noteInput)).text));
    throw new HttpError(404, "claim_not_found");
  },
});

export const config: Config = {
  path: ["/api/admin/claims", "/api/admin/claims/:id", "/api/admin/claims/:id/:action"],
};
