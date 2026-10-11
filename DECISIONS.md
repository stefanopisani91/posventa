# Decision log

Decisions taken while building Posventa. Each entry says what was decided and
why, so it can be reviewed and reversed. Newest entries are at the bottom.

## Process

**D1. This log is written in English.** The repository is public and is meant
for reviewers in Spain and elsewhere; the README is in English too.

## Legal rules

**D2. Legal rules verified on the official consolidated text** of Real Decreto
Legislativo 1/2007 (TRLGDCU) on boe.es, consolidated version last updated
28 Feb 2026. Articles used: 102 (14 calendar days to withdraw), 104.b (counted
from the day the consumer takes physical possession), 107.1 (refund within 14
days of being informed), 108.1 (consumer sends goods back within 14 days),
120.1 (3-year liability for lack of conformity of goods), 121.1 (defects that
appear within 2 years are presumed to have existed at delivery), 122 (repairs
suspend the periods). A plain-language official source is also cited: the
withdrawal leaflet of the European Consumer Centre Spain (Ministry of
Consumer Affairs), July 2026.

**D3. All legal numbers live in one file: `shared/legal-rules.ts`.** It is
TypeScript rather than JSON so each value can carry its article reference and
so both the browser and the Functions import the very same object.

**D4. How the 14-day withdrawal deadline is counted.** The day of delivery is
day 0; the last day to withdraw is delivery + 14 calendar days (delivered
1 March → last day 15 March). Recital 41 of Directive 2011/83/EU (checked on
EUR-Lex) says the day of the event is not counted and that Regulation 1182/71
applies. If the last day is a Saturday or Sunday it is moved to the following
Monday (Regulation 1182/71, art. 3(4)); this is never worse for the customer. National/regional public
holidays are **not** modelled (documented limitation; the flag can be turned
off in the config).

**D5. Years are added calendar-wise.** Warranty end = same day and month three
years later; a 29 February delivery ends on 28 February (Regulation 1182/71
rule: if the day does not exist, the period ends on the last day of the
month).

**D6. Warranty claims have an internal 30-day resolution target, clearly
labelled as shop policy, not law.** The law (art. 118.1.b) only says repairs
or replacements must happen "within a reasonable time". The shop needs a
number to sort its queue, so `shared/shop-policy.ts` holds it, separate from
the legal file.

**D7. The reason is optional for withdrawals.** Art. 102 lets the consumer
withdraw "sin indicar el motivo"; the form therefore offers "Prefer not to
say" as the default reason for a withdrawal. For warranty claims a reason and
a description are required, because the shop needs them to assess the defect.

## Product

**D8. Shop name "Circuito Gòtic", brands invented.** Product brands (Ondaluz,
Pixelmar, Teclaro, Voltiva, Sonoria, Lecturo, Trekko, Nexalia) were
web-searched before use; "Velitra", "Kubrix" and "Lumbre" were dropped because
they already exist as product or company names. Customer e-mails use the
reserved `example.com` domain.

**D9. Demo data is generated, not stored as a fixed dump.** A deterministic
generator builds 15 products, 90 customers, 120 orders and 40 claims with
dates relative to the day of the reset, so the "delivered 3 days ago" order
is always inside its 14-day window. The 40 claims are hand-designed
(status, product, timing) so that every status, overdue and due-soon
deadlines, both claim types and one clearly problematic product appear.
Consequence: with 40 claims on 120 orders the rates are far higher than a real
shop's; the README says so.

**D10. Demo data refreshes itself after 7 days.** In demo mode, if the data is
older than 7 days it is regenerated on the next request, so a reviewer who
opens the link weeks later still sees meaningful deadlines. Manual resets are
limited to one every 15 seconds.

**D11. The reset button is on the login page and in the staff header.** The
brief asked for it on the login page; it is public (no login) because the
credentials are public anyway. It only exists when `DEMO_MODE=true`.

**D12. Tracking needs only the code.** Codes are `PV-XXXX-XXXX` from a
32-character alphabet (~10^12 combinations, generated with `crypto.randomInt`).
The tracking page shows no personal data except a masked e-mail and never shows
internal notes.

**D13. Status workflow is enforced on the server.** received → approved →
product returned → replaced / refunded; rejection is possible until the claim
is closed and requires a message for the customer. A withdrawal can never end
in "replaced". Status changes carry the status the staff member saw, so two
people editing at once get a clear conflict instead of a silent overwrite.

