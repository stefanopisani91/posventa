/** Reads configuration from Netlify's runtime, falling back to process.env (tests, scripts). */
type NetlifyGlobal = { env: { get(key: string): string | undefined } };

export function env(key: string): string | undefined {
  const netlify = (globalThis as { Netlify?: NetlifyGlobal }).Netlify;
  const value = netlify?.env.get(key) ?? process.env[key];
  return value === "" ? undefined : value;
}

/** Demo mode shows the demo credentials, keeps demo data fresh and allows public resets. */
export function isDemoMode(): boolean {
  return env("DEMO_MODE") === "true";
}
