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
  isDiditHostedUrl,
} from "./free-kyc"
import {
  recordTravelClassification,
  recordTravelDuration,
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

  it("records the classification, and sends the duration only AFTER the classification finished", async () => {
    const log: string[] = []
    let finish!: () => void
    const slowClassification = new Promise<void>((r) => (finish = r))
    const deps: TravelModeDeps = {
      recordTravelClassification: async (c) => {
        await slowClassification
        log.push(`class:${c}`)
      },
      recordTravelDuration: async (d) => void log.push(`dur:${d}`),
    }
    const pending = recordTravelClassification(deps, "temporarily_traveling")
    const duration = recordTravelDuration(deps, "1–2 weeks", pending)
    await new Promise((r) => setTimeout(r, 10))
    assert.deepEqual(log, []) // duration is waiting
    finish()
    await duration
    assert.deepEqual(log, ["class:temporarily_traveling", "dur:one_to_two_weeks"])
  })

  it("'Skip' (no duration) is recorded as the screen's own 'Not sure'", async () => {
    const log: string[] = []
    await recordTravelDuration(makeDeps(log), null)
    assert.deepEqual(log, ["dur:not_sure"])
  })

  it("an unknown label falls back to 'not_sure' rather than inventing a value", async () => {
    const log: string[] = []
    await recordTravelDuration(makeDeps(log), "Forever")
    assert.deepEqual(log, ["dur:not_sure"])
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
    assert.ok(flow.includes('persistTravelClassification("temporarily_traveling")'))
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
