// Run: npx tsc src/lib/api/location-mismatch.test.ts --outDir <tmp> --module commonjs
//   --target es2020 --skipLibCheck --esModuleInterop --types node --lib es2020,dom
//   && (cd frontend && node --test <tmp>)   # run from the frontend/ directory
// The countries are decided by the backend (its own spec mocks them); here the page only
// reacts to the backend's locationMismatch answer.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import type { DetectedLocation } from "./detected-location"
import { shouldShowProfileBanner } from "./identity-next-step"
import { parseIdentityVerificationSummary } from "./identity-verification-state"
import {
  type MismatchDeps,
  shouldShowLocationMismatchPrompt,
  startChangeHomeCountry,
  startStillTraveling,
} from "./location-mismatch"
import { readDashboardWithHost } from "./dashboard-host-source"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const page = readDashboardWithHost()
const flow = read("components", "identity-verification-flow.tsx")
const helper = read("src", "lib", "api", "location-mismatch.ts")

const summary = (body: Record<string, unknown>) =>
  parseIdentityVerificationSummary(body)
const complete = { nextAction: "complete", fullyVerified: true }

const LOCATION: DetectedLocation = {
  city: "Berlin",
  region: "Berlin",
  countryCode: "DE",
  countryName: "Germany",
  latitude: null,
  longitude: null,
  detected: true,
  serviceUnavailable: false,
}

const deps = (failLocation = false) => {
  const calls: string[] = []
  const d: MismatchDeps = {
    getDetectedLocation: async () => {
      calls.push("detected-location")
      if (failLocation) throw new Error("offline")
      return LOCATION
    },
  }
  return { d, calls }
}

describe("locationMismatch mapping", () => {
  it("maps true and false exactly as sent", () => {
    assert.equal(
      summary({ ...complete, locationMismatch: true })?.locationMismatch,
      true
    )
    assert.equal(
      summary({ ...complete, locationMismatch: false })?.locationMismatch,
      false
    )
  })

  it("is null when absent or not a boolean, never inferred", () => {
    assert.equal(summary(complete)?.locationMismatch, null)
    assert.equal(
      summary({ ...complete, locationMismatch: "true" })?.locationMismatch,
      null
    )
    assert.equal(
      summary({ ...complete, locationMismatch: 1 })?.locationMismatch,
      null
    )
  })
})

describe("when the prompt shows", () => {
  it("shows for a returning, verified user the backend flags", () => {
    assert.equal(
      shouldShowLocationMismatchPrompt(
        summary({ ...complete, locationMismatch: true })
      ),
      true
    )
  })

  it("does not show when the backend says false, says nothing, or is unavailable", () => {
    assert.equal(
      shouldShowLocationMismatchPrompt(
        summary({ ...complete, locationMismatch: false })
      ),
      false
    )
    assert.equal(shouldShowLocationMismatchPrompt(summary(complete)), false)
    assert.equal(shouldShowLocationMismatchPrompt(null), false)
  })

  it("a first-time unverified user gets the banner, never the mismatch popup, even without the auto-opening gate", () => {
    for (const nextAction of ["confirm_location", "start_identity"]) {
      for (const locationMismatch of [false, true]) {
        const first = summary({ nextAction, fullyVerified: false, locationMismatch })
        assert.equal(shouldShowProfileBanner(first), true, nextAction)
        assert.equal(shouldShowLocationMismatchPrompt(first), false, `${nextAction}/${locationMismatch}`)
      }
    }
    const load = page.slice(
      page.indexOf("const runIdentityVerificationCheck"),
      page.indexOf("// Reads the persistent alerts on load")
    )
    assert.ok(load.includes("setProfileBannerShown(shouldShowProfileBanner(summary))"))
    assert.ok(!load.includes("setVerificationGateOpen"))
  })

  it("never competes with the first-time gate", () => {
    for (const nextAction of ["confirm_location", "start_identity"]) {
      assert.equal(
        shouldShowLocationMismatchPrompt(
          summary({ nextAction, locationMismatch: true })
        ),
        false
      )
    }
  })

  it("never competes with the three-attempts dialog", () => {
    const waiting = {
      nextAction: "wait_for_retry",
      retryAvailableAt: "2026-10-07T00:38:53.000Z",
      locationMismatch: true,
    }
    assert.equal(shouldShowLocationMismatchPrompt(summary(waiting)), false)
  })
})

