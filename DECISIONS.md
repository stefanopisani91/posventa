# Decision log

Decisions taken while building Posventa without the product owner available.
Each entry says what was decided and why, so it can be reviewed and reversed.
Newest entries are at the bottom.

## Process

**D1. This log is written in English.** The repository is public and is meant
for reviewers in Spain and elsewhere; the README is in English too. The
morning hand-over note for the owner (`MORNING.md`) is in Italian.

**D2. `MORNING.md` is kept out of git** (listed in `.gitignore`). It is a
personal hand-over note that includes interview-preparation questions and
answers; publishing those in the repository would look odd to a reviewer.

## Legal rules

**D3. Legal rules verified on the official consolidated text** of Real Decreto
Legislativo 1/2007 (TRLGDCU) on boe.es, consolidated version last updated
28 Feb 2026. Articles used: 102 (14 calendar days to withdraw), 104.b (counted
from the day the consumer takes physical possession), 107.1 (refund within 14
days of being informed), 108.1 (consumer sends goods back within 14 days),
120.1 (3-year liability for lack of conformity of goods), 121.1 (defects that
appear within 2 years are presumed to have existed at delivery), 122 (repairs
suspend the periods). A plain-language official source is also cited: the
withdrawal leaflet of the European Consumer Centre Spain (Ministry of
Consumer Affairs), July 2026.

**D4. All legal numbers live in one file: `shared/legal-rules.ts`.** It is
TypeScript rather than JSON so each value can carry its article reference and
so both the browser and the Functions import the very same object.

**D5. How the 14-day withdrawal deadline is counted.** The day of delivery is
day 0; the last day to withdraw is delivery + 14 calendar days (the European
Commission's guidance gives "delivered 1 March → last day 15 March"). If that
last day is a Saturday or Sunday it is moved to the following Monday. This
follows Recital 41 of Directive 2011/83/EU (which applies Regulation
1182/71) and is never worse for the customer. National/regional public
holidays are **not** modelled (documented limitation; the flag can be turned
off in the config).

**D6. Years are added calendar-wise.** Warranty end = same day and month three
years later; a 29 February delivery ends on 28 February (Regulation 1182/71
rule: if the day does not exist, the period ends on the last day of the
month).

**D7. Warranty claims have an internal 30-day resolution target, clearly
labelled as shop policy, not law.** The law (art. 118.1.b) only says repairs
or replacements must happen "within a reasonable time". The shop needs a
number to sort its queue, so `shared/shop-policy.ts` holds it, separate from
the legal file.

**D8. The reason is optional for withdrawals.** Art. 102 lets the consumer
withdraw "sin indicar el motivo"; the form therefore offers "Prefer not to
say" as the default reason for a withdrawal. For warranty claims a reason and
a description are required, because the shop needs them to assess the defect.
