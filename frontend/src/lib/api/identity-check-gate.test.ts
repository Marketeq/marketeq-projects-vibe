// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  isPasswordSetupRequired,
  shouldStartIdentityCheck,
  type PasswordSetupUser,
} from "./identity-check-gate"
import { gateReasonForStatus } from "./identity-verification-status"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")

const emailNoPassword: PasswordSetupUser = { provider: "EMAIL", hasPassword: false }
const emailWithPassword: PasswordSetupUser = { provider: "EMAIL", hasPassword: true }
const google: PasswordSetupUser = { provider: "GOOGLE", hasPassword: false }

describe("isPasswordSetupRequired (read only from the authenticated user)", () => {
  it("email account without a password → required", () => {
    assert.equal(isPasswordSetupRequired(emailNoPassword), true)
    assert.equal(isPasswordSetupRequired({ provider: "EMAIL" }), true) // field missing = not proven
    assert.equal(isPasswordSetupRequired({ provider: "EMAIL", hasPassword: null }), true)
  })
  it("email account with a password → not required", () => {
    assert.equal(isPasswordSetupRequired(emailWithPassword), false)
  })
  it("social accounts never need one", () => {
    for (const provider of ["GOOGLE", "LINKEDIN", "google", undefined, null, ""]) {
      assert.equal(isPasswordSetupRequired({ provider, hasPassword: false }), false)
    }
  })
  it("no user → not required (nothing to show)", () => {
    assert.equal(isPasswordSetupRequired(null), false)
    assert.equal(isPasswordSetupRequired(undefined), false)
  })
})

describe("shouldStartIdentityCheck decision matrix", () => {
  const base = { user: emailWithPassword, isTalent: true, securityDialogOpen: false, alreadyStarted: false }

  it("starts for a talent with a password and no dialog open (second login)", () => {
    assert.equal(shouldStartIdentityCheck(base), true)
  })
  it("starts immediately for a social-login talent", () => {
    assert.equal(shouldStartIdentityCheck({ ...base, user: google }), true)
  })
  it("waits while password setup is required (first login, failure, Cancel)", () => {
    assert.equal(shouldStartIdentityCheck({ ...base, user: emailNoPassword }), false)
    assert.equal(shouldStartIdentityCheck({ ...base, user: emailNoPassword, securityDialogOpen: true }), false)
    assert.equal(shouldStartIdentityCheck({ ...base, user: emailNoPassword, securityDialogOpen: false }), false) // Cancel
  })
  it("waits while the dialog is still open even after the password was saved (success step)", () => {
    assert.equal(shouldStartIdentityCheck({ ...base, user: emailWithPassword, securityDialogOpen: true }), false)
  })
  it("starts after Close once the password exists", () => {
    assert.equal(shouldStartIdentityCheck({ ...base, user: emailWithPassword, securityDialogOpen: false }), true)
  })
  it("never starts twice, for a non-talent, or without a user", () => {
    assert.equal(shouldStartIdentityCheck({ ...base, alreadyStarted: true }), false)
    assert.equal(shouldStartIdentityCheck({ ...base, isTalent: false }), false)
    assert.equal(shouldStartIdentityCheck({ ...base, user: null }), false)
  })
})

// A faithful model of the page's effects: the password effect (dep: user) opens the
// dialog; the identity effect (deps: user, dialog-open) starts the check at most once.
// Effects read the state captured by the render that scheduled them, so the first
// commit sees the dialog as still closed — the rule must not depend on it.
function dashboard(options: { strict?: boolean } = {}) {
  let user: PasswordSetupUser | null = null
  let securityOpen = false
  let started = false
  const log: string[] = []
  const checks = { started: 0 }

  const identityEffect = (renderSecurityOpen: boolean) => {
    const run = () => {
      if (
        shouldStartIdentityCheck({
          user,
          isTalent: true,
          securityDialogOpen: renderSecurityOpen,
          alreadyStarted: started,
        })
      ) {
        started = true // set only when the real check actually starts
        checks.started += 1
        log.push("identity-check")
      }
    }
    run()
    if (options.strict) run() // StrictMode runs every effect twice on mount
  }

  const commit = (userChanged: boolean) => {
    const renderSecurityOpen = securityOpen
    let openedNow = false
    if (userChanged && isPasswordSetupRequired(user) && !securityOpen) {
      securityOpen = true // the page's password effect
      openedNow = true
      log.push("password-dialog-open")
    }
    identityEffect(renderSecurityOpen) // same commit, stale state
    if (openedNow) identityEffect(securityOpen) // re-render after the state change
  }

  return {
    log,
    checks,
    get securityOpen() {
      return securityOpen
    },
    login(next: PasswordSetupUser) {
      user = next
      commit(true)
    },
    // The password saved: the real component calls setUser({hasPassword:true}) and moves to its success step.
    passwordSaved() {
      user = { ...user, hasPassword: true }
      commit(true)
    },
    passwordFailed() {
      commit(false) // toast only; the dialog and user are unchanged
    },
    // Close or Cancel: the component calls onCloseModal → setShowSecurityModal(false).
    closeDialog() {
      securityOpen = false
      log.push("password-dialog-close")
      identityEffect(securityOpen)
    },
  }
}

