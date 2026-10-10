import type { Config } from "@netlify/functions";
import { clearedSessionCookie, currentStaff } from "../../server/auth.ts";
import { json, route } from "../../server/http.ts";

/** Session check (GET) and logout (DELETE). Login lives in admin-login. */
export default route({
  GET: async (req) => {
    const session = currentStaff(req);
    return json(session ? { authenticated: true, email: session.sub } : { authenticated: false });
  },
  DELETE: async (req) => json({ authenticated: false }, 200, { "set-cookie": clearedSessionCookie(req) }),
});

export const config: Config = { path: "/api/admin/session" };
