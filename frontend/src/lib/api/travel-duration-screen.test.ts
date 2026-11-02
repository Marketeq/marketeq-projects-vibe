// Run like travel-location-prompt.test.ts (from the frontend/ directory).
// PMCM-636 / PMCM-639 staging QA: the duration radios, and the Travel Mode screen shown after
// Confirm or Skip. Source guards on the flow, because there is no component test runner.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"

const flow = readFileSync(
  join(process.cwd(), "components", "identity-verification-flow.tsx"),
  "utf8"
)
const durationScreen = flow.slice(
  flow.indexOf('{state === "traveling-showcase"'),
  flow.indexOf('{state === "travel-mode"')
)
const activeScreen = flow.slice(flow.indexOf('{state === "travel-mode"'))

describe("duration radios: clicking the text selects the option", () => {
  const options = [
    ["A few days", "travel-duration-a-few-days"],
    ["1–2 weeks", "travel-duration-1-2-weeks"],
    ["More than 2 weeks", "travel-duration-more-than-2-weeks"],
    ["Not sure", "travel-duration-not-sure"],
  ] as const

  for (const [label, id] of options) {
    it(`"${label}": the radio has id ${id} and its label points at it with htmlFor`, () => {
      assert.ok(durationScreen.includes(`id="${id}"`))
      assert.match(durationScreen, new RegExp(`<Label\\s+htmlFor="${id}"[\\s>]`))
    })
  }

  it("every radio id is unique, and no label carries an id of its own any more", () => {
    const ids = [
      ...durationScreen.matchAll(/<RadioGroupItem[^>]*?id="([^"]+)"/g),
    ].map((m) => m[1])
    assert.equal(ids.length, 4)
    assert.equal(new Set(ids).size, 4)
    assert.ok(!/<Label id=/.test(durationScreen))
    assert.ok(!durationScreen.includes('id="item-'))
  })

  it("the radio group is still driven by the selected duration", () => {
    assert.ok(durationScreen.includes("value={travelDuration ?? undefined}"))
  })

  it("choosing an option clears a previous save error", () => {
    assert.match(
      durationScreen,
      /onValueChange=\{\(value\) => \{\s*setTravelDuration\(value as TravelDuration\)\s*setTravelModeSaveFailed\(false\)/
    )
  })
})

describe("a failed save is shown, not silent", () => {
  it("renders the existing error Alert only after a failed save", () => {
    assert.match(
      durationScreen,
      /\{travelModeSaveFailed && \(\s*<Alert variant="error"/
    )
    assert.ok(
      durationScreen.includes(
        "We couldn&rsquo;t save your travel details. Please try again."
      )
    )
  })
  it("the error sits above the buttons", () => {
    assert.ok(
      durationScreen.indexOf("travelModeSaveFailed &&") <
        durationScreen.indexOf("Skip")
    )
  })
})

describe('"Travel Mode is now active!" screen', () => {
  it("is the only place a first activation ends, and has the Figma title", () => {
    assert.ok(activeScreen.includes("Travel Mode is now active!"))
    assert.match(flow, /"traveling-showcase": \{[\s\S]*?NEXT: "travel-mode"/)
  })
  it("answered duration: unrestricted copy; skipped: limited-features copy", () => {
    assert.match(
      activeScreen,
      /travelDurationSkipped\s*\?\s*"You\u2019re marked as temporarily traveling\. Some features may be limited until you are back in your home country\."\s*:\s*"You\u2019re marked as temporarily traveling\. You can now use the platform without restrictions\."/
    )
  })
  it("states the user stays in Travel Mode until they return or update their location", () => {
    assert.ok(
      activeScreen.includes(
        "You&rsquo;ll remain in Travel Mode until you return to your home"
      )
    )
    assert.ok(activeScreen.includes("country or update your location."))
  })
  it("Done closes the flow, and there is no way back to a second duration", () => {
    assert.ok(activeScreen.includes("onClick={() => onOpenChange(false)}>Done"))
    assert.match(
      flow,
      /"travel-mode": \{\s*UPDATE_LOCATION: "current-location-showcase",\s*\}/
    )
    assert.ok(!/"travel-mode": \{[^}]*BACK/.test(flow))
  })
  it("the old 'Travel mode is on.' toast is no longer opened by Confirm / Skip", () => {
    const start = flow.indexOf(
      "const activateTravelMode = async (skipped: boolean) => {"
    )
    const body = flow.slice(start, flow.indexOf("\n  }\n", start))
    assert.ok(!body.includes("setTravelModeNotificationOpen"))
    assert.ok(!body.includes("onOpenChange"))
  })
})
