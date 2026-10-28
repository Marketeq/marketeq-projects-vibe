// Run like apply-gate.test.ts (from the frontend/ directory): npx tsx --test <file>
import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  announceCreateListingBlocked,
  createDraftBehindGate,
  createListingBlockFrom,
  createListingBlockOf,
  createListingTitleFor,
  isCreateListingBlocked,
  markCreateListingBlocked,
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

describe("createDraftBehindGate: the draft POST happens only after the check resolved", () => {
  const blockedKinds = (b: unknown) => (b as { kind: string }).kind
  // Project and Service (and every other caller) share the one wrapper; the type rides in the body.
  for (const type of ["project", "service"]) {
    it(`unverified ${type}: the check ran, NO draft POST, the refusal is announced and rethrown`, async () => {
      const calls: string[] = []
      const refused: unknown[] = []
      const err = refusal("both")
      await assert.rejects(
        createDraftBehindGate({
          check: async () => { calls.push("check"); throw err },
          post: async () => { calls.push(`post:${type}`); return "draft" },
          refuse: (e) => refused.push(e),
        }),
        (e) => e === err
      )
      assert.deepEqual(calls, ["check"])
      assert.deepEqual(refused, [err])
    })
  }

  it("each missing status reaches the modal as its own variant", () => {
    for (const missing of ["both", "identity", "location"] as const) {
      const err = refusal(missing)
      const target = { dispatchEvent: (e: Event) => { seen = (e as CustomEvent).detail; return true } }
      let seen: unknown
      announceCreateListingBlocked(err, target)
      assert.deepEqual(seen, { kind: "verification", missing })
      assert.deepEqual(createListingBlockOf(err), { kind: "verification", missing })
    }
  })

  it("an unreadable gate (network error, 5xx) is announced as unavailable: no draft, not silent", async () => {
    const refused: unknown[] = []
    await assert.rejects(
      createDraftBehindGate({
        check: async () => { throw new Error("Network Error") },
        post: async () => assert.fail("must not POST"),
        refuse: (e) => refused.push(e),
      })
    )
    assert.equal(refused.length, 1)
    assert.equal(blockedKinds(createListingBlockFrom(refused[0])), "unavailable")
  })

  it("verified or grace-period (check resolves): check first, then the POST, result returned", async () => {
    const calls: string[] = []
    const out = await createDraftBehindGate({
      check: async () => { calls.push("check") },
      post: async () => { calls.push("post"); return { data: { id: "d1" } } },
      refuse: () => assert.fail("must not refuse"),
    })
    assert.deepEqual(calls, ["check", "post"])
    assert.deepEqual(out, { data: { id: "d1" } })
  })

  it("404 from the check (older backend without create-gate): the POST runs once, no modal, its result is returned", async () => {
    let posts = 0
    const out = await createDraftBehindGate({
      check: async () => { throw rejected(404, { message: "Cannot GET /publish/create-gate" }) },
      post: async () => { posts++; return { data: { id: "d404" } } },
      refuse: () => assert.fail("a 404 must not show the verification modal"),
    })
    assert.equal(posts, 1)
    assert.deepEqual(out, { data: { id: "d404" } })
  })

  it("404 from the check: a refusal by the POST itself is still announced", async () => {
    const refused: unknown[] = []
    const err = refusal("both")
    await assert.rejects(
      createDraftBehindGate({ check: async () => { throw rejected(404, {}) }, post: async () => { throw err }, refuse: (e) => refused.push(e) }),
      (e) => e === err
    )
    assert.deepEqual(refused, [err])
  })

  it("401 from the check: no POST, no modal, the original error is rethrown for the sign-in handling", async () => {
    const err = rejected(401, { message: "Unauthorized" })
    let posts = 0
    await assert.rejects(
      createDraftBehindGate({
        check: async () => { throw err },
        post: async () => { posts++; return "never" },
        refuse: () => assert.fail("a 401 must not show the verification modal"),
      }),
      (e) => e === err
    )
    assert.equal(posts, 0)
  })

  it("only 404 and 401 are special: 403, 500, 502, 503 and network errors still refuse and never POST", async () => {
    for (const err of [refusal("identity"), rejected(500, {}), rejected(502, {}), rejected(503, { error: "IDENTITY_VERIFICATION_UNAVAILABLE" }), new Error("Network Error")]) {
      const refused: unknown[] = []
      await assert.rejects(
        createDraftBehindGate({ check: async () => { throw err }, post: async () => assert.fail("must not POST"), refuse: (e) => refused.push(e) }),
        (e) => e === err
      )
      assert.deepEqual(refused, [err])
    }
  })

  it("a POST refused by the gate on a race is announced too (403 and 503), and rethrown", async () => {
    for (const err of [refusal("identity"), rejected(503, { error: "IDENTITY_VERIFICATION_UNAVAILABLE" })]) {
      const refused: unknown[] = []
      await assert.rejects(
        createDraftBehindGate({ check: async () => {}, post: async () => { throw err }, refuse: (e) => refused.push(e) }),
        (e) => e === err
      )
      assert.deepEqual(refused, [err])
    }
  })

  it("an unrelated POST failure is rethrown without the G2 modal", async () => {
    await assert.rejects(
      createDraftBehindGate({ check: async () => {}, post: async () => { throw rejected(500, {}) }, refuse: () => assert.fail("not a gate refusal") })
    )
  })

  it("marking works on the error object and survives for the page's own catch", () => {
    const err = refusal("location")
    markCreateListingBlocked(err)
    assert.equal(isCreateListingBlocked(err), true)
    assert.equal(isCreateListingBlocked(new Error("x")), false)
    assert.equal(isCreateListingBlocked(null), false)
  })
})

