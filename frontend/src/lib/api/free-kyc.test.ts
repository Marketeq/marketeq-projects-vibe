// Run: npx tsc src/lib/api/free-kyc.test.ts --outDir <tmp> --module commonjs
//   --target es2020 --skipLibCheck --esModuleInterop --types node && node --test <tmp>
// (the frontend has no test runner; node:test needs none.)
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  confirmHomeCountryAndStartFreeKyc,
  handleHomeCountryYes,
  type FreeKycDeps,
  isDiditHostedUrl,
} from "./free-kyc"
import {
  recordTravelClassification,
  recordTravelDuration,
  SKIPPED_TRAVEL_DURATION_LABEL,
  TRAVEL_DURATION_TO_BACKEND,
  type TravelModeDeps,
} from "./travel-mode-backend"

const URL_OK = "https://verify.didit.me/session/abc"

function quietly<T>(fn: () => Promise<T>): Promise<T> {
  const original = console.error
  console.error = () => undefined
  return fn().finally(() => {
    console.error = original
  })
}

describe("isDiditHostedUrl", () => {
  for (const ok of [URL_OK, "https://didit.me/x", "https://a.b.didit.me:443/y"]) {
    it(`accepts ${ok}`, () => assert.equal(isDiditHostedUrl(ok), true))
  }
  for (const bad of [
    "http://verify.didit.me/s",
    "https://evil.example.com/s",
    "https://notdidit.me/s",
    "https://verify.didit.me.evil.com/s",
    "https://127.0.0.1/s",
    "https://[::1]/s",
    "https://user:pw@verify.didit.me/s",
    "https://verify.didit.me:8443/s",
    "javascript:alert(1)",
    "//verify.didit.me/s",
    "",
  ]) {
    it(`rejects ${JSON.stringify(bad)}`, () => assert.equal(isDiditHostedUrl(bad), false))
  }
  it("rejects non-strings", () => {
    for (const v of [null, undefined, 42, {}]) assert.equal(isDiditHostedUrl(v), false)
  })
})

describe("confirmHomeCountryAndStartFreeKyc (the 'Yes, this is my home country' path)", () => {
  it("confirms the home country, THEN starts Free KYC, THEN redirects to the validated Didit URL, in that order", async () => {
    const order: string[] = []
    const outcome = await confirmHomeCountryAndStartFreeKyc({
      confirmHomeCountry: async () => void order.push("confirm"),
      startFreeKyc: async () => (order.push("start"), { data: { url: URL_OK } }),
      redirect: (u) => order.push(`redirect:${u}`),
    })
    assert.equal(outcome, "redirected")
    assert.deepEqual(order, ["confirm", "start", `redirect:${URL_OK}`])
  })

  it("sends no country, user or reference of its own (the backend resolves the country from the request IP)", async () => {
    const args: unknown[][] = []
    await confirmHomeCountryAndStartFreeKyc({
      confirmHomeCountry: async (...a: unknown[]) => void args.push(a),
      startFreeKyc: async (...a: unknown[]) => (args.push(a), { data: { url: URL_OK } }),
      redirect: () => undefined,
    } as never)
    assert.deepEqual(args, [[], []])
  })

  it("does NOT start Free KYC or redirect when the home-country confirmation fails", async () => {
    let started = false
    let redirected = false
    const outcome = await quietly(() =>
      confirmHomeCountryAndStartFreeKyc({
        confirmHomeCountry: async () => {
          throw new Error("409")
        },
        startFreeKyc: async () => ((started = true), { data: { url: URL_OK } }),
        redirect: () => void (redirected = true),
      })
    )
    assert.equal(outcome, "failed")
    assert.equal(started, false)
    assert.equal(redirected, false)
  })

  it("does not redirect when the backend rejects the session (VPN, travel mode, limit, vendor down)", async () => {
    let redirected = false
    const outcome = await quietly(() =>
      confirmHomeCountryAndStartFreeKyc({
        confirmHomeCountry: async () => undefined,
        startFreeKyc: async () => {
          throw new Error("403")
        },
        redirect: () => void (redirected = true),
      })
    )
    assert.equal(outcome, "failed")
    assert.equal(redirected, false)
  })

  for (const bad of ["https://evil.example.com/x", "http://verify.didit.me/x", "", "javascript:alert(1)"]) {
    it(`never redirects to ${JSON.stringify(bad)} even if the backend returned it`, async () => {
      let redirected = false
      const outcome = await quietly(() =>
        confirmHomeCountryAndStartFreeKyc({
          confirmHomeCountry: async () => undefined,
          startFreeKyc: async () => ({ data: { url: bad } }),
          redirect: () => void (redirected = true),
        })
      )
      assert.equal(outcome, "failed")
      assert.equal(redirected, false)
    })
  }

  it("a browser query string can never mark anything verified: this path only ever redirects", async () => {
    const calls: string[] = []
    await confirmHomeCountryAndStartFreeKyc({
      confirmHomeCountry: async () => void calls.push("confirm"),
      startFreeKyc: async () => (calls.push("start"), { data: { url: URL_OK } }),
      redirect: () => void calls.push("redirect"),
    })
    assert.deepEqual(calls, ["confirm", "start", "redirect"]) // no status write exists here
  })
})