for (const strict of [false, true]) {
  describe(`dialog ordering lifecycle${strict ? " (StrictMode: every effect runs twice)" : ""}`, () => {
    it("first login: only the password dialog; no identity check", () => {
      const d = dashboard({ strict })
      d.login(emailNoPassword)
      assert.equal(d.securityOpen, true)
      assert.equal(d.checks.started, 0)
      assert.deepEqual(d.log, ["password-dialog-open"])
    })

    it("password saved but dialog still on its success step: still no identity check", () => {
      const d = dashboard({ strict })
      d.login(emailNoPassword)
      d.passwordSaved()
      assert.equal(d.securityOpen, true) // not auto-closed
      assert.equal(d.checks.started, 0)
    })

    it("after the user clicks Close: exactly one real identity check", () => {
      const d = dashboard({ strict })
      d.login(emailNoPassword)
      d.passwordSaved()
      d.closeDialog()
      assert.equal(d.checks.started, 1)
      assert.deepEqual(d.log, ["password-dialog-open", "password-dialog-close", "identity-check"])
      d.closeDialog() // a stray repeat can never start a second check
      assert.equal(d.checks.started, 1)
    })

    it("password failure keeps the dialog open and never starts identity", () => {
      const d = dashboard({ strict })
      d.login(emailNoPassword)
      d.passwordFailed()
      d.passwordFailed()
      assert.equal(d.securityOpen, true)
      assert.equal(d.checks.started, 0)
    })

    it("Cancel closes the dialog but identity still never starts (no password exists)", () => {
      const d = dashboard({ strict })
      d.login(emailNoPassword)
      d.closeDialog()
      assert.equal(d.securityOpen, false)
      assert.equal(d.checks.started, 0)
    })

    it("second login with an existing password: checks immediately, dialog never shown", () => {
      const d = dashboard({ strict })
      d.login(emailWithPassword)
      assert.equal(d.securityOpen, false)
      assert.equal(d.checks.started, 1)
      assert.deepEqual(d.log, ["identity-check"])
    })

    it("social-login talent goes straight to the identity check", () => {
      const d = dashboard({ strict })
      d.login(google)
      assert.equal(d.securityOpen, false)
      assert.equal(d.checks.started, 1)
    })

    it("a later user refresh never starts a second check", () => {
      const d = dashboard({ strict })
      d.login(emailWithPassword)
      d.login(emailWithPassword)
      d.login({ ...emailWithPassword })
      assert.equal(d.checks.started, 1)
    })
  })
}

describe("already-verified identity: the check runs but no gate opens", () => {
  it("a confirmed status other than unstarted/unavailable never opens the gate", () => {
    for (const status of ["verified", "pending", "failed", "in_progress", "failed_final", "expired"] as const) {
      assert.equal(gateReasonForStatus(status as never), null)
    }
    assert.equal(gateReasonForStatus("unstarted"), "unstarted")
  })
  it("the password-first ordering does not change what the check decides", () => {
    const d = dashboard()
    d.login(emailWithPassword)
    assert.equal(d.checks.started, 1) // the real status is then read; verified → gateReasonForStatus null
  })
})

describe("page wiring and boundaries (source guards)", () => {
  const page = read("app", "(group)", "talent-dashboard", "page.tsx")
  const effect = page.slice(
    page.indexOf("// The Identity Verification check (which may open"),
    page.indexOf("// Real required check")
  )

  it("the identity check effect is gated by the pure rule with the real dialog state", () => {
    assert.match(effect, /!shouldStartIdentityCheck\(\{\s+user,\s+isTalent: role === ROLE\.TALENT,\s+securityDialogOpen: showSecurityModal,\s+alreadyStarted: identityStatusCheckStartedRef\.current,/)
    assert.ok(effect.includes("[user, showSecurityModal, runIdentityVerificationCheck]"))
  })

  it("the once-only ref is set only after the guard passes, immediately before the real check", () => {
    const guardEnd = effect.indexOf("      return\n    }\n")
    const refSet = effect.indexOf("identityStatusCheckStartedRef.current = true")
    const call = effect.indexOf("void runIdentityVerificationCheck()")
    assert.ok(guardEnd > -1 && refSet > guardEnd && call > refSet)
    assert.equal((page.match(/identityStatusCheckStartedRef\.current = true/g) ?? []).length, 1)
  })

  it("the password rule is computed from the authenticated user, not from modal state, storage or a flag", () => {
    assert.ok(page.includes("const needsPasswordSetup = isPasswordSetupRequired(safeUser)"))
    const gateSource = read("src", "lib", "api", "identity-check-gate.ts")
    const code = gateSource
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join("\n")
    assert.ok(!/localStorage|sessionStorage|firstLogin|first_login|document\./.test(code))
    assert.ok(/provider === "EMAIL" && !user\?\.hasPassword/.test(code))
    // the effect that gates the check never reads storage
    assert.ok(!/localStorage|sessionStorage/.test(effect))
  })

  it("the dialog is never auto-closed: its only close call is the component's own onCloseModal", () => {
    assert.equal((page.match(/setShowSecurityModal\(false\)/g) ?? []).length, 1)
    assert.ok(page.includes("onCloseModal={() => setShowSecurityModal(false)}"))
    assert.equal((page.match(/setShowSecurityModal\(true\)/g) ?? []).filter(Boolean).length, 1 + (page.includes("// setShowSecurityModal(true)") ? 1 : 0))
  })

  it("the password and login files and the dialog component are untouched by this work", () => {
    const dialog = read("components", "security-settings.tsx")
    assert.ok(!dialog.includes("identity-check-gate"))
    assert.ok(!dialog.includes("shouldStartIdentityCheck"))
    assert.ok(!read("contexts", "auth.tsx").includes("identity-check-gate"))
    assert.ok(!read("service", "http", "auth.ts").includes("identity-check-gate"))
  })
})