describe("I’m still traveling (returning user, no Travel Mode in force)", () => {
  it("opens the existing duration screen and saves NOTHING (only the display lookup runs)", async () => {
    const { d, calls } = deps()
    const launch = await startStillTraveling(d)
    assert.deepEqual(calls, ["detected-location"])
    assert.equal(launch.initialState, "traveling-showcase")
    assert.equal(launch.location, LOCATION)
  })

  it("a failed lookup rejects, so the page keeps the prompt open to try again", async () => {
    const { d } = deps(true)
    await assert.rejects(startStillTraveling(d))
  })
})

describe("Change my home country", () => {
  it("opens the existing flow from the top and saves NOTHING", async () => {
    const { d, calls } = deps()
    const launch = await startChangeHomeCountry(d)
    assert.deepEqual(calls, ["detected-location"])
    assert.equal(launch.initialState, undefined)
    assert.equal(launch.location, LOCATION)
  })

  it("a failed lookup rejects, so the page keeps the prompt open to try again", async () => {
    const { d } = deps(true)
    await assert.rejects(startChangeHomeCountry(d))
  })
})

describe("page wiring and approved copy (Storybook ChangeLocation)", () => {
  const start = page.indexOf("open={locationMismatchOpen || travelerPromptOpen}")
  const dialog = page.slice(
    page.lastIndexOf("<Dialog", start),
    page.indexOf("</Dialog>", start)
  )

  it("uses the Storybook copy and the two answers", () => {
    assert.ok(
      dialog.includes(
        "You’re logging in from a location outside your usual one. Just"
      )
    )
    assert.ok(dialog.includes("checking if you’re still away."))
    assert.match(
      dialog,
      /void handleStillTraveling\(\)[\s\S]*I’m still traveling/
    )
    assert.match(
      dialog,
      /onClick=\{\(\) => void handleChangeHomeCountry\(\)\}[\s\S]*Change my home country/
    )
  })

  it("is built from design-system parts only", () => {
    assert.ok(!/<(button|input|dialog|textarea|select)\b/.test(dialog))
  })

  it("is driven only by the backend answer, from the existing status read", () => {
    assert.ok(
      page.includes(
        "setLocationMismatchOpen(shouldShowLocationMismatchPrompt(summary))"
      )
    )
    assert.ok(!/localStorage|sessionStorage|document\.cookie/.test(helper))
  })

  it("reuses the existing flow: remount key, server location, no new flow code", () => {
    // The host remounts the flow (new key) and takes the server location; the page asks it to.
    assert.match(
      page,
      /openFlow\(\s*\{ initialState: launch\.initialState \},\s*\{ detectedLocation: launch\.location \}\s*\)/
    )
    // Only "Change my home country" asks for the browser position (an explicit click, the
    // same load as Verify My Account); "still traveling" shows no location and asks nothing.
    const stillTraveling = helper.slice(
      helper.indexOf("export async function startStillTraveling"),
      helper.indexOf("export async function startChangeHomeCountry")
    )
    const changeCountry = helper.slice(helper.indexOf("export async function startChangeHomeCountry"))
    assert.ok(!stillTraveling.includes("useBrowserLocation"))
    assert.ok(changeCountry.includes("useBrowserLocation: true"))
  })
})

describe("the first-time flow is preserved", () => {
  it("keeps the first-time screens and options exactly", () => {
    assert.ok(flow.includes("No, I&rsquo;m currently traveling"))
    assert.ok(flow.includes("Yes, this is my home country"))
    assert.ok(flow.includes("Tell us more about you current location"))
    assert.ok(flow.includes("Temporarily traveling"))
    assert.ok(flow.includes("Permanently relocated"))
    assert.ok(flow.includes("How long are you traveling?"))
  })

  it("never opens the blocking gate on load, and leaves the Verify My Account path as it was", () => {
    assert.ok(!page.includes("shouldOpenFirstTimeGate"))
    assert.ok(
      page.includes("const handleVerifyMyAccount = useCallback(async () => {")
    )
  })
})