describe("handleHomeCountryYes (preview isolation)", () => {
  it("in the preview (simulate) it runs ONLY the stub: never loads deps, confirms, starts a session or redirects", async () => {
    let depsLoaded = false
    let stubbed = 0
    const outcome = await handleHomeCountryYes({
      simulate: true,
      onSimulated: () => void stubbed++,
      getDeps: async () => {
        depsLoaded = true
        throw new Error("must not be called in the preview")
      },
    })
    assert.equal(outcome, "simulated")
    assert.equal(stubbed, 1)
    assert.equal(depsLoaded, false)
  })

  it("outside the preview (authenticated dashboard) it performs the real sequence", async () => {
    const order: string[] = []
    let stubbed = false
    const outcome = await handleHomeCountryYes({
      simulate: false,
      onSimulated: () => void (stubbed = true),
      getDeps: async () => ({
        confirmHomeCountry: async () => void order.push("confirm"),
        startFreeKyc: async () => (order.push("start"), { data: { url: URL_OK } }),
        redirect: () => void order.push("redirect"),
      }),
    })
    assert.equal(outcome, "redirected")
    assert.deepEqual(order, ["confirm", "start", "redirect"])
    assert.equal(stubbed, false)
  })
})

describe("travel branch persistence (never touches Free KYC)", () => {
  const makeDeps = (log: string[]): TravelModeDeps => ({
    recordTravelClassification: async (c) => void log.push(`class:${c}`),
    recordTravelDuration: async (d) => void log.push(`dur:${d}`),
  })

  it("TravelModeDeps exposes no Free KYC capability at all", () => {
    const deps = makeDeps([]) as unknown as Record<string, unknown>
    assert.deepEqual(Object.keys(deps).sort(), ["recordTravelClassification", "recordTravelDuration"])
  })

  it("maps each of the four existing duration labels one-to-one to the backend enum", () => {
    assert.deepEqual(TRAVEL_DURATION_TO_BACKEND, {
      "A few days": "a_few_days",
      "1–2 weeks": "one_to_two_weeks",
      "More than 2 weeks": "more_than_two_weeks",
      "Not sure": "not_sure",
    })
  })

  it("the duration is the whole Travel Mode save: no classification call, and it resolves true on success", async () => {
    const log: string[] = []
    const deps: TravelModeDeps = {
      recordTravelClassification: async (c) => void log.push(`class:${c}`),
      recordTravelDuration: async (d) => void log.push(`dur:${d}`),
    }
    const saved = await recordTravelDuration(deps, "1–2 weeks")
    assert.equal(saved, true)
    assert.deepEqual(log, ["dur:one_to_two_weeks"])
  })

  it("a failed duration save resolves false (logged), so the caller keeps its screen open", async () => {
    const deps: TravelModeDeps = {
      recordTravelClassification: async () => {},
      recordTravelDuration: async () => {
        throw new Error("409")
      },
    }
    const original = console.error
    console.error = () => {}
    try {
      assert.equal(await recordTravelDuration(deps, "A few days"), false)
    } finally {
      console.error = original
    }
  })

  it("'Skip' submits its explicit 'Not sure' label, which is the backend's not_sure", async () => {
    const log: string[] = []
    assert.equal(SKIPPED_TRAVEL_DURATION_LABEL, "Not sure")
    assert.equal(await recordTravelDuration(makeDeps(log), SKIPPED_TRAVEL_DURATION_LABEL), true)
    assert.deepEqual(log, ["dur:not_sure"])
  })

  it("an unknown or empty label is refused: nothing is sent, nothing is invented, it resolves false", async () => {
    await quietly(async () => {
      for (const label of ["Forever", ""]) {
        const log: string[] = []
        assert.equal(await recordTravelDuration(makeDeps(log), label), false)
        assert.deepEqual(log, [])
      }
    })
  })

  it("persistence failures are logged and never thrown, so the unchanged UI keeps working", async () => {
    const failing: TravelModeDeps = {
      recordTravelClassification: async () => {
        throw new Error("500")
      },
      recordTravelDuration: async () => {
        throw new Error("500")
      },
    }
    await quietly(async () => {
      await recordTravelClassification(failing, "permanently_relocated")
      await recordTravelDuration(failing, "A few days")
    })
  })
})

