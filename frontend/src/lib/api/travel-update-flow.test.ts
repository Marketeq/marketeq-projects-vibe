// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const flow = read("components", "identity-verification-flow.tsx")

// The REAL handler code of the two choices on "Tell us more about your current location",
// cut out of the flow's source and executed with recording stubs. If the code ever
// references anything else, running it throws and the test fails.
function handlerBefore(marker: string): string {
  const at = flow.indexOf(marker)
  assert.ok(at > -1, marker)
  const start = flow.lastIndexOf("onClick={() => {", at) + "onClick={() => {".length
  return flow.slice(start, flow.indexOf("\n              }}", start))
}
function run(body: string, activeTravelModeUpdate: boolean | undefined) {
  const calls: string[] = []
  const stubs = {
    activeTravelModeUpdate,
    persistTravelClassification: (c: string) => calls.push(`persist:${c}`),
    send: (event: string) => calls.push(`send:${event}`),
    setTravelModeNotificationOpen: (v: boolean) => calls.push(`confirmation:${v}`),
    onOpenChange: (v: boolean) => calls.push(`open:${v}`),
    onTravelModeConfirmed: () => calls.push("confirmed"),
  }
  new Function(...Object.keys(stubs), body)(...Object.values(stubs))
  return calls
}
const temporarily = handlerBefore('Nothing is saved here: closing before a duration is chosen')
const relocated = handlerBefore('persistTravelClassification("permanently_relocated")')

describe("active reminder → Temporarily traveling", () => {
  const calls = run(temporarily, true)

  it("does not show the duration screen (no NEXT transition)", () => {
    assert.ok(!calls.includes("send:NEXT"))
    assert.deepEqual(calls.filter((c) => c.startsWith("send:")), [])
  })

  it("makes no API call at all: no classification write and (therefore) no duration endpoint", () => {
    assert.deepEqual(calls.filter((c) => c.startsWith("persist:")), [])
  })

  it("closes the flow and shows the existing 'Travel mode is on.' confirmation", () => {
    assert.deepEqual(calls, ["confirmation:true", "confirmed", "open:false"])
    assert.ok(flow.includes("Travel mode is on."))
    assert.ok(flow.includes("open={travelModeNotificationOpen}"))
  })

  it("introduces no copy or UI: the new code is only the branch", () => {
    assert.ok(!/["'`>][A-Z][a-z]+ [a-z]+/.test(temporarily.replace(/\/\/.*$/gm, "")))
  })
})

describe("expired popup and first-time → Temporarily traveling: unchanged", () => {
  for (const [label, flag] of [["flag unset (first-time)", undefined], ["flag false (expired)", false]] as const) {
    it(`${label}: saves nothing and goes on to the duration screen`, () => {
      assert.deepEqual(run(temporarily, flag), ["send:NEXT"])
    })
  }

  it("the duration screen is still reached, and still the only place a duration is submitted", () => {
    assert.match(flow, /"current-location-showcase": \{[\s\S]*?NEXT: "traveling-showcase"/)
    assert.ok(flow.includes("How long are you traveling?"))
    // one call site of the duration helper, and one place that wires it to the endpoint
    assert.equal((flow.match(/recordTravelDuration\(deps,/g) ?? []).length, 1)
    assert.equal((flow.match(/IdentityVerificationAPI\.recordTravelDuration\(/g) ?? []).length, 1)
    const activate = flow.slice(flow.indexOf("const activateTravelMode"), flow.indexOf("const capturingRef"))
    assert.ok(activate.includes("recordTravelDuration(deps, duration)"))
    assert.equal((flow.match(/onClick=\{\(\) => void activateTravelMode\((true|false)\)\}/g) ?? []).length, 2) // Skip and Confirm
  })

  it("the active branch can never reach activateTravelMode", () => {
    const branch = temporarily
    assert.ok(!branch.includes("activateTravelMode"))
    assert.ok(!branch.includes("recordTravelDuration"))
  })
})

describe("Permanently relocated keeps the existing relocation flow in every mode", () => {
  for (const flag of [true, false, undefined]) {
    it(`flag ${String(flag)}: records the relocation and goes back through the home-country steps`, () => {
      assert.deepEqual(run(relocated, flag), ["persist:permanently_relocated", "send:RELOCATED"])
    })
  }
  it("RELOCATED still returns to the start of the flow", () => {
    assert.match(flow, /"current-location-showcase": \{[\s\S]*?RELOCATED: "ideal"/)
  })
})

describe("the protected flow changed only as approved", () => {
  it("the new prop appears exactly three times in code: destructured, typed and branched on", () => {
    const code = flow
      .split("\n")
      .filter((line) => !/^\s*\/\//.test(line))
      .join("\n")
    assert.equal((code.match(/activeTravelModeUpdate/g) ?? []).length, 3)
    // PMCM-651 (explicitly approved exception): one optional additive prop, onTravelModeConfirmed,
    // sits between them; see travel-mode-confirmation.test.ts for exactly where it is called.
    assert.ok(code.includes("  activeTravelModeUpdate,\n  onTravelModeConfirmed,\n  simulateUploadForPreview,"))
    assert.ok(code.includes("  activeTravelModeUpdate?: boolean"))
    assert.ok(code.includes("if (activeTravelModeUpdate) {"))
  })

  it("the start screen is still read once from initialState, defaulting to the first screen", () => {
    assert.ok(flow.includes('initialState ?? "ideal"'))
    assert.match(flow, /initialState\?: FlowState/)
  })

  it("first-time Travel Mode is unchanged: the 'No, I'm currently traveling' option still opens the same screen", () => {
    assert.ok(flow.includes("No, I&rsquo;m currently traveling"))
    assert.match(flow, /ideal: \{[\s\S]*?NO: "current-location-showcase"/)
  })

  it("the flow's own reminder toast and its Update action are untouched", () => {
    assert.ok(flow.includes("open={travelReminderOpen}"))
    assert.match(flow, /setTravelReminderOpen\(false\)\s+send\("UPDATE_LOCATION"\)\s+onOpenChange\(true\)/)
  })

  it("the Didit start from 'Yes, this is my home country' is untouched", () => {
    assert.ok(flow.includes("onClick={() => void handleHomeCountryYes()}"))
    assert.ok(flow.includes("Yes, this is my home country"))
  })
})
