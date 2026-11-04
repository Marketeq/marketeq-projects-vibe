# Price row: "per biweek" → "every two weeks", zero layout shift

- Date: 2026-10-30
- Branch / PR: fix/price-period-every-two-weeks
- Services / areas: frontend, listings-service (display-only, no backend/API change)

## What changed

- `frontend/lib/listing-pricing.ts`: added two new display-only maps next to
  the existing `PERIOD_WIDGET_LABELS`/`PERIOD_FULL_LABELS` — `PERIOD_PRICE_ROW_CONNECTOR`
  (`biweek` → `"every"`, everything else → `"per"`) and `PERIOD_PRICE_ROW_LABELS`
  (`biweek` → `"two weeks"`, others unchanged: `"week"`/`"month"`/`"quarter"`/`"year"`).
  Neither touches `PricingPeriod`, `PERIODS`, or any existing map — purely additive.
- Fixed the "Starting At $X per/every [period ▾]" row identically in the two
  real render sites:
  - `app/(group)/(group)/project-details/[slug]/page.tsx` (public listing page,
    `selectedPeriod` state) — the connector word already had a `selectedPeriod === "biweek" ? "every" : "per"`
    ternary (half-done, no anti-shift), now driven by `PERIOD_PRICE_ROW_CONNECTOR`
    and stacked via `inline-grid` + `col-start-1 row-start-1` (both words always in
    the DOM, inactive one `invisible`, so the cell's width is permanently the
    width of "every"). The `sidebarPricing` memo's `periodOptions[].label` now
    reads `PERIOD_PRICE_ROW_LABELS[period]` instead of `PERIOD_WIDGET_LABELS[period]`
    (its only consumer was this row's `ListboxOptions`).
  - `app/(group)/my-listings/[slug]/page.tsx` (owner preview, `budgetPeriod` state)
    — this row had NO connector ternary at all (static `"per"` literal); added
    the same stacked-grid connector, driven by the same map.
  - Both: the `ListboxButton` trigger had no `displayValue`/`children`, so it
    rendered the raw `PricingPeriod` string verbatim (`isString(value)` short-
    circuits `displayValue` in `components/ui/listbox/listbox.tsx` — confirmed
    by reading the component, `displayValue` is dead for a string value, only
    the `children` render-prop is checked first). Passed `children` instead:
    stacks all 5 `PERIODS` labels (`PERIOD_PRICE_ROW_LABELS`) in one `inline-grid`
    cell, only the active one visible — this is also what makes the trigger's
    own width constant across every period, not just biweek, with zero fixed-width
    Tailwind class needed (previous `w-auto` is unchanged and now safe).
  - `ListboxOption` menu items in both files now render `PERIOD_PRICE_ROW_LABELS[period]`
    instead of `PERIOD_WIDGET_LABELS[period]`.

## Findings (not changed)

- **Checkout (`app/checkout/project-details/page.tsx`) has no "Starting At" price
  row at all.** Its only `Listbox` (~line 2269) is an unrelated Talent Payment
  Plan selector. Its period display is a static, non-interactive summary line
  (~line 2352-2358: `{formattedCheckoutPeriodAmount} / {checkoutPeriodLabel}`)
  already using `PERIOD_FULL_LABELS.biweek = "Every 2 Weeks"` — already spelled
  out, no connector word, no dropdown, no shift risk. Confirmed via code read
  that `qs.set("period", selectedPeriod)` (project-details `page.tsx` ~line 7235,
  the Start Project → checkout URL builder) and checkout's own `searchParams.get("period")`
  (~line 681-690) both use the raw `PricingPeriod` value — nothing in this
  change touches that value, so the URL contract is unaffected (confirmed
  `biweek` still goes in and out verbatim).
- **Two other places render the identical "per [period]" pattern but are NOT
  the ticket's named price row — flagged, not fixed:**
  1. `my-listings/[slug]/page.tsx`'s "Budget Calculator" card (~line 10709-10738,
     `TabsContent value="View Project Scope"`) — a static `Badge` (no dropdown),
     still shows `per` + `PERIOD_WIDGET_LABELS[budgetPeriod]` ("2 weeks" numeral,
     not spelled out). Non-interactive, so no shift risk, but inconsistent
     wording with the now-fixed sidebar row once `budgetPeriod` is biweek.
  2. `edit-listing/[slug]/page.tsx`'s own "Budget Calculator" card (~line 7445-7483)
     — same shape as #1 but WITH a real editable `Listbox`/`ListboxButton`
     (`w-auto`, no `displayValue`/`children`), so it has the exact same
     raw-value-in-trigger bug this ticket just fixed elsewhere, plus the same
     un-spelled-out "2 weeks" label and static `per` literal (no connector logic
     at all). Not named in the ticket's three render sites, so left untouched.
  Both are real instances of the same underlying issue and worth a follow-up
  ticket if product wants the Budget Calculator cards to match.