describe("flow wiring (source guard)", () => {
  // Run from the frontend/ directory (see the header command).
  const flow = readFileSync(
    join(process.cwd(), "components", "identity-verification-flow.tsx"),
    "utf8"
  )

  it("calls startFreeKyc only from the home-country 'Yes' handler", () => {
    const occurrences = flow.match(/startFreeKyc/g) ?? []
    assert.equal(occurrences.length, 2) // the dep property name + its implementation in handleHomeCountryYes
    const handler = flow.slice(
      flow.indexOf("const handleHomeCountryYes"),
      flow.indexOf("// Travel branch: persists")
    )
    assert.ok(handler.includes("startFreeKyc"))
    assert.equal(flow.slice(flow.indexOf("// Travel branch: persists")).includes("startFreeKyc"), false)
  })

  it("'Yes' runs the Free KYC handler instead of the custom country/document screens", () => {
    assert.ok(flow.includes("onClick={() => void handleHomeCountryYes()}"))
    assert.ok(flow.includes("Yes, this is my home country"))
  })

  it("'No, I'm currently traveling' still goes to the existing travel screens via send(\"NO\")", () => {
    assert.ok(flow.includes('onClick={() => send("NO")}'))
    assert.ok(flow.includes("No, I&rsquo;m currently traveling"))
  })

  it("the travel options persist classification and keep their original navigation events", () => {
    // "Temporarily traveling" saves nothing at its click: the duration save carries it.
    assert.ok(!flow.includes('persistTravelClassification("temporarily_traveling")'))
    assert.ok(flow.includes('send("NEXT")'))
    assert.ok(flow.includes('persistTravelClassification("permanently_relocated")'))
    assert.ok(flow.includes('send("RELOCATED")'))
  })

  it("the simulation is gated on NODE_ENV=development and off by default", () => {
    assert.ok(flow.includes('simulateFreeKycForPreview === true &&'))
    assert.ok(flow.includes('process.env.NODE_ENV === "development"'))
  })

  it("only the dev preview page opts in to the Free KYC simulation; the real callers never do", () => {
    const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
    assert.ok(read("app", "identity-verification-preview", "preview-client.tsx").includes("simulateFreeKycForPreview"))
    assert.equal(read("app", "(group)", "talent-dashboard", "page.tsx").includes("simulateFreeKycForPreview"), false)
    assert.equal(read("components", "account-verification-gate.tsx").includes("simulateFreeKycForPreview"), false)
  })

  it("never reads a verification result from the URL", () => {
    assert.equal(/searchParams|URLSearchParams|location\.search|verificationSessionId/.test(flow), false)
  })
})

// ---------------------------------------------------------------------------
// Identity status: mock isolation, gate decision, and not-startable refresh
// ---------------------------------------------------------------------------
import {
  checkIdentityVerificationStatus,
  gateReasonForStatus,
} from "./identity-verification-status"

const MOCK_KEY = "__mock_identity_verification_status"

function withMock<T>(value: string, fn: () => Promise<T>): Promise<T> {
  const g = globalThis as any
  const prevLs = g.localStorage
  const prevEnv = process.env.NODE_ENV
  g.localStorage = { getItem: (k: string) => (k === MOCK_KEY ? value : null) }
  ;(process.env as any).NODE_ENV = "development"
  return fn().finally(() => {
    g.localStorage = prevLs
    ;(process.env as any).NODE_ENV = prevEnv
  })
}

