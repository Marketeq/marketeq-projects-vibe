// Run like apply-gate.test.ts (from the frontend/ directory).
// G9 (withdrawals) starts verification in place (PMCM-652 phase 5).
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, it } from "node:test"
import { withdrawalBlockFor } from "./withdrawal-verification"
import { gateWithoutLoadingUi } from "./gate-loading-ui"

const root = process.cwd()
const read = (...p: string[]) => readFileSync(join(root, ...p), "utf8")
const code = (source: string) =>
  source.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")
const count = (source: string, needle: string) =>
  source.split(needle).length - 1

const DIALOG = ["components", "withdraw-funds-dialog.tsx"]
const TRANSFER = ["app", "transfer-funds", "page.tsx"]
const VERIFY = ["app", "verify-withdrawal", "page.tsx"]
const dialog = read(...DIALOG)
const transfer = read(...TRANSFER)
const verify = read(...VERIFY)

const SKIP = new Set([
  "node_modules",
  ".next",
  ".storybook",
  "storybook-static",
  "e2e-cucumber",
])
function sources(dir = root, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith(".")) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) sources(path, out)
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name))
      out.push(path)
  }
  return out
}
const app = sources().map((path) => ({
  file: relative(root, path),
  text: readFileSync(path, "utf8"),
}))
const filesWith = (needle: string) =>
  app
    .filter(({ text }) => text.includes(needle))
    .map(({ file }) => file)
    .sort()
// files that CALL an endpoint: comments (headers, notes) do not count
const filesCalling = (needle: string) =>
  app
    .filter(({ text }) => code(text).includes(needle))
    .map(({ file }) => file)
    .sort()

describe("G9 scope: the withdrawal gate and every screen that reaches it", () => {
  it("the backend gate is the withdrawal route guard on POST /payouts/initiate (unchanged here)", () => {
    const controller = readFileSync(
      join(
        root,
        "..",
        "backend",
        "apps",
        "payout-service",
        "src",
        "payout",
        "payout.controller.ts"
      ),
      "utf8"
    )
    assert.equal(count(controller, "PayoutWithdrawalGateGuard)"), 1)
    assert.match(
      controller,
      /@UseGuards\(JwtAuthGuard, PayoutWithdrawalGateGuard\)\s+@Post\('initiate'\)/
    )
  })

  it("exactly three screens read the gate's answer, and each is covered", () => {
    assert.deepEqual(
      filesWith("withdrawalBlockFor("),
      [
        "components/withdraw-funds-dialog.tsx",
        "app/transfer-funds/page.tsx",
        "app/verify-withdrawal/page.tsx",
        "src/lib/api/withdrawal-verification.ts",
      ].sort()
    )
    assert.deepEqual(
      filesCalling("/payouts/initiate"),
      [
        "components/withdraw-funds-dialog.tsx",
        "app/transfer-funds/page.tsx",
      ].sort()
    )
    assert.deepEqual(filesCalling("/payouts/verify-email"), [
      "app/verify-withdrawal/page.tsx",
    ])
  })

  it("all three use the shared AccountVerificationGate (no dedicated G9 modal), with the same reason mapping", () => {
    for (const source of [dialog, transfer, verify]) {
      assert.equal(count(source, "<AccountVerificationGate"), 1)
      assert.ok(
        source.includes(
          '"verification_unavailable" ? "status_unavailable" : "unstarted"'
        )
      )
      assert.ok(!/Start Verification/.test(source))
    }
  })

  it("the gate's answers stay fail-closed: only 403 VERIFICATION_REQUIRED and 503 IDENTITY_VERIFICATION_UNAVAILABLE block", () => {
    assert.equal(
      withdrawalBlockFor(403, { errorCode: "VERIFICATION_REQUIRED" }),
      "verification_required"
    )
    assert.equal(
      withdrawalBlockFor(503, {
        errorCode: "IDENTITY_VERIFICATION_UNAVAILABLE",
      }),
      "verification_unavailable"
    )
    for (const [status, data] of [
      [401, { errorCode: "VERIFICATION_REQUIRED" }],
      [403, {}],
      [500, { errorCode: "IDENTITY_VERIFICATION_UNAVAILABLE" }],
      [503, null],
    ] as const) {
      assert.equal(withdrawalBlockFor(status, data), null)
    }
  })

  it("the unrelated payout KYC cards (gate-check) have no verification action and were not touched", () => {
    for (const source of [dialog, transfer]) {
      assert.ok(
        source.includes("KYC_NOT_STARTED") &&
          source.includes("Verify Your Identity to Continue")
      )
      assert.ok(source.includes("/payouts/gate-check"))
    }
  })
})