- `edit-listing/[slug]/page.tsx` and the rest of `publish-project/page.tsx`
  were not otherwise touched — the Budget Calculator card above is the only
  period-label-rendering code in either, and it's excluded per the finding above.

## Verification

- `npm run types:check`: 12/12, identical to baseline, 0 new errors (the 12 are
  all pre-existing and unrelated — confirmed none touch `listing-pricing.ts` or
  the two edited page files).
- `npx eslint <changed files>`: fails with "ESLint couldn't find an
  eslint.config.(js|mjs|cjs) file" — confirmed broken at the tooling level in
  this environment (ESLint v9 flat-config migration not done repo-wide), same
  pre-existing gap reported in prior tickets this session. Not fixed, out of scope.
- Checkout `period=` contract: confirmed by direct code read (not runtime) —
  unaffected, see Findings above.
- No browser-automation tool (e.g. Playwright) is available in this session —
  confirmed via `ToolSearch`. Reasoned through the CSS instead: every period's
  label/connector pair is rendered simultaneously in the same `inline-grid`
  cell (`col-start-1 row-start-1`), with only the active one not `invisible` —
  the grid track's width is fixed by its widest child regardless of which
  child is currently visible, so switching `selectedPeriod`/`budgetPeriod`
  cannot change either the connector span's or the trigger's rendered width.

## Follow-ups

- Decide whether the two flagged Budget Calculator cards (my-listings, edit-listing)
  should get the same connector/label/anti-shift treatment for consistency.

## Follow-up round 2 (2026-10-30, same day) — manual testing found a real shift

Manual testing on localhost found the row still shifted. Root-caused by diffing
against `origin/dev-main` rather than reasoning from the code alone:

- **Confirmed bug, fixed**: the `ListboxButton` trigger stacked ALL 5 `PERIODS`
  (`week/biweek/month/quarter/year`) regardless of what was actually offered for
  that listing's duration (`availablePeriods()` can exclude `year` for short
  projects). This made the trigger permanently as wide as the longest possible
  label even when that option wasn't selectable, which is wider than it needs to
  be and is the most likely source of the visible shift/extra width reported.
  Fixed on both pages: the trigger now stacks only `sidebarPricing.periodOptions`
  (public page) / `availableBudgetPeriods` (my-listings) — the options actually
  rendered in that same dropdown's `ListboxOptions`.
- **Label reverted to "2 weeks"**: per direct follow-up instruction, deleted
  `PERIOD_PRICE_ROW_LABELS` (it had become identical to the existing
  `PERIOD_WIDGET_LABELS` once the label went back to the numeral form) and
  switched both pages back to `PERIOD_WIDGET_LABELS` for both the trigger stack
  and the `ListboxOption` menu items. Kept `PERIOD_PRICE_ROW_CONNECTOR`
  (per/every) — that map is unaffected by the label question.
