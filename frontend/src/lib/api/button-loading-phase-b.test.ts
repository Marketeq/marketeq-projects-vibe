// Run like status-alerts.test.ts (from the frontend/ directory).
//
// Button loading states, Phase B: the shared verification components (approved edits to the two
// protected files). Source-pinned like the neighbouring tests: it fixes WHICH buttons got a loading
// state, how, and what deliberately did not change. The behaviour of the handlers themselves
// (Confirm/Skip, Permanently relocated) is run in travel-location-prompt.test.ts and
// travel-update-relocated-detection.test.ts.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { gateWithoutLoadingUi } from "./gate-loading-ui"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const gate = read("components", "account-verification-gate.tsx")
const flow = read("components", "identity-verification-flow.tsx")
const host = read("contexts", "identity-verification-host.tsx")
const count = (s: string, needle: string) => s.split(needle).length - 1

describe("gate: Verify My Account", () => {
  const verify = gate.slice(gate.indexOf("onClick={onVerify}") - 80, gate.indexOf("</Button>", gate.indexOf("onClick={onVerify}")))
  it("uses the shared Button's loading prop while the check runs, with local aria-busy and the unchanged label", () => {
    assert.match(verify, /disabled=\{connectionCheckState === "checking"\}\s+loading=\{connectionCheckState === "checking"\}\s+aria-busy=\{connectionCheckState === "checking"\}/)
    assert.ok(verify.includes("Verify My Account"))
    assert.ok(!gate.includes("Checking..."))
  })
  it("keeps the existing disabled condition and reserves room for the spinner", () => {
    assert.ok(verify.includes('disabled={connectionCheckState === "checking"}'))
    assert.ok(verify.includes('className="min-w-[178px]"'))
  })
})

describe("gate: Retry", () => {
  const retry = gate.slice(gate.indexOf("onClick={onRetryConnectionCheck}") - 260, gate.indexOf("</Button>", gate.indexOf("onClick={onRetryConnectionCheck}")))
  it("the refresh icon moved into leftIcon, so the spinner replaces it and both never show", () => {
    assert.ok(retry.includes('leftIcon={<RefreshCw className="size-[15px]" />}'))
    assert.equal(count(gate, "<RefreshCw"), 1)
    assert.match(retry, /loading=\{retrying\}\s+aria-busy=\{retrying\}/)
    assert.ok(retry.includes("Retry"))
  })
  it("`retrying` is optional and false by default, so every existing caller behaves as before", () => {
    assert.ok(gate.includes("retrying = false,"))
    assert.ok(gate.includes("retrying?: boolean"))
  })
  it("only the host's standard gate passes it, and only while a retry from the error presentation runs", () => {
    assert.equal(count(host, "retrying={"), 1)
    assert.ok(host.includes('retrying={retryingFromUnavailable && connectionCheckState === "checking"}'))
    for (const file of [
      ["app", "transfer-funds", "page.tsx"],
      ["components", "withdraw-funds-dialog.tsx"],
      ["components", "download-desktop-tracker-dialog.tsx"],
      ["app", "verify-withdrawal", "page.tsx"],
      ["utils", "useApplyGate.tsx"],
    ]) {
      assert.ok(!read(...file).includes("retrying="), file.join("/"))
    }
  })
})

describe("gate: what did not change", () => {
  it("Dismiss and Cancel are untouched: synchronous, never disabled, no spinner", () => {
    assert.match(gate, /<Button\s+variant="outlined"\s+size="md"\s+onClick=\{onDismissConnectionError\}\s*>\s*Dismiss/)
    assert.match(gate, /<Button variant="outlined" onClick=\{cancel\}>\s*Cancel/)
  })
  it("the gate minus the approved loading additions is the gate that was there before", () => {
    assert.doesNotThrow(() => gateWithoutLoadingUi(gate))
  })
})

describe("flow: Yes, this is my home country", () => {
  const ideal = flow.slice(flow.indexOf('{state === "ideal" && ('), flow.indexOf('{state === "home-country-showcase" && ('))
  it("shows the shared spinner with its label while the confirmation and Free KYC start run", () => {
    assert.match(ideal, /disabled=\{\s*startingFreeKyc \|\| detectedLocation\.locationMismatch === true\s*\}\s+loading=\{startingFreeKyc\}\s+aria-busy=\{startingFreeKyc\}\s+onClick=\{\(\) => void handleHomeCountryYes\(\)\}/)
    assert.ok(ideal.includes("Yes, this is my home country"))
  })
  it("'No, I'm currently traveling' is disabled meanwhile, with no spinner", () => {
    assert.match(ideal, /disabled=\{startingFreeKyc\}\s+onClick=\{\(\) => send\("NO"\)\}/)
  })
  it("the request guard and the handler are unchanged", () => {
    const handler = flow.slice(flow.indexOf("const handleHomeCountryYes = async () => {"), flow.indexOf("// Travel branch: persists"))
    assert.ok(handler.includes("if (startingFreeKycRef.current) return"))
    assert.ok(handler.includes("startingFreeKycRef.current = true\n    setStartingFreeKyc(true)"))
    assert.ok(handler.includes('if (outcome !== "redirected" && getIsMounted()) {'))
  })
  it("the Yes / No row stacks, never clips, when the full loading width does not fit; 12px gap, order kept", () => {
    assert.ok(ideal.includes('<div className="mx-auto mt-6 flex w-full max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-3">'))
    assert.ok(ideal.includes('className="min-w-[250px] bg-primary-50 hover:bg-primary-500 hover:text-white"'))
    assert.ok(ideal.indexOf("No, I&rsquo;m currently traveling") < ideal.indexOf("Yes, this is my home country"))
  })
})

describe("flow: loading states are limited to the approved buttons", () => {
  it("only Yes, Skip and Confirm use the Button loading prop", () => {
    assert.equal(count(flow, "loading={"), 3)
  })
  it("the only Spinner in the flow's actions is the Permanently relocated card's, in place of its icon", () => {
    assert.equal(count(flow, "<Spinner"), 2) // the map's own loader + this card
    assert.equal(count(flow, "relocating ? ("), 1)
  })
  it("synchronous actions got nothing: Temporarily traveling's handler, Done, the toast's Update and the X buttons", () => {
    const toast = flow.slice(flow.indexOf("setTravelReminderOpen(false)\n                send(\"UPDATE_LOCATION\")"))
    assert.ok(!toast.slice(0, 200).includes("loading"))
    assert.ok(flow.includes("<Button onClick={() => onOpenChange(false)}>Done</Button>"))
  })
  it("the legacy / dev-only screens were not touched (no pending state on their buttons)", () => {
    const legacy = flow.slice(flow.indexOf('{state === "home-country-showcase" && ('), flow.indexOf('{state === "current-location-showcase" && ('))
    assert.ok(!legacy.includes("loading="))
    assert.ok(!legacy.includes("aria-busy"))
  })
})
