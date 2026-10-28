// Run like apply-gate.test.ts (from the frontend/ directory): npx tsx --test <file>
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  createListingBlockFrom,
  createListingTitleFor,
  runCreateListingGate,
} from "./create-listing-gate"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const rejected = (status: number, data: Record<string, unknown>) => ({ response: { status, data } })
const refusal = (missing: string) =>
  rejected(403, { error: "VERIFICATION_REQUIRED", missingRequirements: missing })

describe("G2 listing-creation copy: one variant per missing status", () => {
  it("identity and location", () => {
    assert.equal(createListingTitleFor("both"), "To publish this job, you must verify your identity and location")
  })
  it("identity only", () => {
    assert.equal(createListingTitleFor("identity"), "To publish this job, you must verify your identity")
  })
  it("location only", () => {
    assert.equal(createListingTitleFor("location"), "To publish this job, you must verify your location")
  })
})

describe("createListingBlockFrom: only an explicit refusal names a requirement; everything else fails closed", () => {
  it("403 VERIFICATION_REQUIRED carries the missing requirement", () => {
    for (const missing of ["both", "identity", "location"] as const) {
      assert.deepEqual(createListingBlockFrom(refusal(missing)), { kind: "verification", missing })
    }
  })
  it("503, malformed refusals and network errors are the unavailable state, never open", () => {
    assert.deepEqual(createListingBlockFrom(rejected(503, { error: "IDENTITY_VERIFICATION_UNAVAILABLE" })), { kind: "unavailable" })
    assert.deepEqual(createListingBlockFrom(rejected(403, { error: "VERIFICATION_REQUIRED" })), { kind: "unavailable" })
    assert.deepEqual(createListingBlockFrom(rejected(403, { error: "VERIFICATION_REQUIRED", missingRequirements: "none" })), { kind: "unavailable" })
    assert.deepEqual(createListingBlockFrom(new Error("Network Error")), { kind: "unavailable" })
    assert.deepEqual(createListingBlockFrom(null), { kind: "unavailable" })
  })
})

describe("runCreateListingGate: the draft is created only after the check resolved", () => {
  // Project and Service share the one code path; both are exercised.
  for (const type of ["project", "service"]) {
    it(`unverified ${type} click: blocked, the check ran, NO draft/API write`, async () => {
      const calls: string[] = []
      const out = await runCreateListingGate({
        isTalent: true,
        check: async () => { calls.push("check"); throw refusal("both") },
        proceed: () => { calls.push(`create-draft:${type}`) },
      })
      assert.deepEqual(calls, ["check"])
      assert.deepEqual(out, { block: { kind: "verification", missing: "both" }, proceeded: false })
    })
  }

  it("each missing status selects its own variant", async () => {
    for (const missing of ["both", "identity", "location"] as const) {
      const out = await runCreateListingGate({
        isTalent: true,
        check: async () => { throw refusal(missing) },
        proceed: () => assert.fail("must not create a draft"),
      })
      assert.deepEqual(out.block, { kind: "verification", missing })
    }
  })

  it("an unreadable gate fails closed: no draft", async () => {
    const out = await runCreateListingGate({
      isTalent: true,
      check: async () => { throw new Error("Network Error") },
      proceed: () => assert.fail("must not create a draft"),
    })
    assert.deepEqual(out, { block: { kind: "unavailable" }, proceeded: false })
  })

  it("verified or grace-period talent (check resolves): check first, then the draft", async () => {
    const calls: string[] = []
    const out = await runCreateListingGate({
      isTalent: true,
      check: async () => { calls.push("check") },
      proceed: () => { calls.push("create-draft") },
    })
    assert.deepEqual(calls, ["check", "create-draft"])
    assert.deepEqual(out, { block: null, proceeded: true })
  })

  it("a non-talent keeps the existing behavior: no check, straight to the draft", async () => {
    const calls: string[] = []
    const out = await runCreateListingGate({
      isTalent: false,
      check: async () => { calls.push("check") },
      proceed: () => { calls.push("create-draft") },
    })
    assert.deepEqual(calls, ["create-draft"])
    assert.equal(out.proceeded, true)
  })

  it("a failure of the draft creation itself still surfaces to the caller", async () => {
    await assert.rejects(
      runCreateListingGate({ isTalent: true, check: async () => {}, proceed: () => { throw new Error("boom") } }),
      /boom/
    )
  })
})

