// Run like status-alerts.test.ts (from the frontend/ directory).
//
// The Travel Mode alert card is composed inline in the identity verification host (no
// component file, no Storybook edit: frontend/COMPONENTS.md; it moved there from the dashboard
// page unchanged so it shows on whatever page a flow was opened over). The host cannot be
// mounted under node:test, so these tests read the card's JSX out of its source and pin the Figma measurements
// (node 13101-46846), the semantics and the "not a popup" requirement.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"

const page = readFileSync(
  join(__dirname, "../../../contexts/identity-verification-host.tsx"),
  "utf8"
)
// The dashboard page still owns the legacy success toasts and the Travel Mode popup that some of
// these tests compare the card with (unchanged there).
const dashboard = readFileSync(
  join(__dirname, "../../../app/(group)/talent-dashboard/page.tsx"),
  "utf8"
)
const start = page.indexOf("data-status-alert-stack")
const card = page.slice(
  page.indexOf("data-status-alert={card.type}", start) - 120,
  page.indexOf("data-status-alert-error", start)
)

// The card markup is shared. The Update button exists only inside the live-card branch, so a
// persistent alert (which renders without it) has no action.
const liveBranch = card.indexOf('card.source === "live" &&')
const assertPersistentHasNoAction = () => {
  assert.ok(liveBranch > -1)
  assert.equal((card.match(/<Button\b/g) ?? []).length, 1)
  assert.ok(card.indexOf("<Button") > liveBranch)
  assert.doesNotMatch(card, /<a\b|<Link\b|href=/)
}
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
    // In the document flow there would be no "fixed"; and it is rendered by the host, outside
    // every page, so the dashboard layout (and its pinned hash) contains no part of it.
    assert.ok(start > -1 && !page.includes("<AuthenticatedRoute>"))
    assert.ok(!dashboard.includes("data-status-alert"))
    assert.ok(!classes.includes("md:mb-8"))
  })

  it("cards take the pointer, are full width on phones and exactly 400px from md up, and never time out", () => {
    const c = cardClasses("data-status-alert={card.type}")
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
    const c = cardClasses("data-status-alert={card.type}")
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

  it("the Travel Mode, submitted-for-review, verified and home-country-updated alerts are the rendered types", () => {
    assert.match(
      page,
      /RENDERED_STATUS_ALERT_TYPES as readonly string\[\]\)\.includes\(a\.type\)/
    )
    assert.match(page, /visible\.filter\(isRenderedAlert\)/)
  })
})

describe("Submitted-for-review alert card (Figma node 13101-47555)", () => {
  it("reuses the Travel Mode card: same Alert composition, picked by type, no second card markup", () => {
    assert.equal(page.split("data-status-alert={card.type}").length - 1, 1)
    assert.match(card, /card\.type === "submitted_for_review"/)
  })

  it("uses the ClockStopwatch icon of the existing Storybook ToastContent story, at 24.75px #306CFE with Figma's +0.38/-0.62 offset", () => {
    assert.match(
      card,
      /<ClockStopwatch className="size-\[24\.75px\] translate-x-\[0\.38px\] -translate-y-\[0\.62px\] text-primary-500" \/>/
    )
    const story = readFileSync(
      join(__dirname, "../../../stories/identity-verfication.stories.tsx"),
      "utf8"
    )
    assert.match(story, /ClockStopwatch/)
    assert.match(story, /Your location verification was submitted\./)
  })

  it("has no action link or button: the dismiss control is the only interactive element", () => {
    assert.equal((card.match(/<IconButton/g) ?? []).length, 1)
    assertPersistentHasNoAction()
  })

  it("the alert's text is the Figma copy, sent by the backend with this exact capitalization and punctuation", () => {
    const copy = readFileSync(
      join(
        __dirname,
        "../../../../backend/apps/identity-verification-service/src/events/status-alert-copy.ts"
      ),
      "utf8"
    )
    assert.match(copy, /title: 'Your location verification was submitted\.'/)
    assert.match(copy, /body: 'We will notify you once it is reviewed\.'/)
  })
})

describe("Verified alert card (Figma node 13101-47566)", () => {
  it("is the same single card markup, with the CheckCircle icon of the existing 'All set!' toast at Figma's offset", () => {
    assert.equal(page.split("data-status-alert={card.type}").length - 1, 1)
    assert.match(card, /card\.type === "verified"/)
    assert.match(
      card,
      /<CheckCircle className="size-\[24\.75px\] translate-x-\[0\.38px\] -translate-y-\[0\.62px\] text-primary-500" \/>/
    )
    // The existing toast uses the same icon with the same offsets (reused, unchanged).
    assert.match(
      dashboard,
      /<CheckCircle className="size-\[24\.75px\] translate-x-\[0\.38px\] -translate-y-\[0\.62px\] text-primary-500" \/>[\s\S]*All set! Your identity and location are verified\./
    )
  })

  it("renders the verified type and has no action: the dismiss control is the only button", () => {
    assert.match(page, /RENDERED_STATUS_ALERT_TYPES/)
    assert.equal((card.match(/<IconButton/g) ?? []).length, 1)
    assertPersistentHasNoAction()
  })

  it("the backend sends the exact Figma copy", () => {
    const copy = readFileSync(
      join(
        __dirname,
        "../../../../backend/apps/identity-verification-service/src/events/status-alert-copy.ts"
      ),
      "utf8"
    )
    assert.match(
      copy,
      /title: 'All set! Your identity and location are verified\.'/
    )
    assert.match(copy, /body: 'You now have full access to all features\.'/)
  })
})

