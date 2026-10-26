// Run like travel-update-flow.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"

import { isTravelModeInForce } from "./travel-popup"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const flow = read("components", "identity-verification-flow.tsx")
const page = read("app", "(group)", "talent-dashboard", "page.tsx")

// The /me fields the backend sends (profile-status.response.dto.ts): an end time exists only
// for a valid activation, and the expired flag is false until that end time passes.
const verifiedTraveler = { fullyVerified: true, travelModeEndsAt: "2026-10-13T22:43:01.000Z", travelModeExpired: false }
const unverifiedTraveler = { fullyVerified: false, travelModeEndsAt: "2026-10-13T22:43:01.000Z", travelModeExpired: false }

// The REAL handlers of the two choices on "Tell us more about your current location",
// executed with recording stubs (same technique as travel-update-flow.test.ts).
function handlerBefore(marker: string): string {
  const at = flow.indexOf(marker)
  assert.ok(at > -1, marker)
  const start = flow.lastIndexOf("onClick={() => {", at) + "onClick={() => {".length
  return flow.slice(start, flow.indexOf("\n              }}", start))
}
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
function run(body: string, activeTravelModeUpdate: boolean) {
  const calls: string[] = []
  const stubs = {
    activeTravelModeUpdate,
    persistTravelClassification: (c: string) => calls.push(`persist:${c}`),
    send: (event: string) => calls.push(`send:${event}`),
    setTravelModeNotificationOpen: (v: boolean) => calls.push(`confirmation:${v}`),
    onOpenChange: (v: boolean) => calls.push(`open:${v}`),
    onTravelModeConfirmed: () => calls.push("confirmed"),
  }
  stubs.relocatingRef = { current: false }
  stubs.onPermanentlyRelocated = undefined
  stubs.getIsMounted = () => true
  new AsyncFunction(...Object.keys(stubs), body)(...Object.values(stubs))
  return calls
}
const temporarily = handlerBefore('Nothing is saved here: closing before a duration is chosen')
// "Permanently relocated" is the flow's handlePermanentlyRelocated; without the optional
// onPermanentlyRelocated prop (every non-Update caller) it is the same two synchronous steps.
const relocatedAt = flow.indexOf("const handlePermanentlyRelocated = async () => {")
const relocated = flow.slice(
  relocatedAt + "const handlePermanentlyRelocated = async () => {".length,
  flow.indexOf("\n  }\n", relocatedAt)
)

describe("isTravelModeInForce", () => {
  it("is true for a valid, unended activation (verified or not)", () => {
    assert.equal(isTravelModeInForce(verifiedTraveler), true)
    assert.equal(isTravelModeInForce(unverifiedTraveler), true)
  })
  it("is false for no activation, an ended one, an unreadable /me, or unknown fields", () => {
    assert.equal(isTravelModeInForce({ travelModeEndsAt: null, travelModeExpired: false }), false)
    assert.equal(isTravelModeInForce({ travelModeEndsAt: "2026-10-01T00:00:00.000Z", travelModeExpired: true }), false)
    assert.equal(isTravelModeInForce({ travelModeEndsAt: "2026-10-13T00:00:00.000Z", travelModeExpired: null }), false)
    assert.equal(isTravelModeInForce(null), false)
  })
})

describe("Verify My Account launches the flow with the traveler's real state", () => {
  const verify = page.slice(page.indexOf("const handleVerifyMyAccount"), page.indexOf("// Travel Mode expiry popup"))

  it("derives the flag from the /me summary re-read in the same call, not from stale state", () => {
    assert.ok(verify.includes("const summary = await fetchIdentityVerificationSummary()"))
    assert.ok(verify.includes("const activeTravelModeUpdate = isTravelModeInForce(summary)"))
  })
  it("sets the flag only when Travel Mode is in force, and remounts the flow when it changes", () => {
    assert.ok(verify.includes("Boolean(prev.activeTravelModeUpdate) !== activeTravelModeUpdate"))
    assert.ok(verify.includes("...(activeTravelModeUpdate ? { activeTravelModeUpdate } : {})"))
  })
  it("passes the flag to the one flow instance, with no second code path", () => {
    assert.ok(page.includes("activeTravelModeUpdate={flowLaunch.activeTravelModeUpdate}"))
    assert.equal((page.match(/<IdentityVerificationFlow/g) ?? []).length, 1)
  })
})

describe("active traveler (verified or unverified) → Temporarily traveling", () => {
  for (const [label, summary] of [["verified", verifiedTraveler], ["unverified", unverifiedTraveler]] as const) {
    it(`${label}: no duration screen, no write, exactly one confirmation reported (onTravelModeConfirmed), flow closes`, () => {
      const calls = run(temporarily, isTravelModeInForce(summary))
      assert.deepEqual(calls, ["confirmation:true", "confirmed", "open:false"])
    })
  }
  it("the period and reminders are untouched: no classification, duration or update call exists on that path", () => {
    assert.ok(!temporarily.includes("activateTravelMode"))
    const branch = temporarily
    assert.ok(!branch.includes("recordTravel") && !branch.includes("IdentityVerificationAPI"))
    assert.equal((flow.match(/IdentityVerificationAPI\.recordTravelDuration\(/g) ?? []).length, 1)
  })
})

describe("first-time activation is unchanged", () => {
  it("no activation → flag false → saves nothing and goes on to the duration screen", () => {
    const calls = run(temporarily, isTravelModeInForce({ travelModeEndsAt: null, travelModeExpired: false }))
    assert.deepEqual(calls, ["send:NEXT"])
  })
  it("an expired Travel Mode also starts a new period through the duration screen", () => {
    const calls = run(temporarily, isTravelModeInForce({ travelModeEndsAt: "2026-10-01T00:00:00.000Z", travelModeExpired: true }))
    assert.deepEqual(calls, ["send:NEXT"])
  })
})

describe("Permanently relocated keeps its home-country flow for an active traveler", () => {
  it("records the relocation and returns to the home-country steps", () => {
    assert.deepEqual(run(relocated, isTravelModeInForce(verifiedTraveler)), ["persist:permanently_relocated", "send:RELOCATED"])
    assert.deepEqual(run(relocated, isTravelModeInForce(unverifiedTraveler)), ["persist:permanently_relocated", "send:RELOCATED"])
  })
})
