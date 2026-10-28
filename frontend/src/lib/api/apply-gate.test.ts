// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { applyGateFor } from "./apply-gate"
import { parseIdentityVerificationSummary } from "./identity-verification-state"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const summary = (body: Record<string, unknown>) =>
  parseIdentityVerificationSummary({ nextAction: "complete", ...body })

describe("applyGateFor (G3): gate_open from GET /me, never fullyVerified alone", () => {
  it("verified talent: open", () => {
    assert.equal(
      applyGateFor(summary({ fullyVerified: true, gateOpen: true })),
      "open"
    )
  })

  it("talent inside the 30-day grace period (fullyVerified false, gateOpen true): open", () => {
    assert.equal(
      applyGateFor(summary({ fullyVerified: false, gateOpen: true })),
      "open"
    )
  })

  it("unverified talent (gateOpen false): closed, even if a stray fullyVerified said true", () => {
    assert.equal(
      applyGateFor(summary({ fullyVerified: false, gateOpen: false })),
      "closed"
    )
    assert.equal(
      applyGateFor(summary({ fullyVerified: true, gateOpen: false })),
      "closed"
    )
  })

  it("unavailable: status unreadable, not an object, or no usable gateOpen all fail closed to the unavailable state", () => {
    assert.equal(applyGateFor(null), "unavailable")
    assert.equal(
      applyGateFor(parseIdentityVerificationSummary("nope")),
      "unavailable"
    )
    assert.equal(
      applyGateFor(parseIdentityVerificationSummary(null)),
      "unavailable"
    )
    assert.equal(applyGateFor(summary({ fullyVerified: true })), "unavailable") // an old backend: never read as open
    assert.equal(
      applyGateFor(summary({ fullyVerified: true, gateOpen: "true" })),
      "unavailable"
    )
    assert.equal(
      applyGateFor(summary({ fullyVerified: true, gateOpen: 1 })),
      "unavailable"
    )
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
  const jobDetails = read(
    "app",
    "(group)",
    "(group)",
    "job-details",
    "[slug]",
    "page.tsx"
  )
  const myJobs = read("app", "(group)", "my-jobs", "page.tsx")
  const hook = read("utils", "useApplyGate.tsx")

  it("job details: the Apply button is gated; Accept Offer keeps no handler and is untouched", () => {
    assert.ok(
      jobDetails.includes('import { useApplyGate } from "@/utils/useApplyGate"')
    )
    assert.ok(
      jobDetails.includes(
        "const { runApply, applyGateDialog } = useApplyGate()"
      )
    )
    assert.ok(
      jobDetails.includes(
        "onClick={isLegalServiceNda ? undefined : () => void runApply()}"
      )
    )
    assert.ok(
      jobDetails.includes(
        'const primaryCtaLabel = isLegalServiceNda ? "Accept Offer" : "Apply"'
      )
    )
    assert.ok(jobDetails.includes("{!isLegalServiceNda && applyGateDialog}"))
  })

  it("my jobs: the banner Apply Now and the list menu Apply Now are both gated; the menu keeps its navigation as the verified behavior", () => {
    assert.ok(
      myJobs.includes("const { runApply, applyGateDialog } = useApplyGate()")
    )
    // the hook is called before the client early return (hook order)
    assert.ok(
      myJobs.indexOf("useApplyGate()") <
        myJobs.indexOf("if (resolveDashboardRole(user) === ROLE.CLIENT)")
    )
    assert.ok(myJobs.includes("onClick={() => void runApply()}"))
    assert.ok(
      myJobs.includes(
        "void runApply(() => router.push(`/job-details/${job.id}`))"
      )
    )
    assert.ok(
      !myJobs.includes(
        "onSelect={() => router.push(`/job-details/${job.id}`)}>\n                                        Apply Now"
      )
    )
    assert.ok(myJobs.includes("{applyGateDialog}"))
  })

  it("job browsing and detail navigation are not gated", () => {
    assert.ok(myJobs.includes("View Job Details"))
    assert.ok(
      /onSelect=\{\(\) => router\.push\(`\/job-details\/\$\{job\.id\}`\)\}>\s*View Job Details/.test(
        myJobs
      )
    )
  })

  it("project 'Request to Join' is not part of G3 and stays untouched", () => {
    const project = read(
      "app",
      "(group)",
      "(group)",
      "project-details",
      "[slug]",
      "page.tsx"
    )
    assert.ok(!project.includes("useApplyGate"))
  })

  it("the hook: talents only, fresh read each click", () => {
    assert.ok(hook.includes("resolveDashboardRole(user) === ROLE.TALENT"))
    assert.ok(hook.includes("if (!isTalent) {\n        proceed?.()"))
    assert.ok(
      hook.includes("applyGateFor(await fetchIdentityVerificationSummary())")
    )
    assert.ok(!hook.includes("fullyVerified"))
  })

  it("closed gate opens the Figma modal; open gate only ever runs proceed()", () => {
    assert.ok(hook.includes('open={block === "closed"}'))
    assert.ok(
      hook.includes(
        'setBlock(decision === "closed" ? "closed" : "unavailable")'
      )
    )
    assert.ok(
      hook.includes(
        'if (decision === "open") {\n          proceed?.()\n          return\n        }'
      )
    )
    assert.ok(
      hook.includes(
        "To apply to this job, you will need to verify your account"
      )
    )
  })

  it("Cancel only closes: no navigation, no API call, no stored state", () => {
    assert.ok(
      /<DialogClose asChild>\s*<Button variant="outlined" size="md">\s*Cancel\s*<\/Button>\s*<\/DialogClose>/.test(
        hook
      )
    )
    assert.ok(hook.includes("if (!open) setBlock(null)"))
    const onOpenChange = hook.slice(
      hook.indexOf("onOpenChange={"),
      hook.indexOf("<DialogContent")
    )
    assert.ok(
      !/router|fetch|localStorage|sessionStorage|proceed/.test(onOpenChange)
    )
  })

  it("Start Verification closes the modal and starts the verification flow in place, through the shared host", () => {
    assert.ok(
      /<Button size="md" onClick=\{goVerify\}>\s*Start Verification\s*<\/Button>/.test(
        hook
      )
    )
    assert.ok(
      hook.includes(
        "const goVerify = () => {\n    setBlock(null)\n    void startVerification()\n  }"
      )
    )
    assert.ok(
      hook.includes(
        'import { useIdentityVerification } from "@/contexts/identity-verification-host"'
      )
    )
    assert.ok(
      hook.includes("const { startVerification } = useIdentityVerification()")
    )
  })

  it("an unreadable status still fails closed into the existing status-unavailable popup", () => {
    assert.ok(hook.includes('open={block === "unavailable"}'))
    assert.ok(hook.includes('reason="status_unavailable"'))
  })
})

// ---------------------------------------------------------------------------
// G3 in place (PMCM-652 phase 3): Start Verification no longer leaves the page.
describe("G3 Start Verification runs in place: no navigation, no handoff, no retry", () => {
  const jobDetails = read(
    "app",
    "(group)",
    "(group)",
    "job-details",
    "[slug]",
    "page.tsx"
  )
  const myJobs = read("app", "(group)", "my-jobs", "page.tsx")
  const hook = read("utils", "useApplyGate.tsx")
  const code = (source: string) =>
    source.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")

  it("the hook never navigates or reloads: no router, no dashboard path, no marker, no location change", () => {
    const source = code(hook)
    assert.ok(!/useRouter|router\.|next\/navigation/.test(source))
    assert.ok(
      !/START_VERIFICATION|startVerification=|startVerificationRequested|start-verification-handoff/.test(
        source
      )
    )
    assert.ok(
      !/talent-dashboard|window\.location|location\.(assign|replace|reload|href)|history\./.test(
        source
      )
    )
  })

  it("Start Verification calls the shared host exactly once and does nothing else", () => {
    const goVerify = hook.slice(
      hook.indexOf("const goVerify = () => {"),
      hook.indexOf("const applyGateDialog")
    )
    assert.equal(goVerify.split("startVerification()").length - 1, 1)
    assert.ok(
      goVerify.indexOf("setBlock(null)") <
        goVerify.indexOf("startVerification()"),
      "the modal closes first"
    )
    assert.ok(!/proceed|runApply|fetch|await|setTimeout/.test(goVerify))
    // both popups of the hook (the blocked modal and the status-unavailable gate) use the same action
    assert.equal(hook.split("onClick={goVerify}").length - 1, 1)
    assert.ok(
      hook.includes("onVerify={goVerify}") &&
        hook.includes("onRetryConnectionCheck={goVerify}")
    )
    assert.equal(hook.split("useIdentityVerification()").length - 1, 1)
  })

  it("the application is never retried: proceed runs only for a non-talent or an open gate, and nothing is kept for later", () => {
    const source = code(hook)
    assert.equal(source.split("proceed?.()").length - 1, 2) // non-talent, open gate
    assert.ok(
      !/useRef<\(\)/.test(source) &&
        !/setPending|pendingApply|retryApply|resume/i.test(source)
    )
    const refs = source.match(/useRef\(/g) ?? []
    assert.equal(refs.length, 1) // the in-flight click guard only
    assert.ok(source.includes("const checking = useRef(false)"))
  })

  it("Cancel, Escape and an outside click only close the modal (no handler overrides them)", () => {
    const dialog = hook.slice(
      hook.indexOf('<Dialog\n        open={block === "closed"}'),
      hook.indexOf("<AccountVerificationGate")
    )
    assert.ok(dialog.includes("if (!open) setBlock(null)"))
    assert.ok(
      !/onInteractOutside|onEscapeKeyDown|onPointerDownOutside/.test(dialog)
    )
    assert.ok(
      /<DialogClose asChild>\s*<Button variant="outlined" size="md">\s*Cancel/.test(
        dialog
      )
    )
    assert.ok(
      !/startVerification|proceed|router/.test(
        dialog.slice(0, dialog.indexOf("<DialogContent"))
      )
    )
  })

  it("the modal's design, copy and CSS are byte-for-byte what dev-main 20b794d9 had (sha256 of both popups)", () => {
    const block = hook
      .slice(
        hook.indexOf("  const applyGateDialog = ("),
        hook.indexOf("  return { runApply, applyGateDialog }")
      )
      .replace(/\s+/g, "")
    assert.equal(
      createHash("sha256").update(block).digest("hex"),
      "74a3a412c06091321888191373589a734274ca032c27795a9a1053b9a01dc473"
    )
  })

  it("every Apply entry point still shares the one hook, and no page reaches verification by itself", () => {
    assert.equal(jobDetails.split("useApplyGate()").length - 1, 1)
    assert.equal(myJobs.split("useApplyGate()").length - 1, 1)
    assert.equal(jobDetails.split("void runApply(").length - 1, 1) // the Apply button
    assert.equal(myJobs.split("void runApply(").length - 1, 2) // banner Apply Now + list menu Apply Now
    for (const page of [jobDetails, myJobs]) {
      assert.ok(
        !/START_VERIFICATION|startVerification|start-verification-handoff|identity-verification-host|useIdentityVerification/.test(
          page
        )
      )
      assert.ok(!/talent-dashboard\?/.test(page))
    }
  })

  it("the gate decision is unchanged: a fresh read per click, open only for gate_open, everything else blocks", () => {
    assert.ok(
      hook.includes("applyGateFor(await fetchIdentityVerificationSummary())")
    )
    assert.ok(
      hook.includes(
        'if (decision === "open") {\n          proceed?.()\n          return\n        }'
      )
    )
    assert.ok(
      hook.includes(
        'setBlock(decision === "closed" ? "closed" : "unavailable")'
      )
    )
    assert.ok(hook.includes("if (checking.current) return"))
    assert.ok(
      hook.includes(
        "if (!isTalent) {\n        proceed?.()\n        return\n      }"
      )
    )
  })
})