describe("G9 Verify My Account starts verification in place through the shared host", () => {
  for (const [name, source] of [
    ["withdraw dialog", dialog],
    ["transfer-funds page", transfer],
  ] as const) {
    it(`${name}: goVerify closes the popup, then calls the host once, and nothing else`, () => {
      const goVerify = source.slice(
        source.indexOf("const goVerify = () => {"),
        source.indexOf("}", source.indexOf("void startVerification()")) + 1
      )
      assert.equal(count(goVerify, "void startVerification()"), 1)
      assert.ok(
        goVerify.indexOf("setVerificationBlock(null)") <
          goVerify.indexOf("void startVerification()")
      )
      assert.ok(
        !/router|submit|payoutFetch|initiate|window\.location|setStep|setResult/.test(
          goVerify
        )
      )
      assert.ok(
        source.includes("onVerify={goVerify}") &&
          source.includes("onRetryConnectionCheck={goVerify}")
      )
      assert.ok(
        source.includes(
          "onDismissConnectionError={() => setVerificationBlock(null)}"
        )
      )
      assert.equal(count(source, "useIdentityVerification()"), 1)
    })

    it(`${name}: no dashboard navigation and no handoff marker`, () => {
      const c = code(source)
      assert.ok(
        !/talent-dashboard|startVerification=|START_VERIFICATION|start-verification-handoff/.test(
          c
        )
      )
    })
  }

  it("verify-withdrawal: signed in starts verification in place; signed out (a page that must work logged out) keeps its sign-in route", () => {
    assert.ok(verify.includes('import { useAuth } from "@/contexts/auth"'))
    assert.ok(verify.includes("const { user } = useAuth()"))
    assert.ok(
      verify.includes(
        'onVerify={() => (user ? void startVerification() : router.push("/talent-dashboard"))}'
      )
    )
    assert.equal(count(code(verify), "talent-dashboard"), 1)
    assert.equal(count(verify, "useIdentityVerification()"), 1)
    // the retry and dismiss behavior are exactly what they were
    assert.ok(
      verify.includes(
        "onRetryConnectionCheck={() => setRetryTick((t) => t + 1)}"
      )
    )
    assert.ok(
      verify.includes(
        'onDismissConnectionError={() => setState({ kind: "invalid" })}'
      )
    )
  })

  it("the shared gate component keeps its design and non-dismissible default (plus the one approved optional onCancel, absent for this caller)", () => {
    const gate = read("components", "account-verification-gate.tsx")
    // 2026-10-29: the optional `onCancel` prop was added (explicitly approved) for the
    // post-decline retry presentation. G9 passes none, so Escape and outside click stay disabled.
    // Button loading states (approved): the gate gained only the additions gateWithoutLoadingUi takes
    // back out (an optional `retrying` prop, a spinner + aria-busy on Retry and Verify, and reserved
    // width). With them removed it is byte-for-byte the gate this test always pinned; the gate as it
    // is now is pinned too.
    assert.equal(
      createHash("sha256").update(gateWithoutLoadingUi(gate)).digest("hex"),
      "dc6c5d0ca29595da3c544853db3b4d4538679483d1270f753e803a5a1a16dee0"
    )
    assert.equal(
      createHash("sha256").update(gate).digest("hex"),
      "eff8b6e88fd430ba53344fa07743fe8a46883863a223d8022019e24f361bf8fb"
    )
    assert.ok(gate.includes("onEscapeKeyDown={cancel ? undefined : (e) => e.preventDefault()}"))
    assert.ok(!read("components", "withdraw-funds-dialog.tsx").includes("onCancel="))
  })
})

