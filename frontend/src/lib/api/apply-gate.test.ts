// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { applyGateFor } from "./apply-gate"
import { parseIdentityVerificationSummary } from "./identity-verification-state"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const summary = (body: Record<string, unknown>) => parseIdentityVerificationSummary({ nextAction: "complete", ...body })

describe("applyGateFor (G3): gate_open from GET /me, never fullyVerified alone", () => {
  it("verified talent: open", () => {
    assert.equal(applyGateFor(summary({ fullyVerified: true, gateOpen: true })), "open")
  })

  it("talent inside the 30-day grace period (fullyVerified false, gateOpen true): open", () => {
    assert.equal(applyGateFor(summary({ fullyVerified: false, gateOpen: true })), "open")
  })

  it("unverified talent (gateOpen false): closed, even if a stray fullyVerified said true", () => {
    assert.equal(applyGateFor(summary({ fullyVerified: false, gateOpen: false })), "closed")
    assert.equal(applyGateFor(summary({ fullyVerified: true, gateOpen: false })), "closed")
  })

  it("unavailable: status unreadable, not an object, or no usable gateOpen all fail closed to the unavailable state", () => {
    assert.equal(applyGateFor(null), "unavailable")
    assert.equal(applyGateFor(parseIdentityVerificationSummary("nope")), "unavailable")
    assert.equal(applyGateFor(parseIdentityVerificationSummary(null)), "unavailable")
    assert.equal(applyGateFor(summary({ fullyVerified: true })), "unavailable") // an old backend: never read as open
    assert.equal(applyGateFor(summary({ fullyVerified: true, gateOpen: "true" })), "unavailable")
    assert.equal(applyGateFor(summary({ fullyVerified: true, gateOpen: 1 })), "unavailable")
  })
})

describe("the parsed summary carries gateOpen exactly as sent", () => {
  it("true / false / absent", () => {
    assert.equal(summary({ gateOpen: true })?.gateOpen, true)
    assert.equal(summary({ gateOpen: false })?.gateOpen, false)
    assert.equal(summary({})?.gateOpen, null)
  })
})

describe("every Apply entry point goes through the gate", () => {
  const jobDetails = read("app", "(group)", "(group)", "job-details", "[slug]", "page.tsx")
  const myJobs = read("app", "(group)", "my-jobs", "page.tsx")
  const hook = read("utils", "useApplyGate.tsx")

  it("job details: the Apply button is gated; Accept Offer keeps no handler and is untouched", () => {
    assert.ok(jobDetails.includes('import { useApplyGate } from "@/utils/useApplyGate"'))
    assert.ok(jobDetails.includes("const { runApply, applyGateDialog } = useApplyGate()"))
    assert.ok(jobDetails.includes("onClick={isLegalServiceNda ? undefined : () => void runApply()}"))
    assert.ok(jobDetails.includes('const primaryCtaLabel = isLegalServiceNda ? "Accept Offer" : "Apply"'))
    assert.ok(jobDetails.includes("{!isLegalServiceNda && applyGateDialog}"))
  })

  it("my jobs: the banner Apply Now and the list menu Apply Now are both gated; the menu keeps its navigation as the verified behavior", () => {
    assert.ok(myJobs.includes("const { runApply, applyGateDialog } = useApplyGate()"))
    // the hook is called before the client early return (hook order)
    assert.ok(myJobs.indexOf("useApplyGate()") < myJobs.indexOf("if (resolveDashboardRole(user) === ROLE.CLIENT)"))
    assert.ok(myJobs.includes("onClick={() => void runApply()}"))
    assert.ok(myJobs.includes("void runApply(() => router.push(`/job-details/${job.id}`))"))
    assert.ok(!myJobs.includes("onSelect={() => router.push(`/job-details/${job.id}`)}>\n                                        Apply Now"))
    assert.ok(myJobs.includes("{applyGateDialog}"))
  })

  it("job browsing and detail navigation are not gated", () => {
    assert.ok(myJobs.includes("View Job Details"))
    assert.ok(/onSelect=\{\(\) => router\.push\(`\/job-details\/\$\{job\.id\}`\)\}>\s*View Job Details/.test(myJobs))
  })

  it("project 'Request to Join' is not part of G3 and stays untouched", () => {
    const project = read("app", "(group)", "(group)", "project-details", "[slug]", "page.tsx")
    assert.ok(!project.includes("useApplyGate"))
  })

  it("the hook: talents only, fresh read each click", () => {
    assert.ok(hook.includes("resolveDashboardRole(user) === ROLE.TALENT"))
    assert.ok(hook.includes("if (!isTalent) {\n        proceed?.()"))
    assert.ok(hook.includes("applyGateFor(await fetchIdentityVerificationSummary())"))
    assert.ok(!hook.includes("fullyVerified"))
  })

  it("closed gate opens the Figma modal; open gate only ever runs proceed()", () => {
    assert.ok(hook.includes('open={block === "closed"}'))
    assert.ok(hook.includes('setBlock(decision === "closed" ? "closed" : "unavailable")'))
    assert.ok(hook.includes('if (decision === "open") {\n          proceed?.()\n          return\n        }'))
    assert.ok(hook.includes("To apply to this job, you will need to verify your account"))
  })

  it("Cancel only closes: no navigation, no API call, no stored state", () => {
    assert.ok(/<DialogClose asChild>\s*<Button variant="outlined" size="md">\s*Cancel\s*<\/Button>\s*<\/DialogClose>/.test(hook))
    assert.ok(hook.includes("if (!open) setBlock(null)"))
    const onOpenChange = hook.slice(hook.indexOf("onOpenChange={"), hook.indexOf("<DialogContent"))
    assert.ok(!/router|fetch|localStorage|sessionStorage|proceed/.test(onOpenChange))
  })

  it("Start Verification closes the modal and hands off to the existing verification entry", () => {
    assert.ok(/<Button size="md" onClick=\{goVerify\}>\s*Start Verification\s*<\/Button>/.test(hook))
    assert.ok(hook.includes("const goVerify = () => {\n    setBlock(null)\n    router.push(START_VERIFICATION_HREF)\n  }"))
    assert.ok(hook.includes('import { START_VERIFICATION_HREF } from "@/src/lib/api/start-verification-handoff"'))
  })

  it("an unreadable status still fails closed into the existing status-unavailable popup", () => {
    assert.ok(hook.includes('open={block === "unavailable"}'))
    assert.ok(hook.includes('reason="status_unavailable"'))
  })
})
