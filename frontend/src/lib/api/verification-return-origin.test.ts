// Run like status-alerts.test.ts (from the frontend/ directory).
//
// After the external Didit website the talent comes back to the exact page verification started
// on, and the result dialog and alert appear there. The pure module is exercised for real; the
// host wiring is pinned from source (there is no React render harness in this project).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { confirmHomeCountryAndStartFreeKyc } from "./free-kyc"
import { startIdentityOnly } from "./identity-next-step"
import {
  RETURN_ORIGIN_MAX_ENTRIES,
  RETURN_ORIGIN_TTL_MS,
  type ReturnOriginStorage,
  buildHandoffTarget,
  consumeReturnOrigin,
  hasReturnOrigin,
  markReturnOrigin,
  returnOriginKey,
  sanitizeReturnPath,
  shouldHandOffReturn,
} from "./verification-return-origin"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const host = read("contexts", "identity-verification-host.tsx")
const freeKyc = read("src", "lib", "api", "free-kyc.ts")
const nextStep = read("src", "lib", "api", "identity-next-step.ts")

const A = "user-a"
const B = "user-b"
const HOSTED = "https://verify.didit.me/session/abc123"
const memory = (): ReturnOriginStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}
const start = (
  s: ReturnOriginStorage,
  path: string,
  user = A,
  hostedUrl = HOSTED,
  now?: number
) => markReturnOrigin({ storage: s, userId: user, path, hostedUrl, now })