describe("ProjectAPI.CreateProjectDraft is the single gated door", () => {
  const api = read("service", "http", "project.ts")
  const fn = api.slice(api.indexOf("CreateProjectDraft: async"), api.indexOf("GetProjectDraft:"))

  it("checks via GET /publish/create-gate before the POST, through createDraftBehindGate", () => {
    assert.ok(fn.includes("createDraftBehindGate({"))
    assert.ok(fn.indexOf("check: () => ProjectAPI.CheckCreateListingGate()") < fn.indexOf("/publish/project/draft"))
    assert.ok(api.includes("`${LISTINGS_BASE}/publish/create-gate`"))
  })

  it("announces to the modal unless the caller is the silent background seed", () => {
    assert.ok(fn.includes("announceCreateListingBlocked(error)"))
    assert.ok(fn.includes("markCreateListingBlocked(error)"))
  })

  it("no other code posts to the draft route", () => {
    const hits: string[] = []
    const walk = (dir: string) => {
      for (const e of readdirSync(join(process.cwd(), dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`
        if (e.isDirectory()) { if (!/node_modules|\.next/.test(e.name)) walk(rel) }
        else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) && read(rel).includes("publish/project/draft")) hits.push(rel)
      }
    }
    for (const d of ["app", "components", "utils", "src", "lib", "hooks", "service"]) { try { walk(d) } catch { /* absent */ } }
    assert.deepEqual(hits, ["service/http/project.ts"])
  })
})

describe("the modal host: copy, close behavior and the verification hand-off", () => {
  const host = read("utils", "CreateListingGateHost.tsx")
  const layout = read("app", "layout.tsx")

  it("is mounted once in the root layout, so every page has it", () => {
    assert.ok(layout.includes('import { CreateListingGateHost } from "@/utils/CreateListingGateHost"'))
    assert.equal(layout.split("<CreateListingGateHost />").length - 1, 1)
  })

  it("listens for the announced block and shows the title for what is missing", () => {
    assert.ok(host.includes("window.addEventListener(CREATE_LISTING_BLOCKED_EVENT, onBlocked)"))
    assert.ok(host.includes("createListingTitleFor(block.missing)"))
  })

  it("can call no API: it never creates, checks or stores anything", () => {
    assert.ok(!/ProjectAPI|CreateProjectDraft|fetch\(|localStorage|sessionStorage/.test(host.replace(/^\s*\/\/.*$/gm, "")))
  })

  it("Cancel, Esc and an outside click only close the modal", () => {
    assert.ok(/<DialogClose asChild>\s*<Button variant="outlined" size="md">\s*Cancel\s*<\/Button>\s*<\/DialogClose>/.test(host))
    const onOpenChange = host.slice(host.indexOf("onOpenChange={"), host.indexOf("<DialogContent"))
    assert.ok(onOpenChange.includes("if (!open) setBlock(null)"))
    assert.ok(!/router|fetch|check|Draft|localStorage|sessionStorage/i.test(onOpenChange))
  })

  it("Start Verification closes the modal and launches the existing flow through the G3 hand-off", () => {
    assert.ok(/<Button size="md" onClick=\{goVerify\}>\s*Start Verification\s*<\/Button>/.test(host))
    assert.ok(host.includes("const goVerify = () => {\n    setBlock(null)\n    router.push(START_VERIFICATION_HREF)\n  }"))
    assert.ok(read("src", "lib", "api", "start-verification-handoff.ts").includes("/talent-dashboard?"))
  })

  it("unavailable reuses the existing status-unavailable popup", () => {
    assert.ok(host.includes('open={block?.kind === "unavailable"}'))
    assert.ok(host.includes('reason="status_unavailable"'))
  })
})

describe("every listing-creation entry point goes through the gated call", () => {
  const draftCallers = (file: string) => read(...file.split("/")).split("ProjectAPI.CreateProjectDraft(").length - 1

  it("/my-listings New Listing: Project and Service share one handler; a refusal closes the chooser", () => {
    const page = read("app", "(group)", "my-listings", "page.tsx")
    assert.ok(/type: "project",\s*label: "Project"/.test(page))
    assert.ok(/type: "service",\s*label: "Service"/.test(page))
    assert.equal(page.split("newListingOptions.map(").length - 1, 1)
    assert.equal(draftCallers("app/(group)/my-listings/page.tsx"), 1)
    assert.ok(/if \(isCreateListingBlocked\(err\)\) \{\s*setShowNewListingDialog\(false\)/.test(page))
  })

  it("the three dashboard Create Project buttons use the gated call, and the read-only component is untouched", () => {
    const comps = read("components", "talent-dashboard-comps.tsx")
    assert.equal(comps.split("ProjectAPI.CreateProjectDraft({").length - 1, 3)
    assert.equal(comps.split("handleCreateProject").length - 1, 7)
    assert.ok(!/isCreateListingBlocked|CreateListingGate|onBeforeCreate/.test(comps))
  })

  it("legacy publish-project, job-listing and edit-listing leave the empty form when the gate refuses", () => {
    for (const f of ["app/publish-project/page.tsx", "app/job-listing/page.tsx", "app/edit-listing/[slug]/page.tsx"]) {
      const src = read(...f.split("/"))
      assert.ok(src.includes('import { isCreateListingBlocked } from "@/src/lib/api/create-listing-gate"'), f)
      assert.ok(/if \(isCreateListingBlocked\(error\)\) router\.replace\("\/my-listings"\)/.test(src), f)
      assert.ok(draftCallers(f) >= 2, f)
    }
  })

  it("my-listings/[slug] fallback leaves the empty page when the gate refuses; its save path keeps its toast", () => {
    const src = read("app", "(group)", "my-listings", "[slug]", "page.tsx")
    assert.ok(/if \(isCreateListingBlocked\(createErr\)\) router\.replace\("\/my-listings"\)/.test(src))
    assert.ok(/\} else if \(!isCreateListingBlocked\(createErr\)\) \{[^}]*toast\(\{ title: toUserMessage\(createErr\), variant: "destructive" \}\)/.test(src))
  })

  it("background seed migration: gate checked once up front, silent, and not marked migrated while blocked", () => {
    const src = read("src", "lib", "my-listings.ts")
    const seed = src.slice(src.indexOf("async function ensureSeedListingsInBackend"), src.indexOf("export function useMyListings"))
    const checkAt = seed.indexOf("await ProjectAPI.CheckCreateListingGate()")
    assert.ok(checkAt > 0 && checkAt < seed.indexOf("GetMyProjects()"))
    assert.ok(/CheckCreateListingGate\(\)\s*\} catch \{\s*return\s*\}/.test(seed))
    assert.ok(seed.indexOf("return") < seed.indexOf('localStorage.setItem(SEED_MIGRATED_KEY, "true")'))
    assert.ok(seed.includes("CreateProjectDraft(payload, { silent: true })"))
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
