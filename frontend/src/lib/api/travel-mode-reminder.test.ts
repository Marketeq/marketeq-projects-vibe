// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const flow = read("components", "identity-verification-flow.tsx")
const reminderModule = read("src", "lib", "api", "travel-mode-reminder.ts")

describe("15-second reminder mock is removed", () => {
  it("the module no longer exports or defines a scheduler or a delay", () => {
    assert.ok(!reminderModule.includes("scheduleTravelModeReminderMock"))
    assert.ok(!reminderModule.includes("MOCK_REMINDER_DELAY_MS"))
    assert.ok(!/setTimeout/.test(reminderModule))
  })

  it("the module still owns the TravelDuration type the flow imports", () => {
    assert.match(reminderModule, /export type TravelDuration =/)
    for (const label of ["A few days", "1–2 weeks", "More than 2 weeks", "Not sure"]) {
      assert.ok(reminderModule.includes(`"${label}"`), label)
    }
    assert.ok(flow.includes('import { type TravelDuration } from "@/src/lib/api/travel-mode-reminder"'))
  })

  it("the flow no longer references the mock at all", () => {
    assert.ok(!flow.includes("scheduleTravelModeReminderMock("))
    assert.equal((flow.match(/scheduleTravelModeReminderMock/g) ?? []).length, 1) // only the stale comment
  })

  it("activating Travel Mode no longer opens the reminder on a timer", () => {
    const start = flow.indexOf("const activateTravelMode = () => {")
    const body = flow.slice(start, flow.indexOf("\n  }\n", start))
    assert.ok(!body.includes("setTravelReminderOpen"))
    assert.ok(!body.includes("setTimeout"))
  })
})

describe("what must stay unchanged in the flow", () => {
  it("activation still records the duration and moves to the Travel Mode screen only once it is saved", () => {
    const start = flow.indexOf("const activateTravelMode = async (skipped: boolean) => {")
    const body = flow.slice(start, flow.indexOf("\n  }\n", start))
    assert.ok(body.includes("recordTravelDuration(deps, duration)"))
    assert.ok(body.includes('send("NEXT")'))
    // The next screen waits for the saved duration; a failed save stays on this one.
    assert.ok(body.indexOf("await travelModeDeps()") < body.indexOf('send("NEXT")'))
    assert.ok(body.indexOf("if (!saved) {") < body.indexOf('send("NEXT")'))
  })

  it("the immediate 'Travel mode is on.' confirmation is intact", () => {
    assert.ok(flow.includes("Travel mode is on."))
    assert.ok(flow.includes("You can continue using the platform while away from your home"))
    assert.ok(flow.includes("open={travelModeNotificationOpen}"))
  })

  it("the approved reminder popup markup and its Update action are intact", () => {
    assert.ok(flow.includes("open={travelReminderOpen}"))
    assert.ok(flow.includes("You are in Travel Mode"))
    assert.ok(flow.includes("Update your status if your location changes"))
    assert.match(
      flow,
      /setTravelReminderOpen\(false\)\s+send\("UPDATE_LOCATION"\)\s+onOpenChange\(true\)/
    )
  })

  it("the first-time 'No, I'm currently traveling' button is intact", () => {
    assert.ok(flow.includes("No, I&rsquo;m currently traveling"))
    assert.ok(flow.includes('onClick={() => send("NO")}'))
  })
})