describe("1-3. the return goes back to the page verification started on", () => {
  for (const path of [
    "/my-listings",
    "/time-tracking",
    "/earnings",
    "/transfer-funds",
    "/verify-withdrawal",
  ]) {
    it(`started on ${path} returns to ${path}`, () => {
      const s = memory()
      assert.equal(start(s, path), true)
      const origin = consumeReturnOrigin({ storage: s, userId: A })
      assert.equal(origin, path)
      assert.equal(
        buildHandoffTarget(origin!, "?status=In+Review"),
        `${path}?status=In+Review`
      )
    })
  }

  it("a job page keeps its slug and its own query", () => {
    const s = memory()
    start(s, "/job-details/ux-designer-123?ref=search&tab=scope#apply")
    const origin = consumeReturnOrigin({ storage: s, userId: A })
    assert.equal(
      origin,
      "/job-details/ux-designer-123?ref=search&tab=scope",
      "hash is not kept"
    )
    assert.equal(
      buildHandoffTarget(
        origin!,
        "?verificationSessionId=sess-1&status=In+Review"
      ),
      "/job-details/ux-designer-123?ref=search&tab=scope&verificationSessionId=sess-1&status=In+Review"
    )
  })

  it("the host hands off before painting, never processes the result on the dashboard, and processes it on the origin page", () => {
    assert.match(
      host,
      /useLayoutEffect\(\(\) => \{\s+if \(handoffDecidedRef\.current\) return/
    )
    assert.ok(host.includes("router.replace(target)"))
    assert.ok(host.includes("{handingOff ? null : children}"))
    // the Didit-return handling is skipped while handing off and re-runs on the origin page
    assert.match(
      host,
      /if \(handoffRef\.current\) return\s+let cancelled = false/
    )
    assert.ok(
      host.includes("}, [user, startAlertReconcile, hostActive, returnGen])")
    )
    assert.match(
      host,
      /pathname !== handoff\.pathname\) return[\s\S]*?setReturnGen/
    )
  })
})

describe("4. a start on the dashboard keeps returning to the dashboard", () => {
  it("the dashboard (and its trailing slash) store nothing, so nothing is handed off", () => {
    const s = memory()
    assert.equal(start(s, "/talent-dashboard"), false)
    assert.equal(start(s, "/talent-dashboard/"), false)
    assert.equal(start(s, "/talent-dashboard?startVerification=1"), false)
    assert.equal(s.data.size, 0)
    assert.equal(consumeReturnOrigin({ storage: s, userId: A }), null)
  })
})

describe("5. every callback parameter is preserved", () => {
  it("carries all of them, in order, including repeated names; the callback wins on a clash", () => {
    assert.equal(
      buildHandoffTarget(
        "/my-listings",
        "?verificationSessionId=s1&status=In+Review&x=1&x=2"
      ),
      "/my-listings?verificationSessionId=s1&status=In+Review&x=1&x=2"
    )
    assert.equal(
      buildHandoffTarget("/p?status=old&keep=1", "?status=new"),
      "/p?keep=1&status=new"
    )
    assert.equal(buildHandoffTarget("/my-listings", ""), "/my-listings")
    assert.equal(buildHandoffTarget("/my-listings", undefined), "/my-listings")
  })
})

describe("6. invalid or external destinations fall back to the dashboard", () => {
  const bad = [
    "https://evil.example/x",
    "http://evil.example",
    "//evil.example/x",
    "/\\evil.example",
    "/ok\\..\\x",
    "javascript:alert(1)",
    "data:text/html,x",
    "my-listings",
    "",
    "/sign-in",
    "/sign-in?next=/my-listings",
    "/sign-up",
    "/forgot-password",
    "/onboarding/talent",
    "/identity-verification-preview",
    "/api/auth/logout",
    "/_next/static/x.js",
    "/a b",
    "/a\nb",
    "/" + "a".repeat(2100),
  ]
  for (const raw of bad) {
    it(`refuses ${JSON.stringify(raw.slice(0, 40))}`, () => {
      const s = memory()
      assert.equal(sanitizeReturnPath(raw), null)
      assert.equal(start(s, raw), false)
      assert.equal(s.data.size, 0)
    })
  }

  it("a stored value tampered with after the fact is refused on the way out", () => {
    const s = memory()
    s.data.set(
      returnOriginKey(A),
      JSON.stringify([{ p: "https://evil.example", k: "", at: Date.now() }])
    )
    assert.equal(consumeReturnOrigin({ storage: s, userId: A }), null)
    assert.equal(buildHandoffTarget("https://evil.example", ""), null)
    assert.equal(buildHandoffTarget("//evil.example", ""), null)
  })

  it("malformed, expired or future-dated records, and unavailable storage, all fall back", () => {
    const s = memory()
    s.data.set(returnOriginKey(A), "{not json")
    assert.equal(consumeReturnOrigin({ storage: s, userId: A }), null)
    start(s, "/my-listings", A, HOSTED, 1_000)
    assert.equal(
      consumeReturnOrigin({
        storage: s,
        userId: A,
        now: 1_000 + RETURN_ORIGIN_TTL_MS + 1,
      }),
      null
    )
    start(s, "/my-listings", A, HOSTED, 5_000)
    assert.equal(
      consumeReturnOrigin({ storage: s, userId: A, now: 1_000 }),
      null,
      "future-dated"
    )
    const broken: ReturnOriginStorage = {
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
    assert.doesNotThrow(() => start(broken, "/my-listings"))
    assert.equal(consumeReturnOrigin({ storage: broken, userId: A }), null)
    assert.equal(consumeReturnOrigin({ storage: undefined, userId: A }), null)
    assert.equal(
      start(memory(), "/my-listings", "" as never),
      false,
      "no account"
    )
  })
})

describe("7. another account cannot consume the stored origin", () => {
  it("is read per account", () => {
    const s = memory()
    start(s, "/my-listings", A)
    assert.equal(consumeReturnOrigin({ storage: s, userId: B }), null)
    assert.equal(hasReturnOrigin(s, B), false)
    assert.equal(hasReturnOrigin(s, A), true)
    assert.equal(consumeReturnOrigin({ storage: s, userId: A }), "/my-listings")
  })
})

describe("8. a refresh or Back never replays the result", () => {
  it("an origin is consumed once", () => {
    const s = memory()
    start(s, "/my-listings")
    assert.equal(consumeReturnOrigin({ storage: s, userId: A }), "/my-listings")
    assert.equal(consumeReturnOrigin({ storage: s, userId: A }), null)
    assert.equal(s.data.size, 0)
  })

  it("only a fresh navigation onto the dashboard callback is handed off", () => {
    const base = { pathname: "/talent-dashboard", awaitingResult: true }
    assert.equal(
      shouldHandOffReturn({ ...base, navigationType: "navigate" }),
      true
    )
    for (const type of [
      "reload",
      "back_forward",
      "prerender",
      undefined,
      null,
    ]) {
      assert.equal(
        shouldHandOffReturn({ ...base, navigationType: type }),
        false
      )
    }
  })

  it("it never fires off the dashboard, so it cannot loop, and needs the awaiting flag", () => {
    assert.equal(
      shouldHandOffReturn({
        pathname: "/my-listings",
        navigationType: "navigate",
        awaitingResult: true,
      }),
      false
    )
    assert.equal(
      shouldHandOffReturn({
        pathname: "/talent-dashboard",
        navigationType: "navigate",
        awaitingResult: false,
      }),
      false
    )
    assert.equal(
      sanitizeReturnPath("/talent-dashboard"),
      null,
      "the destination can never be the dashboard"
    )
  })
})

describe("9. several verification sessions do not consume each other's origins", () => {
  it("a different hosted link is a separate entry; each return consumes only its own", () => {
    const s = memory()
    start(s, "/my-listings", A, "https://verify.didit.me/session/one")
    start(s, "/time-tracking", A, "https://verify.didit.me/session/two")
    assert.equal(
      consumeReturnOrigin({
        storage: s,
        userId: A,
        callbackSearch: "?verificationSessionId=one",
      }),
      "/my-listings"
    )
    assert.equal(
      hasReturnOrigin(s, A),
      true,
      "the other session's origin is untouched"
    )
    assert.equal(
      consumeReturnOrigin({
        storage: s,
        userId: A,
        callbackSearch: "?verificationSessionId=two",
      }),
      "/time-tracking"
    )
    assert.equal(hasReturnOrigin(s, A), false)
  })

  it("without a naming parameter the most recent start is used, and only it is consumed", () => {
    const s = memory()
    start(s, "/my-listings", A, "https://verify.didit.me/session/one")
    start(s, "/earnings", A, "https://verify.didit.me/session/two")
    assert.equal(consumeReturnOrigin({ storage: s, userId: A }), "/earnings")
    assert.equal(consumeReturnOrigin({ storage: s, userId: A }), "/my-listings")
  })

  it("restarting the same session (the 15-minute resume) replaces its origin instead of piling up", () => {
    const s = memory()
    start(s, "/my-listings")
    start(s, "/time-tracking")
    assert.equal(JSON.parse(s.data.get(returnOriginKey(A))!).length, 1)
    assert.equal(
      consumeReturnOrigin({ storage: s, userId: A }),
      "/time-tracking"
    )
  })

  it("the list is bounded", () => {
    const s = memory()
    for (let i = 0; i < RETURN_ORIGIN_MAX_ENTRIES + 4; i++)
      start(s, `/p${i}`, A, `https://verify.didit.me/session/s${i}`)
    assert.equal(
      JSON.parse(s.data.get(returnOriginKey(A))!).length,
      RETURN_ORIGIN_MAX_ENTRIES
    )
  })
})

describe("10. no blocked action is retried", () => {
  it("the hand-off only navigates; it calls no gate, launcher or original action", () => {
    const block = host.slice(
      host.indexOf("// Back from Didit."),
      host.indexOf("// Held in a ref so rerenders")
    )
    assert.ok(block.length > 500)
    assert.ok(
      !/runApply|retry|openFlow|startVerification|onVerified|pendingAction|runStart|create\w*Draft/.test(
        block.replace(/startVerification:/g, "")
      )
    )
  })

  it("the origin is stored only by the Didit start paths, which carry no action", () => {
    assert.ok(freeKyc.includes("markReturnOrigin"))
    assert.ok(nextStep.includes("markReturnOrigin"))
  })
})

describe("11. the 15-minute resume and the session start are unchanged", () => {
  it("a resumed Didit-only start records the origin just before redirecting, in the same order", async () => {
    const calls: string[] = []
    const outcome = await startIdentityOnly({
      startFreeKyc: async () => ({ data: { url: HOSTED } }),
      markAwaitingResult: () => void calls.push("awaiting"),
      markReturnOrigin: (url) => void calls.push(`origin:${url}`),
      redirect: (url) => void calls.push(`redirect:${url}`),
    })
    assert.equal(outcome, "redirected")
    assert.deepEqual(calls, [
      "awaiting",
      `origin:${HOSTED}`,
      `redirect:${HOSTED}`,
    ])
  })

  it("a stale confirmation still asks for the location again and records nothing", async () => {
    const calls: string[] = []
    const outcome = await startIdentityOnly({
      startFreeKyc: async () => {
        throw {
          response: {
            status: 409,
            data: { code: "HOME_COUNTRY_CONFIRMATION_REQUIRED" },
          },
        }
      },
      markReturnOrigin: () => void calls.push("origin"),
      redirect: () => void calls.push("redirect"),
    })
    assert.equal(outcome, "needs_location")
    assert.deepEqual(calls, [])
  })

  it("the location-first start records the origin, then redirects; a failure records nothing", async () => {
    const calls: string[] = []
    const ok = await confirmHomeCountryAndStartFreeKyc({
      confirmHomeCountry: async () => ({}),
      startFreeKyc: async () => ({ data: { url: HOSTED } }),
      markAwaitingResult: () => void calls.push("awaiting"),
      markHomeCountryChange: () => void calls.push("change"),
      markReturnOrigin: () => void calls.push("origin"),
      redirect: () => void calls.push("redirect"),
    })
    assert.equal(ok, "redirected")
    assert.deepEqual(calls, ["awaiting", "change", "origin", "redirect"])
    const bad: string[] = []
    const failed = await confirmHomeCountryAndStartFreeKyc({
      confirmHomeCountry: async () => ({}),
      startFreeKyc: async () => ({ data: { url: "https://evil.example/x" } }),
      markReturnOrigin: () => void bad.push("origin"),
      redirect: () => void bad.push("redirect"),
    })
    assert.equal(failed, "failed")
    assert.deepEqual(bad, [])
  })

  it("the Didit URL allow-list, the callback the backend builds and the backend itself are untouched", () => {
    assert.ok(freeKyc.includes('const ALLOWED_HOST_SUFFIXES = ["didit.me"]'))
    assert.ok(
      !/returnPath|callbackUrl/.test(freeKyc + nextStep),
      "nothing is sent to the backend"
    )
  })
})

describe("12. an existing bookmarked dashboard callback URL still works", () => {
  it("with no stored origin there is no hand-off: the dashboard handles it as before", () => {
    const s = memory()
    assert.equal(
      consumeReturnOrigin({
        storage: s,
        userId: A,
        callbackSearch: "?verificationSessionId=s1&status=Approved",
      }),
      null
    )
    assert.equal(buildHandoffTarget("/my-listings", ""), "/my-listings")
    assert.match(
      host,
      /const target = origin \? buildHandoffTarget\(origin, search\) : null\s+if \(!target\) return/
    )
  })

  it("signed-out and public-page behaviour is untouched: the hand-off needs an active host and a talent", () => {
    assert.match(
      host,
      /if \(!hostActive \|\| !user \|\| resolveDashboardRole\(user\) !== ROLE\.TALENT\) return\s+handoffDecidedRef\.current = true/
    )
  })
})
