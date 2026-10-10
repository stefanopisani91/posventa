import type { Config } from "@netlify/functions";
import { loginInput } from "../../shared/schemas.ts";
import {
  clearedSessionCookie,
  createSessionToken,
  credentialsMatch,
  currentStaff,
  sessionCookie,
} from "../../server/auth.ts";
import { HttpError, json, readJson, route } from "../../server/http.ts";

/** Staff login (POST), session check (GET) and logout (DELETE). */
export default route({
  GET: async (req) => {
    const session = currentStaff(req);
    return json(session ? { authenticated: true, email: session.sub } : { authenticated: false });
  },
  POST: async (req) => {
    const { email, password } = await readJson(req, loginInput);
    if (!credentialsMatch(email, password)) {
      await new Promise((resolve) => setTimeout(resolve, 400)); // make guessing slower
      throw new HttpError(401, "invalid_credentials");
    }
    return json({ authenticated: true, email }, 200, {
      "set-cookie": sessionCookie(req, createSessionToken(email)),
    });
  },
  DELETE: async (req) => json({ authenticated: false }, 200, { "set-cookie": clearedSessionCookie(req) }),
});

export const config: Config = {
  path: "/api/admin/session",
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
