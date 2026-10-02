// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { cooldownRetryAt, decideGate, formatRetryAt } from "./identity-next-step"
import { parseIdentityVerificationSummary } from "./identity-verification-state"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const summary = (over: Record<string, unknown>) =>
  parseIdentityVerificationSummary({ nextAction: "wait_for_retry", attemptsUsed: 3, attemptsRemaining: 0, maxAttempts: 3, canRetry: false, retryAvailableAt: "2026-10-03T14:17:00.000Z", ...over })

describe("when the 'You've used all three attempts' screen applies (backend data only)", () => {
  it("shows for wait_for_retry WITH a valid retry time, and passes that time through unchanged", () => {
    assert.equal(cooldownRetryAt(summary({})), "2026-10-03T14:17:00.000Z")
  })
  it("does not show for waiting states that carry no retry time (blocked, no self-service path)", () => {
    for (const bad of [null, undefined, "", "not a date", "Invalid Date", 12345]) {
      assert.equal(cooldownRetryAt(summary({ retryAvailableAt: bad })), null)
    }
  })
  it("does not show for any other state, even if a retry time is present", () => {
    for (const action of ["confirm_location", "start_identity", "continue_identity", "await_review", "retry_identity", "reverify_identity", "complete", "something_new"]) {
      assert.equal(cooldownRetryAt(summary({ nextAction: action })), null, action)
    }
  })
  it("an unreadable status never shows it", () => {
    assert.equal(cooldownRetryAt(null), null)
  })
  it("it is a closed-box state, so the 'Verify My Account' box and this screen never show together", () => {
    assert.deepEqual(decideGate(summary({})), { kind: "closed" })
  })
})

describe("the retry time reads as a date and a time, never a duration", () => {
  it("formats in the viewer's locale and zone", () => {
    assert.deepEqual(formatRetryAt("2026-10-03T14:17:00.000Z", { locale: "en-US", timeZone: "UTC" }), { date: "October 3, 2026", time: "2:17 PM" })
    assert.deepEqual(formatRetryAt("2026-10-03T14:17:00.000Z", { locale: "en-US", timeZone: "America/Chicago" }), { date: "October 3, 2026", time: "9:17 AM" })
  })
  it("a different zone can move the calendar date", () => {
    assert.equal(formatRetryAt("2026-10-03T02:30:00.000Z", { locale: "en-US", timeZone: "America/Los_Angeles" })?.date, "October 2, 2026")
  })
  it("anything that is not a valid timestamp renders nothing (never 'Invalid Date')", () => {
    for (const bad of [null, undefined, "", "garbage", "2026-13-45"]) assert.equal(formatRetryAt(bad as never, { locale: "en-US" }), null)
  })
  it("contains no duration wording", () => {
    const out = JSON.stringify(formatRetryAt("2026-10-03T14:17:00.000Z", { locale: "en-US", timeZone: "UTC" }))
    assert.ok(!/hour|minute|day[s]? |in \d/i.test(out.replace("October", "")))
  })
})

describe("the screen: approved copy and the Figma frame 13101-47396", () => {
  const page = read("app", "(group)", "talent-dashboard", "page.tsx")
  const start = page.indexOf("open={cooldownRetryTime !== null}")
  const dialog = page.slice(page.lastIndexOf("<Dialog", start), page.indexOf("</Dialog>", start) + "</Dialog>".length)

  it("uses the approved title and body, with the date and time filled in", () => {
    assert.ok(dialog.includes("You’ve used all three attempts"))
    assert.ok(dialog.includes("`You can try again on ${retryWhen.date} at ${retryWhen.time}. Nothing is lost — your account stays as it is until then.`"))
  })

  it("avoids the words the product decision rules out, and mentions no support contact", () => {
    const shown = dialog.replace(/className="[^"]*"/g, "")
    for (const banned of [/failed/i, /rejected/i, /unable to verify/i, /support/i, /contact/i, /help ?desk/i, /permanent/i, /final/i]) {
      assert.ok(!banned.test(shown), String(banned))
    }
  })

  it("has no button of any kind", () => {
    assert.ok(!/<Button|<IconButton|<button|DialogTrigger|DialogClose/.test(dialog))
  })

  it("matches the frame: 469px, 50px top padding, 48px warning icon, 20px/8px gaps, 18/28 title, 14/20 body, dark-blue-400", () => {
    for (const c of [
      'className="w-[469px] pt-[50px]"',
      "size-[48px] rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0",
      '<AlertTriangle className="size-6" />',
      "mt-5 text-lg text-center leading-7 text-dark-blue-400 font-semibold",
      "mt-2 text-sm text-center leading-5 text-dark-blue-400",
    ]) {
      assert.ok(dialog.includes(c), c)
    }
  })

  it("reuses the existing Dialog and warning-icon pattern of the gate, not a new component", () => {
    assert.ok(!/function [A-Z]\w*\(/.test(dialog))
    const gate = read("components", "account-verification-gate.tsx")
    for (const c of ["w-[469px] pt-[50px]", "size-[48px] rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50"]) {
      assert.ok(gate.includes(c), c)
    }
  })

  it("closes with the Dialog's own Escape / outside click, and returns on the next backend answer", () => {
    assert.ok(dialog.includes("onOpenChange={(open) => {\n          if (!open) setCooldownRetryTime(null)"))
    assert.ok(!dialog.includes("preventDefault"))
  })
})

describe("wiring: every place that reads the backend's answer feeds it", () => {
  const page = read("app", "(group)", "talent-dashboard", "page.tsx")

  it("the load check, the return effect and the stale-box button all set it from cooldownRetryAt", () => {
    assert.equal((page.match(/setCooldownRetryTime\(cooldownRetryAt\(summary\)\)/g) ?? []).length, 2)
    assert.ok(page.includes("const retryAt = cooldownRetryAt(summary)"))
    assert.match(page, /if \(retryAt\) \{\s+setCooldownRetryTime\(retryAt\)\s+return\s+\}/)
  })

  it("the return effect still tries success first and keeps its bounded polling", () => {
    const effect = page.slice(page.indexOf("const returnReconcilerRef"), page.indexOf("Real required check"))
    assert.ok(effect.indexOf("shouldShowSuccessModal(summary)") < effect.indexOf("cooldownRetryAt(summary)"))
    assert.ok(effect.includes("attempts < RESULT_POLL_MAX_ATTEMPTS"))
  })

  it("no attempt, cooldown or clock rule is recreated: the screen only formats what the backend sent", () => {
    const src = read("src", "lib", "api", "identity-next-step.ts")
    const code = src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n")
    assert.ok(!/Date\.now|24 \*|60 \* 60|attemptsRemaining|attemptsUsed|canRetry/.test(code))
  })

  it("protected files are untouched", () => {
    assert.ok(!read("components", "account-verification-gate.tsx").includes("cooldown"))
    assert.ok(!read("components", "identity-verification-flow.tsx").includes("cooldownRetry"))
  })
})