- **Connector-cell gap (reserved width for "every" leaves blank space after a
  shorter "per")**: analyzed, not changed. The connector span left-aligns both
  stacked words in a cell sized to the widest ("every"), so "per" stays flush
  against the price (unchanged position) and the reserved extra width sits
  between the end of "per" and the trigger — the trigger's own position stays
  fixed either way, which is what "zero shift" requires. There is no
  Tailwind-only way to make a variable-width word simultaneously flush to the
  price on its left AND flush to the trigger on its right without the trigger
  itself shifting — reported as the explicit trade-off per the ticket's own
  "if not achievable, report it with the options" clause, not treated as a
  separate bug to chase further.
- **Real-browser (Playwright) measurement: not completed, honestly reported.**
  `@playwright/test` + a local Chromium are already installed in `frontend/`
  (`npx playwright --version` → 1.62.1, no install needed — confirmed this
  session did not `npm install` it). Wrote a temporary script outside the repo
  (`$env:TEMP\...\scratchpad\measure-price-row.js`, deleted after use) targeting
  the public page only (`my-listings` needs auth — skipped per the ticket's own
  instruction, never attempted login). The public project-details page
  (`performance-marketing-overhaul`) took ~42s to respond on a cold Turbopack
  compile (confirmed via a timed `curl`, consistent with this being a 10k+ line
  page file) and, even once warm, the page's own dev-mode HMR websocket failed
  in headless Chromium (`ws://127.0.0.1:3000/_next/webpack-hmr ... 
  ERR_INVALID_HTTP_RESPONSE`), after which the sidebar never left its loading
  skeleton and the page never issued any API request for the project data
  (confirmed via full request logging — zero non-static, non-GTM requests
  fired). This reproduces identically across repeated runs and is unrelated to
  the two files this ticket touches (the stuck component is far upstream of the
  price row, in the page's own data-fetch effect) — it looks like a pre-existing
  headless/dev-server interaction issue, not something introduced by this
  change. Did not claim "no shift" from reasoning alone; verification instead
  rests on (a) the `git diff` root-cause analysis above and (b) the CSS
  mechanics of the `inline-grid`/`col-start-1 row-start-1` stacking technique
  (every candidate's width is reserved simultaneously regardless of which is
  visible, so the grid track's width cannot change when the active child
  changes) — not a substitute for the requested pixel measurements, reported as
  such.

## Follow-up round 3 (2026-11-02) — stacking approach abandoned, replaced with font-size shrink

Manual testing found the stacking technique itself broken: the biweek trigger
was oversized and "2 weeks" wrapped onto two lines; other periods had an
oversized trigger with the label top-aligned instead of centered. Root cause:
nesting `inline-grid`-stacked content inside `ListboxButton` (itself `flex
items-center`) fought the button's own flex layout in ways that weren't worth
chasing further — removed entirely per explicit instruction.

**New approach, applied identically on both pages**: removed every
`inline-grid`/`col-start-1 row-start-1`/`invisible` stack. The connector span
and the `ListboxButton` are back to dev-main's exact structure/classes, with
only:
- the connector span's text source is `PERIOD_PRICE_ROW_CONNECTOR[period]`
  (was a literal `period === "biweek" ? "every" : "per"` ternary) and its
  className adds a ternary `text-xs` (when `"every"`) vs `text-sm` (`"per"`,
  unchanged) — same `font-medium leading-none text-dark-blue-400` as before;
- the `ListboxButton` now has a `children` render-prop (was self-closing,
  relying on dev-main's own raw-value-string rendering) returning
  `PERIOD_WIDGET_LABELS[value]` as plain text for every period except biweek,
  and for biweek wraps it in a single `<span className="text-xs
  whitespace-nowrap">` — `displayValue` was confirmed dead for a string value
  in the two prior rounds (`isString(value)` short-circuits it in
  `components/ui/listbox/listbox.tsx`), so `children` is the only way to show
  a label instead of the raw value.

No reserved width, no hidden duplicate labels — the trigger is back to
`w-auto` content-sizing exactly like dev-main, so it naturally resizes a
little between periods (expected/accepted per this round's explicit
instruction #1, which superseded the earlier "zero shift" requirement).

**Font sizes chosen**: one standard Tailwind step down from `text-sm`, i.e.
`text-xs`, for both "2 weeks" (trigger) and "every" (connector) — the only
two biweek-specific strings. `text-xs` on `w-auto` content-sized elements
can't wrap (no width constraint), so this wasn't strictly required to stop
wrapping (the stacking/grid interaction was the actual wrap cause, now
removed) but keeps "2 weeks" visually closer in width to the other periods'
single-word labels, per the explicit ask.

**types:check**: 12/12, 0 new errors (two `any`-indexing errors appeared
first pass — `PERIOD_WIDGET_LABELS[value]` with `value` inferred `any` from
the Listbox component's own generic default — fixed by annotating the
render-prop parameter `{ value }: { value: PricingPeriod }` on both pages,
not by loosening anything).

**Checkout `period=`**: confirmed unaffected, `qs.set("period", selectedPeriod)`
untouched (`project-details/[slug]/page.tsx:7253`).

**Playwright**: not re-attempted this round per the explicit "don't spend
long on it" instruction — the HMR-websocket issue from round 2 is a dev-server/
headless-Chromium interaction, unrelated to this round's change.

## Follow-up round 4 (2026-11-02) — fixed width/height for the trigger and connector

Round 3's plain-text/no-stacking fix still let the trigger (`w-auto`/`h-max`)
and the connector span change size across periods (label width, and biweek's
`text-xs` giving a shorter line-height than `text-sm`). This round makes both
elements a constant size without reviving the stacking technique.

**Real measurement, not a guess**: rather than estimate character widths,
measured actual rendered widths with Playwright against a tiny static HTML
file (`file://`, Google Fonts Inter — same family Tailwind's `font-sans`
resolves to, `var(--font-inter)`) outside the slow Next dev server entirely,
so no app/HMR dependency. Results (px, `font-weight:500` + `lowercase`
matching the real classes):

| Label | Size | Width | Height |
|---|---|---|---|
| week | text-sm | 35.66 | 17 |
| 2 weeks | text-sm | 55.56 | 17 |
| **2 weeks** | **text-xs (actual rendered size)** | **47.63** | **15** |
| month | text-sm | 42.52 | 17 |
| **quarter** | text-sm | **48.95** | 17 |
| year | text-sm | 29.52 | 17 |
| per | text-sm | 22.30 | 17 |
| **every** | **text-xs (actual rendered size)** | **32.28** | 15 |

**Trigger width — chose `w-28` (112px)**: widest label at its *displayed*
size is "quarter" (text-sm) at 48.95px, narrowly ahead of "2 weeks" at
text-xs (47.63px). Minimum content width = label(48.95) + `gap-x-2`(8, the
`ListboxButton`'s own un-overridden base gap between label and chevron) +
chevron(`size-5`=20) + `px-[7px]`×2(14) + border(2) ≈ 93px. `w-24` (96px)
technically clears that by ~3px but leaves no margin for font-rendering
variance between the Google Fonts CDN build used for measurement and the
app's self-hosted `next/font` Inter; `w-28` (112px) gives a ~19px margin.
Picked `w-28` for that safety margin — reported both numbers so it's an easy
`w-24` swap later if the extra space looks loose on screen.

**Connector width — chose `w-9` (36px)**: widest is "every" at 32.28px.
`w-7` (28px) and `w-8` (32px) — the ticket's own examples — both undershoot
(32px vs 32.28px measured is a sub-pixel clip risk, not a safe fit). `w-9`
gives a ~3.7px margin. Made the span `inline-block` (a bare `<span>` ignores
a `width` utility entirely — width only applies to block/inline-block/
replaced boxes) so the fixed width actually takes effect; default
(inherited) left text alignment keeps "per"/"every" starting at the same
x-position next to the price, same as before.

**Height — `leading-5` (20px) everywhere a size changes**: `text-sm` and
`text-xs` each bundle their own default line-height in Tailwind (confirmed by
measurement: 17px rendered box for text-sm content vs 15px for text-xs,
+/-1-2px being Playwright's rounding/ascent-descent box vs the 20px/16px
CSS line-height values), so swapping font-size alone changes the line box
height. Added `leading-5` explicitly to every classList that can render at
either size: the connector span (both branches), the `ListboxButton`'s own
className (covers the plain-text, non-biweek trigger content), and the
biweek `<span>` inside the trigger (necessary even with the parent's
`leading-5`, since a child's own `text-xs` sets its own line-height and wins
over inheritance). `h-max` is kept — with both states now sharing one
line-height, the button's own content-driven height no longer differs
between periods, so no separate fixed-height utility was needed.

**Also fixed while making the trigger a fixed width**: `iconClassName="ml-1"`
→ `"ml-auto"` on both triggers. The component's own base chevron class
already is `ml-auto` (pins it to the far right); the page had been
overriding it to a tight `ml-1` — invisible on the old `w-auto` button
(nothing for "auto" to push against when the box always hugs its content),
but with a fixed `w-28` it would leave the chevron sitting right after the
label with dead space before the right edge instead of pinned there as
required. Reverting to `ml-auto` is a one-class fix, not a new behavior —
it's the component's own untouched default being restored. Added
`whitespace-nowrap` to my-listings' trigger too (dev-main's version never had
it, harmless on the old `w-auto` box, now a real safety net against wrap on
the fixed-width box, matching what project-details' trigger already had).

**types:check**: 12/12, 0 new errors. Checkout `period=` confirmed unaffected
(`project-details/[slug]/page.tsx:7253`, untouched). Playwright skipped for
the real page per explicit instruction — the static-HTML measurement above
used Playwright but never touched the Next dev server.

## Follow-up round 5 (2026-11-02) — the price span was still the real culprit

Root cause: the PRICE span (not the connector/trigger, both already fixed in
round 4) still sized to its own content — "$4,070" vs "$105,820" differ in
width, so everything after it (connector, trigger) shifted even though they
were each individually fixed-width.

**Fix, same ghost-reservation pattern as the connector/trigger rounds**, per
the exact template given: `sidebarPricing` (project-details) and a new
`widestBudgetLabel` memo (my-listings) each compute the formatted price
string for every period the listing actually offers (`periodOptions` /
`availableBudgetPeriods`), using the *same* formatting call the visible price
already used (`$${cost.toLocaleString()}` / `formatBudget()` — no new
formatting logic), and keep the longest resulting string. The price span
became `inline-grid` with an `invisible aria-hidden` ghost holding that
string and a `text-right tabular-nums` visible span holding the real price —
`text-right` keeps the digits hugging the connector exactly as before,
`tabular-nums` added to both spans so equal-length prices (e.g. $4,070 vs
$8,140) don't jiggle from proportional digit widths. Connector and trigger
left completely untouched, as instructed.

**Row-fit check — found a real overflow risk, reported rather than fixed**:
measured actual rendered widths (same static-HTML/Playwright technique, no
dev server) at `text-2xl font-bold tabular-nums`: a 6-digit price (`$8,140`)
= 84.23px, a 7-digit price (`$105,820`) = 115.27px. Sidebar inner width =
`w-[390px]` − `p-6` (48px) − border (2px) = **340px**. Row content width =
Badge("Starting At", ≈80px incl. its own padding) + `ml-2`(8) + price + `gap-x-1.5`(6)
+ connector(36, fixed) + `ml-1.5`(6) + trigger(112, fixed):
- 6-digit price: 80+8+84+6+36+6+112 = **332px — fits**, ~8px margin.
- 7-digit price (e.g. a $100k+ per-period cost, which this dataset's own
  seed data already approaches — one sampled project has a $121,272 total
  budget): 80+8+115+6+36+6+112 = **363px — overflows by ~23px**.
Not fixed per the ticket's own explicit instruction ("if it would overflow,
report the numbers instead of shrinking things") — this needs a product
decision (shrink the trigger/connector further, truncate/abbreviate large
prices, or accept wrap/scroll) before any further change here.

**types:check**: 12/12, 0 new errors. Checkout `period=` confirmed
unaffected (now at `project-details/[slug]/page.tsx:7274` after the earlier
lines added by this round's memo addition — still the same untouched
`qs.set("period", selectedPeriod)` call).

## Follow-up round 6 (2026-11-02) — round 5's price ghost rejected and reverted

The `inline-grid`/ghost reservation on the price span (round 5) shifted the
whole row to the right and was rejected on sight. Reverted completely on both
pages: removed `widestPriceLabel` from `sidebarPricing`'s `useMemo` (project-
details) and the standalone `widestBudgetLabel` `useMemo` (my-listings), and
restored the price span to its literal dev-main markup — `<span
className="text-2xl leading-none font-bold text-dark-blue-400">` wrapping the
existing IIFE / `formatBudget()` call, no grid, no ghost, no `tabular-nums`,
no `text-right`. Confirmed via `git diff origin/dev-main` that the price span
now shows **zero diff** from dev-main on both files, and that the diff is
otherwise byte-identical to where round 4 left off before the price-ghost
addition — i.e. the connector (`inline-block w-9 ... leading-5`, `text-xs`
for "every") and the `ListboxButton` (`w-28`, `leading-5`,
`iconClassName="ml-auto"`, `text-xs` "2 weeks" render-prop) from rounds 1–3
are fully intact, untouched by this revert.

The row-fit overflow risk flagged in round 5 (a 7-digit per-period price
would overflow the 340px sidebar) is now moot for THIS change since the
price span is back to its original content-sized behavior — but it was never
an overflow unique to the ghost technique; dev-main's own price span was
always content-sized too, so a 7-digit price has always pushed the row wider
on dev-main. Not a regression introduced or fixed by this ticket either way.

**types:check**: 12/12, 0 new errors.

## Follow-up round 7 (2026-11-02) — back to dev-main/staging look, only 3 deltas allowed

All fixed-width/height work from rounds 4-5 (`w-9`, `w-28`, `leading-5`,
`iconClassName="ml-auto"`) rejected — staging (`origin/dev-main`) is now the
explicit target look. Reverted the connector span and `ListboxButton` back to
dev-main's literal classes on both pages, keeping only the three permitted
deltas: (1) connector text from `PERIOD_PRICE_ROW_CONNECTOR`, `text-xs` for
"every" instead of the old `selectedPeriod === "biweek"` ternary, dev-main's
`leading-none` kept as-is; (2) `ListboxButton` back to `w-auto`/`h-max`/dev-main
padding/`iconClassName="ml-1"`, now showing `PERIOD_WIDGET_LABELS[value]` via
the `children` render-prop (biweek wrapped in a bare `text-xs whitespace-nowrap`
span, no `leading-5`); (3) `ListboxOptions`/menu items unchanged, still
`PERIOD_WIDGET_LABELS` at normal size. This is byte-identical to where round 3
left off, before round 4 added the width/height fixes. `git diff
origin/dev-main` confirms the price span now has **zero diff** on both files.

**types:check**: 12/12, 0 new errors. Checkout `period=` confirmed unaffected
(`project-details/[slug]/page.tsx:7253`, untouched).

Given the back-and-forth across rounds 3-7 (fixed sizing added, then
explicitly rejected twice), the state as of this round is: the row will
resize slightly between periods (dev-main's own original behavior,
reintroduced), but the look matches staging exactly except for the
biweek-specific "every"/"2 weeks" wording and size. Any future "make it not
resize" request should start a fresh conversation with the user about
whether sizing stability is actually wanted, rather than re-attempting the
same stacking/fixed-width techniques already tried and rejected here.
