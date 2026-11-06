// Run like travel-duration-screen.test.ts (from the frontend/ directory).
// BTB-401: for a Travel Mode that is already in force, the duration screen's Confirm / Skip must
// restart the period with POST /travel-duration/update; the first-time activation keeps
// POST /travel-duration (the backend refuses a second activation with 409).
// Source guards plus a behavioural run of the flow's own `travelModeDeps` and
// `activateTravelMode` bodies (there is no component test runner).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  recordTravelDuration,
  SKIPPED_TRAVEL_DURATION_LABEL,
} from "./travel-mode-backend"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const flow = read("components", "identity-verification-flow.tsx")
const http = read("service", "http", "identity-verification.ts")
const host = read("contexts", "identity-verification-host.tsx")

// Runs the flow's real travelModeDeps body against a fake API and returns the endpoint log.
function depsFor(activeTravelModeInForce: boolean | undefined, log: string[], fail = false) {
  const signature = "const travelModeDeps = async (): Promise<TravelModeDeps> => {"
  const start = flow.indexOf(signature)
  const body = flow.slice(start + signature.length, flow.indexOf("\n  }\n", start))
  const IdentityVerificationAPI = {
    recordTravelClassification: async () => undefined,
    recordTravelDuration: async (d: string) => {
      log.push(`POST /travel-duration ${d}`)
      if (fail) throw new Error("409")
    },
    reviseActiveTravelDuration: async (d: string) => {
      log.push(`POST /travel-duration/update ${d}`)
      if (fail) throw new Error("409")
    },
  }
  const fn = new Function(
    "activeTravelModeInForce",
    "IdentityVerificationAPI",
    `const __imp = async () => ({ IdentityVerificationAPI });
     return (async () => { ${body.replace(
       /await import\(\s*"@\/service\/http\/identity-verification"\s*\)/,
       "await __imp()"
     )} })()`
  )
  return fn(activeTravelModeInForce, IdentityVerificationAPI) as Promise<{
    recordTravelDuration: (d: never) => Promise<unknown>
  }>
}

describe("active Travel Mode: Confirm / Skip use /travel-duration/update", () => {
  it("Confirm sends the selected duration to the update endpoint, not the activation", async () => {
    const log: string[] = []
    const deps = await depsFor(true, log)
    assert.equal(await recordTravelDuration(deps as never, "1–2 weeks"), true)
    assert.deepEqual(log, ["POST /travel-duration/update one_to_two_weeks"])
  })

  it("Skip sends the existing not_sure default to the update endpoint", async () => {
    const log: string[] = []
    const deps = await depsFor(true, log)
    assert.equal(await recordTravelDuration(deps as never, SKIPPED_TRAVEL_DURATION_LABEL), true)
    assert.deepEqual(log, ["POST /travel-duration/update not_sure"])
  })

  it("a first-time traveler (flag false or unset) still uses POST /travel-duration", async () => {
    for (const flag of [false, undefined]) {
      const log: string[] = []
      const deps = await depsFor(flag, log)
      await recordTravelDuration(deps as never, "A few days")
      assert.deepEqual(log, ["POST /travel-duration a_few_days"])
    }
  })

  it("a failed update resolves false, so the screen stays open with its existing error", async () => {
    const log: string[] = []
    const deps = await depsFor(true, log, true)
    assert.equal(await recordTravelDuration(deps as never, "A few days"), false)
    assert.deepEqual(log, ["POST /travel-duration/update a_few_days"])
  })

  it("the update call is the no-checkInAt revision: it sends only the duration", () => {
    const revise = http.slice(http.indexOf("reviseActiveTravelDuration:"))
    assert.ok(
      revise
        .slice(0, 400)
        .includes('"/v1/identity-verification/travel-duration/update", {\n      duration,\n    }')
    )
  })
})

describe("BTB-401 wiring (source guards)", () => {
  it("Confirm and Skip still share one handler with its double-click guard and loading release", () => {
    const start = flow.indexOf("const activateTravelMode = async (skipped: boolean)")
    const body = flow.slice(start, flow.indexOf("// Guards against a second capture", start))
    assert.ok(body.includes("if (activatingTravelModeRef.current) return"))
    assert.ok(body.includes("recordTravelDuration(deps, duration)"))
    assert.ok(body.includes("activatingTravelModeRef.current = false"))
    assert.ok(body.includes("setActivatingTravelMode(false)"))
    assert.ok(body.includes("setActivatingTravelAction(null)"))
    assert.ok(body.includes("setTravelModeSaveFailed(true)"))
    assert.ok(flow.includes("We couldn&rsquo;t save your travel details. Please try again."))
  })

  it("the host derives the flag from its /me summary; the live-card toast-and-close is untouched", () => {
    assert.ok(host.includes("activeTravelModeInForce={isTravelModeInForce(travelSummary)}"))
    assert.ok(flow.includes("if (activeTravelModeUpdate) {\n                  setTravelModeNotificationOpen(true)"))
  })
})