describe("checkIdentityVerificationStatus mock handling", () => {
  it("a stale localStorage mock cannot control the real dashboard", async () => {
    let fetched = 0
    const status = await withMock("unstarted", () =>
      checkIdentityVerificationStatus({
        fetchStatus: async () => {
          fetched++
          return "verified"
        },
      })
    )
    assert.equal(status, "verified")
    assert.equal(fetched, 1)
  })

  it("the real dashboard page never opts into the mock", () => {
    const page = readFileSync(
      join(process.cwd(), "app", "(group)", "talent-dashboard", "page.tsx"),
      "utf8"
    )
    assert.ok(!page.includes("allowDevMock"))
  })

  it("explicit preview mocking still works", async () => {
    let fetched = 0
    const status = await withMock("failed", () =>
      checkIdentityVerificationStatus({
        allowDevMock: true,
        fetchStatus: async () => {
          fetched++
          return "verified"
        },
      })
    )
    assert.equal(status, "failed")
    assert.equal(fetched, 0)
  })

  it("an unreachable status check is 'unavailable', never 'unstarted'", async () => {
    const status = await checkIdentityVerificationStatus({
      fetchStatus: async () => {
        throw new Error("503")
      },
    })
    assert.equal(status, "unavailable")
  })
})

describe("gateReasonForStatus", () => {
  it("a verified account does not open the start flow", () => {
    assert.equal(gateReasonForStatus("verified"), null)
  })
  it("pending/in_progress/failed_final do not open it either", () => {
    for (const s of ["pending", "in_progress", "failed_final"] as const) {
      assert.equal(gateReasonForStatus(s), null)
    }
  })
  it("unstarted and unavailable still open it", () => {
    assert.equal(gateReasonForStatus("unstarted"), "unstarted")
    assert.equal(gateReasonForStatus("unavailable"), "status_unavailable")
  })
})

describe("409 IDENTITY_VERIFICATION_NOT_STARTABLE", () => {
  const notStartable = {
    response: {
      status: 409,
      data: { code: "IDENTITY_VERIFICATION_NOT_STARTABLE" },
    },
  }
  const baseDeps = (over: Partial<FreeKycDeps> = {}): FreeKycDeps => ({
    confirmHomeCountry: async () => ({}),
    startFreeKyc: async () => {
      throw notStartable
    },
    redirect: () => assert.fail("must not redirect"),
    ...over,
  })

  it("triggers a status refresh and publishes the refreshed status", async () => {
    let refreshed = 0
    const published: string[] = []
    const outcome = await quietly(() =>
      confirmHomeCountryAndStartFreeKyc(
        baseDeps({
          refreshIdentityStatus: async () => {
            refreshed++
            return "verified"
          },
          publishStatus: (s) => published.push(s),
        })
      )
    )
    assert.equal(outcome, "not_startable")
    assert.equal(refreshed, 1)
    assert.deepEqual(published, ["verified"])
  })

  it("a refreshed verified status reaches the dashboard, which closes the flow", () => {
    const page = readFileSync(
      join(process.cwd(), "app", "(group)", "talent-dashboard", "page.tsx"),
      "utf8"
    )
    assert.match(page, /IDENTITY_STATUS_REFRESHED_EVENT/)
    assert.match(
      page,
      /status !== "verified"\) return\s+setVerificationGateOpen\(false\)\s+setIdentityFlowOpen\(false\)/
    )
  })

  it("other errors (and other 409 codes) do not refresh", async () => {
    let refreshed = 0
    const deps = (err: unknown) =>
      baseDeps({
        startFreeKyc: async () => {
          throw err
        },
        refreshIdentityStatus: async () => {
          refreshed++
          return "verified"
        },
        publishStatus: () => undefined,
      })
    assert.equal(
      await quietly(() =>
        confirmHomeCountryAndStartFreeKyc(deps(new Error("x")))
      ),
      "failed"
    )
    assert.equal(
      await quietly(() =>
        confirmHomeCountryAndStartFreeKyc(
          deps({ response: { status: 409, data: { code: "OTHER" } } })
        )
      ),
      "failed"
    )
    assert.equal(refreshed, 0)
  })

  it("a failing refresh stays on the current screen without throwing", async () => {
    const outcome = await quietly(() =>
      confirmHomeCountryAndStartFreeKyc(
        baseDeps({
          refreshIdentityStatus: async () => {
            throw new Error("503")
          },
          publishStatus: () => assert.fail("nothing to publish"),
        })
      )
    )
    assert.equal(outcome, "not_startable")
  })
})
