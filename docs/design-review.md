# Design review — 11 October 2026

After the visual redesign, the app was reviewed from four angles, each pass working
from the same 36 screenshots (light/dark × desktop 1280 px/phone 390 px) plus the
running app and producing a list of findings with concrete fixes. This page records
what was applied, what was deliberately not, and what is left.

| Lens | What it measured | Findings (H/M/L) |
| --- | --- | --- |
| Visual & brand | hierarchy, consistency, typography, colour, illustration, polish | 2 / 7 / 5 |
| Mobile | every page at 360–1024 px: overflow, touch targets, text sizes, order of content | 5 / 7 / 3 |
| Charts & staff dashboard | chart form and colour against the project's data-viz rules; what a shop owner needs at a glance | 4 / 7 / 4 |
| Accessibility | WCAG 2.2 AA: computed contrast in both themes, axe-core on every page, colour-alone, focus, labels, keyboard | 5 / 6 / 8 |

## Applied

**Chrome and layout**
- Header: one scrolling row of navigation on phones (was wrapping to 2–3 rows, 132–174 px of sticky chrome); staff actions share the row; single-row header from 760 px.
- Touch targets ≥ 44 px on coarse pointers (nav, small buttons, selects, chips, summary); the language select uses 16 px text so iOS no longer zooms.
- Content padding under the header made equal on customer and staff pages.
- Footer reduced to two columns; the stack credit moved into the legal line. The demo reset button left the staff header (the brief only asks for it on the login page, where the demo context is explicit).
- Login: the brand panel no longer stretches to fill the column (it was a 380 px hole of gradient); it is sticky on desktop, hidden on phones, and its three lines are plain text instead of pills.

**Customer pages**
- Hero: lead rewritten without the numbers (they are in the three figures right below); the figures sit in a 3-column grid that fits one row at every width; the floating "14" calendar removed from the illustration; illustration colours moved onto the palette.
- Order page: the greeting is a sentence under the title instead of an uppercase label; closed panels are content-height.
- Deadline meters: visible track (brand-200), the withdrawal fill turns amber/red when due soon/last day; the warranty bar is one hue in two ordered strengths — solid teal for the presumption years, hatched teal for the third year (the previous 70 %-opacity amber was 1.5:1 on white and the dark segments were ΔE 13.4 apart); the "today" marker is a caret with the word "hoy" above the bar, clamped away from the rounded ends.
- Tracking: e-mail mask shortened to `da•••@example.com` so it never breaks mid-word.

**Staff pages**
- Queue: type shown as icon + word (no outline), on-track deadlines without a pill, dates never wrap; the three KPI cards gained a 3-segment overdue/soon/ok bar; secondary filters collapse behind "More filters" below 1040 px; on phones each request is one tappable card (was a 355 px transposed table row with a 110×24 px link, 10 342 px per page); table mode now starts at 900 px (it was clipped between 861 and 899 px).
- Request detail: duplicate type tag removed; customer block moved under the description so the two columns end together; e-mail no longer breaks mid-word; a deadline meter ("Día 11 de 14") in the header and a hollow "Plazo" node at the top of the timeline, coloured by urgency; status-change nodes carry the status icon (a rejection shows ✕); internal notes use violet instead of the warning amber; the timeline is its own grid area so on phones the status form comes right after the facts.
- Numbers: the monthly chart greys out months outside the selected period and marks the current month as partial (hatched, with a * on the label and in the table); the chart title says "received" so "open" has one meaning on the page; reasons are coloured by claim type with a legend; statuses split into "in progress by phase" and "outcome of closed requests" with percentages; the warranty tile shows a count instead of a misleading cohort rate at 90 days; the "in progress" tile links to the overdue queue; average closing time shows the number of closed requests behind it; tooltips anchor to the bar they describe and no longer capitalise "De"; axis quarter ticks; direct label on the peak month; tile rail only on the critical tile.

**Tokens**
- Primary button has its own tokens so it keeps weight in dark mode.
- Corner radii reduced to three steps (8 / 12 / 16 px).
- Logo gradient uses literal colours so the mark does not re-tint in dark mode.

**Accessibility** (every number measured on real elements, light and dark)
- Muted text darkened (`#6b7489` → `#5f6980`): it was 4.29:1 on the page background and 4.40:1 on cards — the only axe violation in the app, on 5 of 7 routes; now ≥ 5.0:1 everywhere.
- Dark mode: placeholders styled (were the browser default at 3.70:1); the "reject" button, the rejected step and the success check used white on pale "ink" tokens (1.7–1.9:1) — an `-ink` background now always takes its `-bg` colour as foreground (≥ 6.5:1 in both themes).
- Hero figure labels in solid white on darker chips (one label had dropped to 4.38:1 on phones).
- Field borders at 3:1 (`--field-border`), meter tracks outlined, the weaker warranty strength and the partial month drawn as a hatch so they are not told apart by lightness alone.
- `Field` now wires `aria-describedby` and `aria-invalid` to its control (errors were visible but not announced); KPI filter buttons expose `aria-pressed` and the group has a name; the chart tooltip is hoverable and closes with Escape; the monthly chart is one tab stop with arrow keys (the page had 47); bar rows are no longer focusable; landmark labels are translated; logos are decorative inside links; the login panel title is no longer an `h2` above the `h1`; table roles survive the phone card layout; links are underlined, not colour-only.
- Verified and left as is: a visible, unclipped focus ring on all 111 tab stops per theme (4.4:1 light, 8.6:1 dark), reduced motion honoured, `<html lang>` follows the language switch, one `h1` per page, every control labelled, no horizontal scroll at 390 px, 16 px text on every form control (no iOS zoom).

## Not applied, and why

- **Drop the login brand panel entirely** (visual review, preferred option). Kept, content-height: it is the only place the brand voice appears on the staff side, and the goal was a richer look. Hidden on phones, where it was pushing the form below the fold.
- **"Previous period" deltas, on-time closure rate, median/p90 closing time, refunded €** (charts review). Need new backend queries; listed as next steps in the README rather than rushed in.
- **Use the chart orange for every warranty icon** (charts review). The chart series orange is reserved for data marks; decorative warranty icons stay amber. The type tag icons in the queue do use the series colours so the chart and the list agree.
- **A dedicated `ClaimCard` component for phones** (mobile review). The CSS-only card reaches the same result (≈150 px per request, whole card tappable) without a second rendering path to keep in sync.
- **Ten results per page on phones** (mobile review). Pagination is server-side with one page size; collapsing the cards already cut the page from 10 342 px to about a third.

## Still open

- Chart marks for months outside the selected period are deliberately grey and below 3:1; the table view and the "*" label carry the values.
- Holidays in deadline calculations and the art. 103 exceptions remain out of scope (see README).
