// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  NEXT_ACTIONS,
  RETURN_RECONCILED_FOR_KEY,
  createReturnReconciler,
  fetchIdentityVerificationSummary,
  mapNextActionToFlowState,
  parseIdentityVerificationSummary,
  shouldShowSuccessModal,
  type IdentityFlowState,
} from "./identity-verification-state"
import {
  AWAITING_RESULT_KEY,
  RESULT_POLL_INTERVAL_MS,
  RESULT_POLL_MAX_ATTEMPTS,
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

const EXPECTED: Record<string, IdentityFlowState> = {
  confirm_location: "confirm-location",
  start_identity: "start-identity",
  continue_identity: "continue-identity",
  await_review: "await-review",
  retry_identity: "retry-identity",
  wait_for_retry: "wait-for-retry",
  reverify_identity: "reverify-identity",
  complete: "complete",
}

const body = (over: Record<string, unknown> = {}) => ({
  identityVerificationStatus: "failed",
  locationVerificationStatus: "verified",
  fullyVerified: false,
  attemptsUsed: 1,
  attemptsRemaining: 2,
  maxAttempts: 3,
  canRetry: true,
  retryAvailableAt: null,
  hasActiveSession: false,
  nextAction: "retry_identity",
  ...over,
})

describe("nextAction → internal state (one centralized mapping)", () => {
  it("the contract list is exactly the backend's eight values", () => {
    assert.deepEqual([...NEXT_ACTIONS], Object.keys(EXPECTED))
  })

  for (const [action, state] of Object.entries(EXPECTED)) {
    it(`parses ${action} → ${state}`, () => {
      const parsed = parseIdentityVerificationSummary(body({ nextAction: action }))
      assert.ok(parsed)
      assert.equal(parsed.nextAction, action)
      assert.equal(parsed.flowState, state)
      assert.equal(mapNextActionToFlowState(action), state)
    })
  }

  it("passes the append-only summary fields through exactly as the backend sent them", () => {
    const parsed = parseIdentityVerificationSummary(
      body({ nextAction: "wait_for_retry", attemptsUsed: 3, attemptsRemaining: 0, canRetry: false, retryAvailableAt: "2026-10-02T12:00:00.000Z", hasActiveSession: true, fullyVerified: false })
    )
    assert.deepEqual(parsed, {
      flowState: "wait-for-retry",
      nextAction: "wait_for_retry",
      fullyVerified: false,
      attemptsUsed: 3,
      attemptsRemaining: 0,
      maxAttempts: 3,
      canRetry: false,
      retryAvailableAt: "2026-10-02T12:00:00.000Z",
      hasActiveSession: true,
    })
  })

  describe("an unknown or malformed nextAction fails safely", () => {
    for (const bad of [undefined, null, "", "COMPLETE", "Complete", "complete ", "start_verification", "account_blocked", "constructor", "__proto__", "toString", 7, true, {}, []]) {
      it(`${JSON.stringify(bad) ?? "undefined"} → unknown, never success`, () => {
        assert.equal(mapNextActionToFlowState(bad), "unknown")
        const parsed = parseIdentityVerificationSummary(body({ nextAction: bad }))
        assert.ok(parsed)
        assert.equal(parsed.flowState, "unknown")
        assert.equal(parsed.nextAction, null)
        assert.equal(shouldShowSuccessModal(parsed), false)
      })
    }

    it("a missing nextAction is unknown even when other fields look finished (no frontend inference)", () => {
      const withoutAction = body({ fullyVerified: true, identityVerificationStatus: "verified" }) as Record<string, unknown>
      delete withoutAction.nextAction
      const parsed = parseIdentityVerificationSummary(withoutAction)
      assert.equal(parsed?.flowState, "unknown")
      assert.equal(shouldShowSuccessModal(parsed), false)
    })

    it("fullyVerified never overrides nextAction", () => {
      const parsed = parseIdentityVerificationSummary(body({ fullyVerified: true, nextAction: "wait_for_retry" }))
      assert.equal(parsed?.flowState, "wait-for-retry")
      assert.equal(shouldShowSuccessModal(parsed), false)
    })

    it("a non-object body is unavailable (null), never a state", () => {
      for (const raw of [null, undefined, "<html>", 5, [], true]) {
        assert.equal(parseIdentityVerificationSummary(raw), null)
      }
    })

    it("wrong-typed summary fields become null instead of being trusted", () => {
      const parsed = parseIdentityVerificationSummary(
        body({ attemptsUsed: "2", attemptsRemaining: -1, maxAttempts: Number.NaN, canRetry: "yes", retryAvailableAt: 5, hasActiveSession: 1, fullyVerified: "true" })
      )
      assert.deepEqual(
        [parsed?.attemptsUsed, parsed?.attemptsRemaining, parsed?.maxAttempts, parsed?.canRetry, parsed?.retryAvailableAt, parsed?.hasActiveSession, parsed?.fullyVerified],
        [null, null, null, null, null, null, null]
      )
    })
  })
})

describe("success behavior is unchanged: only complete opens the success dialog", () => {
  it("complete → true", () => {
    assert.equal(shouldShowSuccessModal(parseIdentityVerificationSummary(body({ nextAction: "complete", fullyVerified: true }))), true)
  })
  for (const action of NEXT_ACTIONS.filter((a) => a !== "complete")) {
    it(`${action} → false`, () => {
      assert.equal(shouldShowSuccessModal(parseIdentityVerificationSummary(body({ nextAction: action }))), false)
    })
  }
  it("unavailable (null) → false", () => {
    assert.equal(shouldShowSuccessModal(null), false)
  })
})

describe("fetchIdentityVerificationSummary", () => {
  it("returns the parsed /me and treats any failure as unavailable", async () => {
    const ok = await fetchIdentityVerificationSummary(async () => body({ nextAction: "complete" }))
    assert.equal(ok?.flowState, "complete")
    assert.equal(
      await fetchIdentityVerificationSummary(async () => {
        throw new Error("503")
      }),
      null
    )
    assert.equal(await fetchIdentityVerificationSummary(async () => "not json"), null)
  })
})

describe("return reconciliation: reconcile once, then /me", () => {
  const setup = (over: { reconcile?: () => Promise<unknown>; status?: () => Promise<unknown>; flag?: string | null } = {}) => {
    const awaitingStorage = memoryStorage()
    const markerStorage = memoryStorage()
    if (over.flag !== null) awaitingStorage.data.set(AWAITING_RESULT_KEY, over.flag ?? "1000")
    const calls: string[] = []
    const deps = {
      awaitingStorage,
      markerStorage,
      reconcile: async () => {
        calls.push("reconcile")
        return over.reconcile ? over.reconcile() : { outcome: "updated" }
      },
      fetchStatus: async () => {
        calls.push("me")
        return over.status ? over.status() : body({ nextAction: "complete", fullyVerified: true })
      },
    }
    return { deps, calls, awaitingStorage, markerStorage }
  }

  it("calls reconciliation exactly once and then GET /me, and uses /me's nextAction", async () => {
    const { deps, calls } = setup()
    const result = await createReturnReconciler(deps).run()
    assert.deepEqual(calls, ["reconcile", "me"]) // reconcile first, then the authoritative read
    assert.equal(result.reconcile, "ok")
    assert.equal(result.summary?.flowState, "complete")
  })

  it("the state comes from /me, never from the reconcile response body", async () => {
    const { deps } = setup({ reconcile: async () => ({ outcome: "updated", nextAction: "complete" }), status: async () => body({ nextAction: "await_review" }) })
    const result = await createReturnReconciler(deps).run()
    assert.equal(result.summary?.flowState, "await-review")
    assert.equal(shouldShowSuccessModal(result.summary), false)
  })

  it("rerenders and repeated calls (StrictMode's double effect) do not duplicate the call", async () => {
    const { deps, calls } = setup()
    const reconciler = createReturnReconciler(deps)
    const first = reconciler.run()
    const results = await Promise.all([first, reconciler.run(), reconciler.run(), reconciler.run()])
    await reconciler.run() // a later rerender
    assert.equal(calls.filter((c) => c === "reconcile").length, 1)
    assert.equal(calls.filter((c) => c === "me").length, 1)
    assert.ok(results.every((r) => r === results[0])) // the very same result
  })

  it("the success marker is written only AFTER the POST succeeds, never during it", async () => {
    let markerDuringCall: string | null = "unset"
    const { deps, markerStorage } = setup({
      flag: "5555",
      reconcile: async () => {
        markerDuringCall = markerStorage.getItem(RETURN_RECONCILED_FOR_KEY)
        return { outcome: "unchanged" }
      },
    })
    await createReturnReconciler(deps).run()
    assert.equal(markerDuringCall, null)
    assert.equal(markerStorage.getItem(RETURN_RECONCILED_FOR_KEY), "5555")
  })

  it("1. concurrent calls (separate reconcilers, e.g. a remount mid-flight) produce one POST", async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    const { deps, calls } = setup({ reconcile: () => gate.then(() => ({ outcome: "updated" })) })
    const runs = [createReturnReconciler(deps).run(), createReturnReconciler(deps).run(), createReturnReconciler(deps).run()]
    release()
    const results = await Promise.all(runs)
    assert.equal(calls.filter((c) => c === "reconcile").length, 1)
    assert.ok(results.every((r) => r.reconcile === "ok"))
  })

  it("2. StrictMode-style duplicate effects (same reconciler, run twice back to back) produce one POST", async () => {
    const { deps, calls } = setup()
    const reconciler = createReturnReconciler(deps)
    const [a, b] = await Promise.all([reconciler.run(), reconciler.run()])
    assert.equal(calls.filter((c) => c === "reconcile").length, 1)
    assert.equal(a, b)
  })

  it("3. a failed POST followed by a remount retries, and leaves no completed marker", async () => {
    let fail = true
    const { deps, calls, markerStorage } = setup({
      flag: "9000",
      reconcile: async () => {
        if (fail) throw new Error("502")
        return { outcome: "updated" }
      },
    })
    const first = await createReturnReconciler(deps).run()
    assert.equal(first.reconcile, "failed")
    assert.equal(markerStorage.getItem(RETURN_RECONCILED_FOR_KEY), null)
    fail = false
    const second = await createReturnReconciler(deps).run() // reload / remount, same return
    assert.equal(second.reconcile, "ok")
    assert.equal(calls.filter((c) => c === "reconcile").length, 2)
    assert.equal(markerStorage.getItem(RETURN_RECONCILED_FOR_KEY), "9000")
  })

  it("4. a successful POST followed by a remount does not retry", async () => {
    const { deps, calls } = setup({ flag: "9100" })
    await createReturnReconciler(deps).run()
    const again = await createReturnReconciler(deps).run()
    assert.equal(again.reconcile, "skipped")
    assert.equal(calls.filter((c) => c === "reconcile").length, 1)
  })

  it("5. a failed POST still reads /me, and so does a skipped one", async () => {
    const { deps, calls } = setup({
      reconcile: async () => {
        throw new Error("502")
      },
      status: async () => body({ nextAction: "await_review" }),
    })
    const result = await createReturnReconciler(deps).run()
    assert.deepEqual(calls, ["reconcile", "me"])
    assert.equal(result.summary?.flowState, "await-review")
  })

  it("6. a new Didit return performs a new reconciliation, even after a recorded success", async () => {
    const { deps, calls, awaitingStorage } = setup({ flag: "1000" })
    await createReturnReconciler(deps).run()
    awaitingStorage.data.set(AWAITING_RESULT_KEY, "2000")
    const next = await createReturnReconciler(deps).run()
    assert.equal(next.reconcile, "ok")
    assert.equal(calls.filter((c) => c === "reconcile").length, 2)
  })

  it("an in-flight entry never outlives its request: a failed call does not block the next attempt", async () => {
    let n = 0
    const { deps } = setup({
      flag: "3000",
      reconcile: async () => {
        n += 1
        if (n === 1) throw new Error("down")
        return { outcome: "unchanged" }
      },
    })
    assert.equal((await createReturnReconciler(deps).run()).reconcile, "failed")
    assert.equal((await createReturnReconciler(deps).run()).reconcile, "ok")
  })

  it("a remount for the SAME return (new reconciler, same flag) skips the POST but still reads /me", async () => {
    const { deps, calls } = setup({ flag: "7000" })
    await createReturnReconciler(deps).run()
    const second = await createReturnReconciler(deps).run()
    assert.deepEqual(calls, ["reconcile", "me", "me"])
    assert.equal(second.reconcile, "skipped")
    assert.equal(second.summary?.flowState, "complete")
  })

  it("a NEW Didit attempt (a new flag timestamp) reconciles again", async () => {
    const { deps, calls, awaitingStorage } = setup({ flag: "1000" })
    await createReturnReconciler(deps).run()
    awaitingStorage.data.set(AWAITING_RESULT_KEY, "2000")
    await createReturnReconciler(deps).run()
    assert.equal(calls.filter((c) => c === "reconcile").length, 2)
  })

  describe("failures fall back (the caller's bounded /me polling takes over)", () => {
    it("a failed reconcile does not throw, is reported, and /me is still read", async () => {
      const { deps, calls } = setup({
        reconcile: async () => {
          throw Object.assign(new Error("502"), { response: { status: 502, data: { code: "KYC_RECONCILIATION_UNAVAILABLE" } } })
        },
        status: async () => body({ nextAction: "continue_identity", hasActiveSession: true }),
      })
      const result = await createReturnReconciler(deps).run()
      assert.deepEqual(calls, ["reconcile", "me"])
      assert.equal(result.reconcile, "failed")
      assert.equal(result.summary?.flowState, "continue-identity")
    })

    it("a failed reconcile is not retried by later rerenders", async () => {
      const { deps, calls } = setup({
        reconcile: async () => {
          throw new Error("down")
        },
      })
      const reconciler = createReturnReconciler(deps)
      await reconciler.run()
      await reconciler.run()
      assert.equal(calls.filter((c) => c === "reconcile").length, 1)
    })

    it("when /me also fails the summary is null (unavailable), not an invented state", async () => {
      const { deps } = setup({
        reconcile: async () => {
          throw new Error("down")
        },
        status: async () => {
          throw new Error("down")
        },
      })
      const result = await createReturnReconciler(deps).run()
      assert.equal(result.reconcile, "failed")
      assert.equal(result.summary, null)
      assert.equal(shouldShowSuccessModal(result.summary), false)
    })
  })

  it("an unknown nextAction from the server lands safely in unknown (no success, no throw)", async () => {
    const { deps } = setup({ status: async () => body({ nextAction: "some_future_value", fullyVerified: true }) })
    const result = await createReturnReconciler(deps).run()
    assert.equal(result.summary?.flowState, "unknown")
    assert.equal(shouldShowSuccessModal(result.summary), false)
  })

  it("storage that throws never breaks the return (worst case: one extra reconcile)", async () => {
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
    const calls: string[] = []
    const result = await createReturnReconciler({
      awaitingStorage: broken,
      markerStorage: broken,
      reconcile: async () => void calls.push("reconcile"),
      fetchStatus: async () => body({ nextAction: "complete" }),
    }).run()
    assert.deepEqual(calls, ["reconcile"])
    assert.equal(result.summary?.flowState, "complete")
  })
})

