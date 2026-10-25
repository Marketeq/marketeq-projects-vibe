// Run like status-alerts.test.ts (from the frontend/ directory).
//
// The Travel Mode alert card is composed inline in the dashboard page (no component file,
// no Storybook edit: frontend/COMPONENTS.md). The page cannot be mounted under node:test,
// so these tests read the card's JSX out of the page source and pin the Figma measurements
// (node 13101-46846), the semantics and the "not a popup" requirement.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"

const page = readFileSync(
  join(__dirname, "../../../app/(group)/talent-dashboard/page.tsx"),
  "utf8"
)
const start = page.indexOf("data-status-alert-stack")
const card = page.slice(
  page.indexOf('data-status-alert="travel_mode"', start) - 120,
  page.indexOf("data-status-alert-error", start)
)
const cardClasses = (marker: string) => {
  const at = card.indexOf(marker)
  assert.ok(at > -1, `${marker} is in the card`)
  const open = card.lastIndexOf("<", at)
  const tag = card.slice(open, card.indexOf(">", at))
  return (tag.match(/className="([^"]*)"/)?.[1] ?? "").split(/\s+/)
}

describe("Travel Mode alert card markup (Figma node 13101-46846)", () => {
  it("is composed from the approved Alert components and IconButton, with the Plane icon", () => {
    for (const tag of [
      "<Alert",
      "<AlertIcon",
      "<AlertContent",
      "<AlertTitle",
      "<AlertDescription",
      "<IconButton",
      "<Plane",
    ]) {
      assert.ok(card.includes(tag), `${tag} is used`)
    }
  })

  it("is an alert card, not a toast, dialog or modal", () => {
    assert.ok(start > -1)
    assert.doesNotMatch(card, /<Toast|<Dialog|<ToastProvider|role="dialog"/)
  })

  it("sits in a fixed top-right overlay outside the dashboard layout, so nothing on the page moves", () => {
    const stack = page.slice(
      page.lastIndexOf("<div", start),
      page.indexOf(">", start)
    )
    const classes = stack.match(/className="([^"]*)"/)![1].split(/\s+/)
    for (const cls of [
      "fixed",
      "md:right-5", // the existing toasts' corner offset (right 20px)
      "md:top-[84px]", // 64px header + 20px
      "md:left-auto",
      "md:w-[400px]",
      "top-[112px]", // phones: 92px two-row header + 20px
      "flex",
      "flex-col",
      "gap-3", // 12px between cards
      "pointer-events-none", // the wrapper never blocks the page
    ]) {
      assert.ok(classes.includes(cls), cls)
    }
    assert.ok(classes.includes("left-4") && classes.includes("right-4"))
    assert.ok(classes.some((c) => /^z-\d+$/.test(c)))
    // In the document flow there would be no "fixed"; and it is rendered before the page
    // layout, so the layout (and its pinned hash) contains no part of it.
    assert.ok(start < page.indexOf("<AuthenticatedRoute>"))
    assert.ok(
      !page
        .slice(page.indexOf("<AuthenticatedRoute>"))
        .includes("data-status-alert")
    )
    assert.ok(!classes.includes("md:mb-8"))
  })

  it("cards take the pointer, are full width on phones and exactly 400px from md up, and never time out", () => {
    const c = cardClasses('data-status-alert="travel_mode"')
    for (const cls of [
      "pointer-events-auto",
      "w-full",
      "max-w-[400px]",
      "md:w-[400px]",
    ])
      assert.ok(c.includes(cls), cls)
    assert.doesNotMatch(card, /duration=|setTimeout|autoHide/)
  })

  it("the card is 400px wide with 16px padding, a 20px icon/text gap, a 12px radius, a #F2F4F7 border and a white fill", () => {
    const c = cardClasses('data-status-alert="travel_mode"')
    for (const cls of [
      "w-full",
      "p-[15px]", // 16px in Figma, over its 1px stroke: 368px content, 98px tall
      "gap-x-5",
      "rounded-xl",
      "border-gray-100", // #F2F4F7
      "bg-white",
    ]) {
      assert.ok(c.includes(cls), cls)
    }
  })

  it("carries the Shadow/lg values", () => {
    assert.match(
      card,
      /shadow-\[0px_12px_16px_-4px_rgba\(16,24,40,0\.08\),0px_4px_6px_-2px_rgba\(16,24,40,0\.03\)\]/
    )
  })

  it("the featured icon is 66px with a 9.9px #F6F8FE border on a #E8EEFF fill and a 24.75px #306CFE glyph", () => {
    const c = cardClasses("<AlertIcon")
    for (const cls of [
      "size-[66px]",
      "border-[9.9px]",
      "border-primary-25", // #F6F8FE
      "bg-primary-50", // #E8EEFF
      "rounded-full",
    ]) {
      assert.ok(c.includes(cls), cls)
    }
    assert.match(card, /<Plane className="size-\[24\.75px\] text-primary-500"/)
  })

  it("the title is 14/600/20 #101828 and the body 14/400/20 #475467, with a 4px gap and 2px top padding", () => {
    const content = cardClasses("<AlertContent")
    assert.ok(content.includes("gap-1") && content.includes("pt-0.5"))
    const title = cardClasses("<AlertTitle")
    for (const cls of [
      "text-sm",
      "font-semibold",
      "leading-5",
      "text-gray-900",
    ])
      assert.ok(title.includes(cls), cls)
    const body = cardClasses("<AlertDescription")
    for (const cls of ["text-sm", "font-normal", "leading-5", "text-gray-600"])
      assert.ok(body.includes(cls), cls)
    // The Alert description's default 4px top margin is removed: the gap above is gap-1.
    assert.ok(body.includes("mt-0"))
  })

  it("renders the persisted title and body, not literals", () => {
    assert.match(card, /\{card\.title\}/)
    assert.match(card, /\{card\.body\}/)
  })

  it("the close button is 36px, sits 8px from the corner, is gray #667085 and has an accessible name", () => {
    const c = cardClasses("<IconButton")
    for (const cls of [
      "size-9",
      "right-[7px]", // 8px from the corner, over the 1px border
      "top-[7px]",
      "absolute",
      "text-gray-500",
    ])
      assert.ok(c.includes(cls), cls)
    assert.match(card, /aria-label=\{STATUS_ALERT_CLOSE_LABEL\}/)
    assert.match(card, /<X className="size-5"/) // 20px icon
  })

  it("the close button is a real button (keyboard focusable) that calls the persistent dismissal", () => {
    assert.match(card, /dismissPersistentAlertOptimistically\(/)
    assert.match(card, /dismiss: StatusAlertsAPI\.dismiss/)
    assert.doesNotMatch(card, /tabIndex=\{-1\}|aria-hidden/)
  })

  it("a failed dismissal shows an error alert and logs, instead of toasting", () => {
    const rest = page.slice(page.indexOf("data-status-alert-error"))
    assert.match(
      rest.slice(0, 500),
      /variant="error"|STATUS_ALERT_DISMISS_ERROR/
    )
    assert.match(card, /setStatusAlertDismissFailed\(true\)/)
  })

  it("only the Travel Mode alert is rendered in this phase", () => {
    assert.match(
      page,
      /statusAlerts\.filter\(\(a\) => a\.type === "travel_mode"\)/
    )
    assert.match(page, /visible\.filter\(isTravelModeAlert\)/)
  })
})
