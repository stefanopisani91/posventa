import type { Config } from "@netlify/functions";
import { loginInput } from "../../shared/schemas.ts";
import { createSessionToken, credentialsMatch, sessionCookie } from "../../server/auth.ts";
import { HttpError, json, readJson, route } from "../../server/http.ts";

/** Staff login. Rate-limited on its own so that session checks on every page are not. */
export default route({
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
});

export const config: Config = {
  path: "/api/admin/login",
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