describe("dashboard wiring and boundaries (source guards)", () => {
  const page = read("app", "(group)", "talent-dashboard", "page.tsx")
  const effect = page.slice(page.indexOf("const returnReconcilerRef"), page.indexOf("Real required check"))

  it("reconciles only when the awaiting-result flag is present, through the shared once-only reconciler", () => {
    assert.match(effect, /if \(hasAwaitingResult\(window\.localStorage\)\) \{\s+returnReconcilerRef\.current \?\?= createReturnReconciler/)
    assert.match(effect, /returnReconcilerRef\.current\.run\(\)\.then\(\(result\) => apply\(result\.summary\)\)/)
  })

  it("the fallback polling and the visibility refresh are GET /me only — they never reconcile", () => {
    const poll = effect.slice(effect.indexOf("const poll"), effect.indexOf("const onVisible"))
    const visible = effect.slice(effect.indexOf("const onVisible"), effect.indexOf("if (hasAwaitingResult"))
    for (const part of [poll, visible]) {
      assert.ok(!/reconcile/i.test(part))
    }
    assert.ok(poll.includes("fetchIdentityVerificationSummary()"))
  })

  it("only complete opens the success dialog, clearing the flag first, and the bounded polling constants are kept", () => {
    assert.match(effect, /shouldShowSuccessModal\(summary\)\) \{\s+clearAwaitingResult\(window\.localStorage\)[\s\S]*?setVerifiedModalOpen\(true\)/)
    assert.ok(effect.includes("attempts < RESULT_POLL_MAX_ATTEMPTS"))
    assert.equal(RESULT_POLL_INTERVAL_MS, 5_000)
    assert.equal(RESULT_POLL_MAX_ATTEMPTS, 12)
  })

  it("the page no longer applies its own identity-and-location rule", () => {
    assert.ok(!page.includes("isIdentityAndLocationVerified"))
    assert.ok(!page.includes("checkVerificationSummary"))
  })

  it("the state layer recreates no attempt, cooldown, confirmation or status rule", () => {
    const state = read("src", "lib", "api", "identity-verification-state.ts")
    const code = state
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join("\n")
    assert.ok(!/Date\.now|new Date\(|getTime\(/.test(code), "no clock arithmetic")
    assert.ok(!/60\s*\*\s*60|15\s*\*\s*60|24\s*\*/.test(code), "no cooldown/confirmation windows")
    assert.ok(!/attemptsRemaining\s*[<>=!]|attemptsUsed\s*[<>=!]/.test(code), "no attempt comparisons")
    assert.ok(!/=== "(verified|failed|pending|unstarted|in_progress)"/.test(code), "no status comparisons")
  })

  it("the API client posts to the reconcile route with no body and no session id", () => {
    const client = read("service", "http", "identity-verification.ts")
    assert.match(client, /post\("\/v1\/identity-verification\/kyc-sessions\/reconcile", null\)/)
    for (const field of ["fullyVerified", "attemptsUsed", "attemptsRemaining", "maxAttempts", "canRetry", "retryAvailableAt", "hasActiveSession", "nextAction"]) {
      assert.ok(client.includes(`${field}?:`), field)
    }
  })

  it("no protected visual file is touched: the flow component and legacy capture code are unchanged by this work", () => {
    const flow = read("components", "identity-verification-flow.tsx")
    assert.ok(!flow.includes("reconcile"))
    assert.ok(!flow.includes("nextAction"))
    assert.ok(!flow.includes("identity-verification-state"))
  })
})
