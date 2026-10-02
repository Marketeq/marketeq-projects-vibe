// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { confirmHomeCountryAndStartFreeKyc } from "./free-kyc"
import {
  AWAITING_RESULT_KEY,
  AWAITING_RESULT_TTL_MS,
  checkVerificationSummary,
  clearAwaitingResult,
  hasAwaitingResult,
  isIdentityAndLocationVerified,
  markAwaitingResult,
  type KeyValueStorage,
} from "./identity-verification-status"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

describe("success trigger condition", () => {
  it("requires BOTH identity and location verified", () => {
    const ok = { identity: "verified", location: "verified" }
    assert.equal(isIdentityAndLocationVerified(ok), true)
    assert.equal(isIdentityAndLocationVerified({ ...ok, location: "not_verified" }), false)
    assert.equal(isIdentityAndLocationVerified({ ...ok, identity: "pending" }), false)
    assert.equal(isIdentityAndLocationVerified({ ...ok, identity: "in_progress" }), false)
    assert.equal(isIdentityAndLocationVerified({ ...ok, identity: "failed" }), false)
    assert.equal(isIdentityAndLocationVerified("unavailable"), false)
  })

  it("reads the server summary and treats any failure or bad shape as unavailable", async () => {
    assert.deepEqual(
      await checkVerificationSummary({
        fetchSummary: async () => ({ identity: "verified", location: "verified" }),
      }),
      { identity: "verified", location: "verified" }
    )
    assert.equal(
      await checkVerificationSummary({
        fetchSummary: async () => {
          throw new Error("503")
        },
      }),
      "unavailable"
    )
    assert.equal(
      await checkVerificationSummary({
        fetchSummary: async () => ({ identity: 1 }) as never,
      }),
      "unavailable"
    )
  })
})

describe("awaiting-result flag (only a browser that went to Didit sees the result)", () => {
  it("is false until set, true after, and cleared when consumed", () => {
    const s = memoryStorage()
    assert.equal(hasAwaitingResult(s), false)
    markAwaitingResult(s, 1_000)
    assert.equal(hasAwaitingResult(s, 2_000), true)
    clearAwaitingResult(s)
    assert.equal(hasAwaitingResult(s, 2_000), false)
  })

  it("expires, so an abandoned attempt never surfaces a stale message", () => {
    const s = memoryStorage()
    markAwaitingResult(s, 1_000)
    assert.equal(hasAwaitingResult(s, 1_000 + AWAITING_RESULT_TTL_MS + 1), false)
    assert.equal(s.data.has(AWAITING_RESULT_KEY), false)
  })

  it("ignores a corrupt or future-dated value and survives a missing or throwing storage", () => {
    const s = memoryStorage()
    s.data.set(AWAITING_RESULT_KEY, "garbage")
    assert.equal(hasAwaitingResult(s), false)
    s.data.set(AWAITING_RESULT_KEY, String(9_999_999_999_999))
    assert.equal(hasAwaitingResult(s, 1_000), false)
    assert.equal(hasAwaitingResult(undefined), false)
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error("blocked")
      },
      setItem: () => {
        throw new Error("blocked")
      },
      removeItem: () => {
        throw new Error("blocked")
      },
    }
    assert.doesNotThrow(() => markAwaitingResult(broken))
    assert.equal(hasAwaitingResult(broken), false)
    assert.doesNotThrow(() => clearAwaitingResult(broken))
  })
})

describe("flag is set only when the browser really leaves for Didit", () => {
  const base = {
    confirmHomeCountry: async () => ({}),
    startFreeKyc: async () => ({ data: { url: "https://verify.didit.me/session/x" } }),
    redirect: () => undefined,
  }

  it("marks before redirecting on success", async () => {
    const order: string[] = []
    const outcome = await confirmHomeCountryAndStartFreeKyc({
      ...base,
      markAwaitingResult: () => void order.push("mark"),
      redirect: () => void order.push("redirect"),
    })
    assert.equal(outcome, "redirected")
    assert.deepEqual(order, ["mark", "redirect"])
  })

  it("does not mark on an invalid URL, a failure, or a not-startable account", async () => {
    let marked = 0
    const mark = () => void marked++
    const quiet = console.error
    console.error = () => undefined
    try {
      await confirmHomeCountryAndStartFreeKyc({
        ...base,
        startFreeKyc: async () => ({ data: { url: "http://evil.example/x" } }),
        markAwaitingResult: mark,
      })
      await confirmHomeCountryAndStartFreeKyc({
        ...base,
        startFreeKyc: async () => {
          throw new Error("boom")
        },
        markAwaitingResult: mark,
      })
      await confirmHomeCountryAndStartFreeKyc({
        ...base,
        startFreeKyc: async () => {
          throw { response: { status: 409, data: { code: "IDENTITY_VERIFICATION_NOT_STARTABLE" } } }
        },
        refreshIdentityStatus: async () => "verified",
        publishStatus: () => undefined,
        markAwaitingResult: mark,
      })
    } finally {
      console.error = quiet
    }
    assert.equal(marked, 0)
  })
})

describe("dashboard wiring and Figma/Storybook fidelity (source guards)", () => {
  const page = read("app", "(group)", "talent-dashboard", "page.tsx")
  const modalStart = page.indexOf("<Dialog open={verifiedModalOpen}")
  const modal = page.slice(
    modalStart,
    page.indexOf("<AccountVerificationGate", modalStart)
  )

  it("never reads a verification result from the URL", () => {
    assert.ok(!/useSearchParams|location\.search|searchParams|URLSearchParams/.test(page))
  })

  it("shows the modal only from the checked server result and clears the flag first", () => {
    assert.match(
      page,
      /shouldShowSuccessModal\(summary\)\) \{\s+clearAwaitingResult\(window\.localStorage\)[\s\S]*?setVerifiedModalOpen\(true\)/
    )
    assert.ok(page.includes('document.addEventListener("visibilitychange"'))
    assert.ok(page.includes("RESULT_POLL_MAX_ATTEMPTS"))
  })

  it("matches the Figma values and the Storybook AllSet markup, with the exact copy", () => {
    for (const expected of [
      "max-w-[456px] pt-[50px]",
      "size-12 rounded-full border-[8px]",
      "text-success-600 border-success-50 bg-success-100",
      "size-6",
      "text-lg text-center text-dark-blue-400 mt-5 font-semibold leading-7",
      "text-sm text-center text-dark-blue-400 leading-5 mt-2",
      "mt-[50px] grid",
      "You’re all set!",
      "Your identity and location have been successfully verified. You can",
      "now access all platform features.",
      ">Done</Button>",
    ]) {
      assert.ok(modal.includes(expected), expected)
    }
  })

  it("composes only existing design-system components (no new component, no raw button)", () => {
    assert.ok(!/<button[\s>]|<dialog[\s>]/.test(modal))
  })
})