describe("Home Country Updated alert card (Figma node 13101-47577)", () => {
  it("is the same single card markup, with the MarkerPin01 icon of the existing home-country toast at Figma's offset", () => {
    assert.equal(page.split("data-status-alert={card.type}").length - 1, 1)
    assert.match(card, /card\.type === "home_country_updated"/)
    assert.match(
      card,
      /<MarkerPin01 className="size-\[24\.75px\] translate-x-\[0\.38px\] -translate-y-\[0\.62px\] text-primary-500" \/>/
    )
    // The existing toast (kept unchanged) uses the same icon and offsets.
    assert.match(
      dashboard,
      /<MarkerPin01 className="size-\[24\.75px\] translate-x-\[0\.38px\] -translate-y-\[0\.62px\] text-primary-500" \/>[\s\S]*HOME_COUNTRY_UPDATED_ALERT\.title/
    )
  })

  it("has no action: the dismiss control is the only button", () => {
    assert.equal((card.match(/<IconButton/g) ?? []).length, 1)
    assertPersistentHasNoAction()
  })

  it("the backend sends the Figma copy from one source shared with the in-app notification", () => {
    const publisher = readFileSync(
      join(
        __dirname,
        "../../../../backend/apps/identity-verification-service/src/events/home-country-updated-notification.publisher.ts"
      ),
      "utf8"
    )
    assert.match(
      publisher,
      /HOME_COUNTRY_UPDATED_NOTIFICATION_TITLE = 'Your home country was updated\.'/
    )
    assert.match(
      publisher,
      /You can continue using the platform while away from your home\s+country\.'|'You can continue using the platform while away from your home country\.'/
    )
  })
})

describe("Live Travel Mode card (Figma node 13101-47532)", () => {
  it("is the same single card markup, with the Plane icon at Figma's +0.38/+0.38 offset", () => {
    assert.equal(page.split("data-status-alert={card.type}").length - 1, 1)
    assert.match(card, /card\.type === "travel_mode_ongoing"/)
    assert.match(
      card,
      /<Plane className="size-\[24\.75px\] translate-x-\[0\.38px\] translate-y-\[0\.38px\] text-primary-500" \/>/
    )
  })

  it("has the existing popup's Update action: a link-variant Button, 14/600/20, 16px under the text", () => {
    const branch = card.slice(liveBranch)
    assert.match(branch, /<Button\s+variant="link"/)
    for (const cls of [
      "mt-3",
      "h-5",
      "p-0",
      "text-sm",
      "font-semibold",
      "leading-5",
    ])
      assert.ok(branch.includes(cls), cls)
    assert.match(branch, /\{card\.actionLabel\}/)
    // The existing popup's Update button (reused styling, unchanged).
    assert.match(
      dashboard,
      /variant="link"\s+className="h-5 justify-start p-0 text-sm font-semibold leading-5"\s+onClick=\{\(\) => void handleTravelUpdate\(\)\}/
    )
  })

  it("Update opens the existing flow through the existing handler and is not a dismissal", () => {
    assert.match(card, /handleLiveTravelUpdate\(\)/)
    // On the dashboard it is the page's own handler (it hides its popup first); the host calls it.
    assert.match(
      dashboard,
      /const handleLiveTravelUpdate = useCallback\(\s*\(\) => handleTravelUpdate\("reminder"\),\s*\[handleTravelUpdate\]\s*\)/
    )
    assert.match(page, /const pageHandler = observerRef\.current\?\.handleLiveTravelUpdate\s+if \(pageHandler\) return pageHandler\(\)/)
    for (const source of [dashboard, page]) {
      const at = source.indexOf("const handleLiveTravelUpdate")
      assert.doesNotMatch(source.slice(at, at + 900), /dismiss|localStorage|StatusAlertsAPI/i)
    }
  })

  it("the X on a live card never calls the persistent dismissal endpoint", () => {
    assert.match(
      card,
      /card\.source === "live"[\s\S]*handleDismissLiveAlert\(card\)[\s\S]*return[\s\S]*dismissPersistentAlertOptimistically/
    )
    const live = page.slice(
      page.indexOf("const handleDismissLiveAlert"),
      page.indexOf("const handleDismissLiveAlert") + 400
    )
    assert.doesNotMatch(
      live,
      /StatusAlertsAPI|dismissPersistentAlertOptimistically/
    )
  })

  it("is derived from the identity summary, not fetched: nothing live until the summary is read", () => {
    assert.match(
      page,
      /travelSummary \? liveLoginKey \?\? "unkeyed" : undefined/
    )
    assert.match(
      page,
      /travelSummary && !liveAlertsHeld\s+\? isTravelModeInForce\(travelSummary\)\s+: undefined/
    )
    assert.match(page, /travelModeActivatedAt: null,\s+\}\)/)
  })

  it("any ordinary flow closing re-reads the summary, so a completed change removes the card (see travel-flow-completion-alerts.test.ts)", () => {
    // the dashboard's own close handler, and the host's default for every other page
    assert.match(
      dashboard,
      /if \(!open && kind === null\) \{[\s\S]*fetchIdentityVerificationSummary\(\)\.then\(\(fresh\) => \{\s+if \(fresh\) setTravelSummary\(fresh\)/
    )
    assert.match(
      page,
      /else if \(!open\) \{[\s\S]*fetchIdentityVerificationSummary\(\)\.then\(\(fresh\) => \{\s+if \(fresh\) setTravelSummary\(fresh\)/
    )
  })

  it("the copy is Figma's, in one place", () => {
    const copy = readFileSync(join(__dirname, "status-alert-copy.ts"), "utf8")
    assert.match(copy, /title: "You are in Travel Mode"/)
    assert.match(copy, /body: "Update your status if your location changes"/)
    assert.match(copy, /actionLabel: "Update"/)
  })
})