describe("the hook: modal behavior", () => {
  const hook = read("utils", "useCreateListingGate.tsx")

  it("the only API it can call is the read-only creation check", () => {
    assert.ok(hook.includes("ProjectAPI.CheckCreateListingGate()"))
    assert.ok(!/CreateProjectDraft|UpdateProjectDraft|localStorage|sessionStorage|fetch\(/.test(hook))
  })

  it("Cancel, Esc and an outside click only close the modal: no navigation, API or stored state", () => {
    assert.ok(/<DialogClose asChild>\s*<Button variant="outlined" size="md">\s*Cancel\s*<\/Button>\s*<\/DialogClose>/.test(hook))
    const onOpenChange = hook.slice(hook.indexOf("onOpenChange={"), hook.indexOf("<DialogContent"))
    assert.ok(onOpenChange.includes("if (!open) setBlock(null)"))
    assert.ok(!/router|fetch|check|proceed|Draft|localStorage|sessionStorage/i.test(onOpenChange))
  })

  it("Start Verification closes the modal and launches the existing flow through the G3 hand-off", () => {
    assert.ok(/<Button size="md" onClick=\{goVerify\}>\s*Start Verification\s*<\/Button>/.test(hook))
    assert.ok(hook.includes("const goVerify = () => {\n    setBlock(null)\n    router.push(START_VERIFICATION_HREF)\n  }"))
    assert.ok(read("src", "lib", "api", "start-verification-handoff.ts").includes("/talent-dashboard?"))
  })

  it("unavailable reuses the existing status-unavailable popup", () => {
    assert.ok(hook.includes('open={block?.kind === "unavailable"}'))
    assert.ok(hook.includes('reason="status_unavailable"'))
  })

  it("talent role decides whether the check runs", () => {
    assert.ok(hook.includes("resolveDashboardRole(user) === ROLE.TALENT"))
  })
})

describe("/my-listings: Project and Service both go through the gate before any draft", () => {
  const page = read("app", "(group)", "my-listings", "page.tsx")

  it("the New Listing chooser offers exactly Project and Service, on one click handler", () => {
    assert.ok(/type: "project",\s*label: "Project"/.test(page))
    assert.ok(/type: "service",\s*label: "Service"/.test(page))
    assert.equal(page.split("newListingOptions.map(").length - 1, 1)
  })

  it("CreateProjectDraft is called once on this page, only inside the runCreate callback", () => {
    assert.equal(page.split("ProjectAPI.CreateProjectDraft(").length - 1, 1)
    const run = page.indexOf("await runCreate(async () => {")
    const draft = page.indexOf("ProjectAPI.CreateProjectDraft(")
    assert.ok(run > 0 && draft > run)
  })

  it("renders the gate dialog and closes the chooser (opens no form) when blocked", () => {
    assert.ok(page.includes("{createListingGateDialog}"))
    assert.ok(/if \(!proceeded\) \{\s*setShowNewListingDialog\(false\)/.test(page))
  })
})

describe("invite/setup (PMCM-652 follow-up): no verification gate at all", () => {
  const setup = read("app", "invite", "setup", "page.tsx")

  it("the page no longer references the join-team gate, its modal or its error handling", () => {
    assert.ok(!/useJoinTeamGate|joinGateDialog|handleAcceptError|VERIFICATION_REQUIRED|IDENTITY_VERIFICATION_UNAVAILABLE|START_VERIFICATION|startVerification/.test(setup))
  })

  it("the G7 hook and helper are gone", () => {
    assert.equal(existsSync(join(process.cwd(), "utils", "useJoinTeamGate.tsx")), false)
    assert.equal(existsSync(join(process.cwd(), "src", "lib", "api", "join-team-gate.ts")), false)
  })

  it("accepting still goes through the existing accept call and its toast on failure", () => {
    assert.ok(setup.includes("InvitationsAPI"))
    assert.ok(setup.includes('title: getInvitationErrorMessage(errorCode, rawMessage)'))
  })
})
