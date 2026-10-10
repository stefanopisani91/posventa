# Design review — 11 October 2026

After the visual redesign, four reviewer agents looked at the app from four angles,
each working from the same 36 screenshots (light/dark × desktop 1280 px/phone 390 px)
plus the running app, and each wrote a findings file with concrete fixes. This page
records what was applied, what was deliberately not, and what is left.

| Lens | What it measured | Findings (H/M/L) |
| --- | --- | --- |
| Visual & brand | hierarchy, consistency, typography, colour, illustration, polish | 2 / 7 / 5 |
| Mobile | every page at 360–1024 px: overflow, touch targets, text sizes, order of content | 5 / 7 / 3 |
| Charts & staff dashboard | chart form and colour against the project's data-viz rules; what a shop owner needs at a glance | 4 / 7 / 4 |
| Accessibility | WCAG 2.2 AA: computed contrast in both themes, colour-alone, focus, labels, keyboard | see below |

## Applied

**Chrome and layout**
- Header: one scrolling row of navigation on phones (was wrapping to 2–3 rows, 132–174 px of sticky chrome); staff actions share the row; single-row header from 760 px.
- Touch targets ≥ 44 px on coarse pointers (nav, small buttons, selects, chips, summary); the language select uses 16 px text so iOS no longer zooms.
- Content padding under the header made equal on customer and staff pages.
- Footer reduced to two columns; the stack credit moved into the legal line.
- Login: the brand panel no longer stretches to fill the column (it was a 380 px hole of gradient); it is sticky on desktop, hidden on phones, and its three lines are plain text instead of pills.

**Customer pages**
- Hero: lead rewritten without the numbers (they are in the three figures right below); the figures sit in a 3-column grid that fits one row at every width; the floating "14" calendar removed from the illustration; illustration colours moved onto the palette.
- Order page: the greeting is a sentence under the title instead of an uppercase label; closed panels are content-height.
- Deadline meters: visible track (brand-200), the withdrawal fill turns amber/red when due soon/last day; the warranty bar is one hue in two ordered strengths (teal 100 % / 60 %, validated in both themes — the previous 70 %-opacity amber was 1.5:1 on white and the dark segments were ΔE 13.4 apart); the "today" marker is a caret with the word "hoy" above the bar, clamped away from the rounded ends.
- Tracking: e-mail mask shortened to `da•••@example.com` so it never breaks mid-word.

**Staff pages**
- Queue: type shown as icon + word (no outline), on-track deadlines without a pill, dates never wrap; the three KPI cards gained a 3-segment overdue/soon/ok bar; secondary filters collapse behind "More filters" below 1040 px; on phones each request is one tappable card (was a 355 px transposed table row with a 110×24 px link, 10 342 px per page); table mode now starts at 900 px (it was clipped between 861 and 899 px).
- Request detail: duplicate type tag removed; customer block moved under the description so the two columns end together; e-mail no longer breaks mid-word; a deadline meter ("Día 11 de 14") in the header and a hollow "Plazo" node at the top of the timeline, coloured by urgency; status-change nodes carry the status icon (a rejection shows ✕); internal notes use violet instead of the warning amber; the timeline is its own grid area so on phones the status form comes right after the facts.
- Numbers: the monthly chart greys out months outside the selected period and marks the current month as partial (* and 55 % opacity); the chart title says "received" so "open" has one meaning on the page; reasons are coloured by claim type with a legend; statuses split into "in progress by phase" and "outcome of closed requests" with percentages; the warranty tile shows a count instead of a misleading cohort rate at 90 days; the "in progress" tile links to the overdue queue; average closing time shows the number of closed requests behind it; tooltips anchor to the bar they describe and no longer capitalise "De"; axis quarter ticks; direct label on the peak month; tile rail only on the critical tile.

**Tokens**
- Primary button has its own tokens so it keeps weight in dark mode.
- Corner radii reduced to three steps (8 / 12 / 16 px).
- Logo gradient uses literal colours so the mark does not re-tint in dark mode.

## Not applied, and why

- **Drop the login brand panel entirely** (visual review, preferred option). Kept, content-height: it is the only place the brand voice appears on the staff side, and the owner asked for a richer look. Hidden on phones, where it was pushing the form below the fold.
- **Remove the demo reset from the staff header** — applied. The brief only requires it on the login page, where the demo context is explicit.
- **"Previous period" deltas, on-time closure rate, median/p90 closing time, refunded €** (charts review). Need new backend queries; listed as next steps in the README rather than rushed in.
- **Use the chart orange for every warranty icon** (charts review). The chart series orange is reserved for data marks; decorative warranty icons stay amber. The type tag icons in the queue do use the series colours so the chart and the list agree.
- **A dedicated `ClaimCard` component for phones** (mobile review). The CSS-only card reaches the same result (≈150 px per request, whole card tappable) without a second rendering path to keep in sync.
- **Ten results per page on phones** (mobile review). Pagination is server-side with one page size; collapsing the cards already cut the page from 10 342 px to about a third.

## Still open

- Accessibility findings are folded in below once measured (contrast table, axe results).
- Holidays in deadline calculations and the art. 103 exceptions remain out of scope (see README).