describe("G9: nothing financial is retried, submitted or written because of verification", () => {
  it("the withdrawal is requested from one place per screen, only by a user click", () => {
    for (const source of [dialog, transfer]) {
      assert.equal(count(code(source), "/payouts/initiate"), 1)
      const lines = code(source)
        .split("\n")
        .filter(
          (line) =>
            /(^|[^\w])submit\(\)|\{submit\}/.test(line) &&
            !/const submit/.test(line)
        )
      assert.ok(lines.length >= 1)
      for (const line of lines)
        assert.ok(
          line.includes("onClick"),
          `submit() is only called from a click: ${line.trim().slice(0, 80)}`
        )
    }
  })

  it("the blocked branch stops before any other handling, and nothing runs on its own afterwards", () => {
    for (const source of [dialog, transfer]) {
      const at = source.indexOf("withdrawalBlockFor(res.status, data)")
      assert.ok(
        source
          .slice(at, at + 160)
          .includes(
            "if (block) { setSubmitting(false); setVerificationBlock(block); return }"
          )
      )
    }
    // verify-withdrawal re-reads the link only when it is opened or the unavailable popup's Retry is chosen
    assert.ok(verify.includes("}, [token, id, retryTick])"))
    assert.ok(
      !/flowOpen|subscribeStatusRefreshed|IDENTITY_STATUS_REFRESHED|onClosed/.test(
        verify
      )
    )
    for (const source of [dialog, transfer, verify]) {
      assert.ok(
        !/subscribeStatusRefreshed|IDENTITY_STATUS_REFRESHED|openFlow\(|useIdentityVerificationObserver/.test(
          source
        )
      )
    }
  })

  it("no payout, balance, fee, method or schedule logic changed: the same endpoints and the same session handling", () => {
    const endpoints = (source: string) =>
      [
        ...new Set(
          [
            ...source.matchAll(
              /PAYOUT_SERVICE_URL\}(\/[A-Za-z0-9_\-/${}.?=&]+)/g
            ),
          ].map((m) => m[1])
        ),
      ].sort()
    assert.deepEqual(endpoints(dialog), [
      "/deposit-methods",
      "/payouts/${payoutId}",
      "/payouts/${result.payoutRequestId}/resend-verification",
      "/payouts/gate-check",
      "/payouts/initiate",
      "/payouts/schedule",
      "/payouts/validate-amount",
    ])
    assert.deepEqual(endpoints(transfer), [
      "/deposit-methods",
      "/payouts/${result.payoutRequestId}/resend-verification",
      "/payouts/gate-check",
      "/payouts/initiate",
      "/payouts/schedule",
      "/payouts/validate-amount",
    ])
    assert.deepEqual(endpoints(verify), [
      "/payouts/${id}/resend-verification",
      "/payouts/verify-email?token=${encodeURIComponent",
    ])
    // a 401 still tries one refresh and then goes to the existing sign-in redirect
    for (const source of [dialog, transfer]) {
      assert.ok(source.includes("if (res.status !== 401) return res"))
      assert.ok(source.includes("/auth/refresh"))
      assert.ok(source.includes("sessionExpired=1"))
    }
  })
})

describe("G9 does not touch the other gates, and the host stays single", () => {
  it("G2, G3 and G8 keep what they have", () => {
    assert.ok(
      read("utils", "CreateListingGateHost.tsx").includes(
        "void startVerification()"
      )
    )
    assert.ok(
      read("utils", "useApplyGate.tsx").includes(
        "const goVerify = () => {\n    setBlock(null)\n    void startVerification()\n  }"
      )
    )
    assert.ok(
      read("utils", "useStartTimeGate.tsx").includes(
        "const goVerify = () => {\n    setBlock(null)\n    void startVerification()\n  }"
      )
    )
    assert.ok(
      read("app", "(group)", "time-tracking", "page.tsx").includes(
        "onStartVerification={startVerification}"
      )
    )
  })

  it("the old dashboard handoff module still exists (G2 no longer uses it)", () => {
    assert.ok(
      read("src", "lib", "api", "start-verification-handoff.ts").includes(
        "START_VERIFICATION_HREF"
      )
    )
    assert.ok(
      read("app", "(group)", "talent-dashboard", "page.tsx").includes(
        "startVerificationRequestedInBrowser"
      )
    )
  })

  it("there is still one provider, one flow and one gate instance, and no G9 file renders them", () => {
    assert.deepEqual(filesWith("<IdentityVerificationHostProvider"), [
      "app/layout.tsx",
    ])
    for (const source of [dialog, transfer, verify]) {
      assert.ok(!source.includes("<IdentityVerificationFlow"))
      assert.ok(!source.includes('reason="unstarted"'))
    }
  })
})