**D14. Rates are cohort-based.** "Return rate" = share of orders delivered in
the period that had a withdrawal; same for warranty claims and per-product
rates. Volumes, reasons and status counts use claims opened in the period.

## Technology and platform

**D15. Raw SQL via `@netlify/database`'s pool, no ORM.** The schema is small;
plain parameterised SQL keeps the queries readable and the dependency list
short. Migration files live in `netlify/database/migrations/`.

**D16. Staff auth = one shared account from environment variables + signed
cookie.** `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET` live only in
Netlify. The session is an HMAC-SHA256-signed, HttpOnly, SameSite=Lax cookie
(8 h). Mutating endpoints accept only same-origin JSON (CSRF protection).
A real shop would use per-person accounts (e.g. Netlify Identity); noted as
future work.

**D17. Two rate-limit rules (the free-plan maximum):** login (10/min/IP) and
the public order lookup + claim creation (30/min/IP). Login has its own
function (`/api/admin/login`): in the first deploy the limit sat on the whole
session endpoint, and the session check that every staff page makes hit the
limit during normal use (found by the end-to-end run on the live site).
Logout clears the cookie; because sessions are stateless, a copied token stays
valid until it expires (8 h) — acceptable for a demo, noted as a limitation.

**D18. Local development uses `@netlify/vite-plugin`, with Edge Functions
emulation disabled.** The Edge Functions emulator crashed on this machine
(Deno CLI version mismatch: "unexpected argument '--allow-scripts'") and the
project has no edge functions. `npm run dev` loads `.env` through Node's
`--env-file-if-exists` because the plugin does not read `.env` files.

**D19. Deployed with Netlify's upload deploy**, not Git continuous
deployment: the site went live before the GitHub repository existed. The
upload builds on Netlify, so the database is provisioned and migrations are
applied exactly as with Git deploys. Local-only files (`.env`, `.netlify/`,
`dist/`) are left out of uploads.

**D20. New Netlify projects are private by default on this team** (team-login
required). Visitor access control was switched off for this project only.

**D21. Environment variables use default scopes and are not marked
"secret".** Setting custom scopes or the secret flag through the API was
silently ignored on the free plan (the variables were not saved). The values
still live only in Netlify, never in the repository.

**D22. Demo staff credentials:** `tienda@posventa.demo` / `gotic-demo-2026`.
They are deliberately public (README and login page).

**D23. The GitHub repository was created on 11 October, after the first
deploy.** The public repository `github.com/stefanopisani91/posventa` was
created with `gh repo create` and pushed (the GitHub token needs the
`workflow` scope to push a GitHub Actions file). `package-lock.json` had to
be regenerated with npm 10 (the version bundled with Node 22 used by CI): a
lock written by npm 11 made `npm ci` fail on CI.

**D24. Screenshots are taken by a Playwright script against the live site**
(`e2e/screenshots.spec.ts`), with the Netlify free-plan badge hidden so it does
not cover content.

## Visual design pass (11 Oct 2026)

**D25. Richer but professional look, built on tokens.** The goal was a
richer design. Choices: a brand mark (Gothic pointed arch with a circuit
trace, for "Circuito Gòtic"), a navy→electric-blue gradient used only for
the hero and the login side panel, a warm amber secondary used sparingly
(warranty icon, due-soon state, illustration shield), category icons for
products, time meters for the legal windows (withdrawal progress; warranty
split into the 2-year presumption and the third year, with a "today"
marker), KPI cards in the staff queue, an illustrated empty state and a
structured footer. Everything is CSS custom properties, so dark mode is a
token swap, not a second stylesheet.

**D26. Font self-hosted, not loaded from Google.** Manrope Variable is
bundled from `@fontsource-variable/manrope`. Loading fonts from Google's CDN
sends every visitor's IP to Google, which EU regulators and at least one
German court have treated as a GDPR problem; a Spanish shop should not depend
on it. Only the Latin subset is downloaded by the browser (unicode-range).

**D27. Design reviewed through four lenses** (visual/brand, mobile,
accessibility and contrast, charts and staff dashboard), each pass working
from the same 36 screenshots (light/dark × desktop/mobile) plus the running
app and producing a list of findings with concrete fixes. Findings were
triaged and applied; what was rejected and why is listed in
`docs/design-review.md`.
