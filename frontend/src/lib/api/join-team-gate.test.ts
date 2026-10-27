// Run like apply-gate.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { joinTeamBlockFrom, joinTeamTitleFor } from "./join-team-gate"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const rejected = (status: number, data: Record<string, unknown>) => ({
  response: { status, data },
})

describe("G7 join-team copy: one title per missing requirement (Figma 13101-47451 / 47459)", () => {
  it("identity and location", () => {
    assert.equal(joinTeamTitleFor("both"), "To join this team, you must verify your identity and location")
  })
  it("identity only", () => {
    assert.equal(joinTeamTitleFor("identity"), "To join this team, you must verify your identity")
  })
  it("location only", () => {
    assert.equal(joinTeamTitleFor("location"), "To join this team, you must verify your location")
  })
})

describe("joinTeamBlockFrom: reads the backend's refusal, never opens anything itself", () => {
  it("403 VERIFICATION_REQUIRED carries the missing requirement", () => {
    for (const missing of ["both", "identity", "location"] as const) {
      assert.deepEqual(
        joinTeamBlockFrom(rejected(403, { error: "VERIFICATION_REQUIRED", missingRequirements: missing })),
        { kind: "verification", missing }
      )
    }
  })

  it("503 IDENTITY_VERIFICATION_UNAVAILABLE fails closed to the unavailable state", () => {
    assert.deepEqual(
      joinTeamBlockFrom(rejected(503, { error: "IDENTITY_VERIFICATION_UNAVAILABLE" })),
      { kind: "unavailable" }
    )
  })

  it("a refusal with no usable requirement fails closed instead of guessing a copy", () => {
    assert.deepEqual(joinTeamBlockFrom(rejected(403, { error: "VERIFICATION_REQUIRED" })), { kind: "unavailable" })
    assert.deepEqual(
      joinTeamBlockFrom(rejected(403, { error: "VERIFICATION_REQUIRED", missingRequirements: "none" })),
      { kind: "unavailable" }
    )
  })

  it("every other failure is not a gate answer and keeps its existing toast", () => {
    assert.equal(joinTeamBlockFrom(rejected(403, { error: "EMAIL_MISMATCH" })), null)
    assert.equal(joinTeamBlockFrom(rejected(404, { error: "NOT_FOUND" })), null)
    assert.equal(joinTeamBlockFrom(new Error("Network Error")), null)
    assert.equal(joinTeamBlockFrom(null), null)
    assert.equal(joinTeamBlockFrom(undefined), null)
  })
})

describe("the only G7 frontend accept entry point is gated", () => {
  const setup = read("app", "invite", "setup", "page.tsx")
  const hook = read("utils", "useJoinTeamGate.tsx")

  it("InvitationsAPI.acceptInvitation has exactly one caller: Go to Dashboard on /invite/setup", () => {
    const callers: string[] = []
    const walk = (dir: string) => {
      for (const e of require("node:fs").readdirSync(join(process.cwd(), dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`
        if (e.isDirectory()) { if (!/node_modules|\.next/.test(e.name)) walk(rel) }
        else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) && read(rel).includes("acceptInvitation(")) callers.push(rel)
      }
    }
    for (const d of ["app", "components", "utils", "src", "lib", "hooks", "contexts"]) {
      try { walk(d) } catch { /* directory absent */ }
    }
    assert.deepEqual(callers, ["app/invite/setup/page.tsx"])
    assert.ok(setup.includes("onClick={goToDashboard}"))
  })

  it("a talent's refused accept opens the modal; the failure path still returns before any success handling", () => {
    assert.ok(setup.includes("const { handleAcceptError, joinGateDialog } = useJoinTeamGate()"))
    assert.ok(setup.includes("if (resolveDashboardRole(user) === ROLE.TALENT && handleAcceptError(error)) {\n        return\n      }"))
    assert.ok(setup.includes("{joinGateDialog}"))
    // the success navigation only runs inside the try, after acceptInvitation resolved
    assert.ok(setup.indexOf("InvitationsAPI.acceptInvitation(inviteToken)") < setup.indexOf("router.push(`/my-network?"))
    assert.ok(setup.indexOf("router.push(`/my-network?") < setup.indexOf("handleAcceptError(error)"))
  })

  it("non-gate failures keep the existing toast", () => {
    assert.ok(setup.includes("title: getInvitationErrorMessage(errorCode, rawMessage)"))
  })

  it("Cancel only closes: no navigation, no API, no stored state, no accept", () => {
    assert.ok(/<DialogClose asChild>\s*<Button variant="outlined" size="md">\s*Cancel\s*<\/Button>\s*<\/DialogClose>/.test(hook))
    const onOpenChange = hook.slice(hook.indexOf("onOpenChange={"), hook.indexOf("<DialogContent"))
    assert.ok(onOpenChange.includes("if (!open) setBlock(null)"))
    assert.ok(!/router|fetch|localStorage|sessionStorage|accept/i.test(onOpenChange))
  })

  it("Start Verification closes the modal and uses the G3 startVerification hand-off", () => {
    assert.ok(/<Button size="md" onClick=\{goVerify\}>\s*Start Verification\s*<\/Button>/.test(hook))
    assert.ok(hook.includes("const goVerify = () => {\n    setBlock(null)\n    router.push(START_VERIFICATION_HREF)\n  }"))
    assert.ok(hook.includes('import { START_VERIFICATION_HREF } from "@/src/lib/api/start-verification-handoff"'))
  })

  it("unavailable reuses the existing status-unavailable popup and fails closed", () => {
    assert.ok(hook.includes('open={block?.kind === "unavailable"}'))
    assert.ok(hook.includes('reason="status_unavailable"'))
  })

  it("the modal has no accept logic and no verification-flow implementation of its own", () => {
    assert.ok(!hook.includes("acceptInvitation"))
    assert.ok(!hook.includes("IdentityVerificationFlow"))
  })
})

describe("not part of G7: team-profile Join Team has no handler and Request to Join is a project feature", () => {
  it("team-profile Join Team buttons are inert", () => {
    const tp = read("app", "(group)", "(group)", "team-profile", "page.tsx")
    assert.equal(tp.split('<Button size="md">\n                    <Plus className="size-[15px]" />\n                    Join Team').length - 1 >= 1, true)
    assert.ok(!tp.includes("acceptInvitation"))
  })
})
