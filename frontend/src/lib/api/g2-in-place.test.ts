// Run like apply-gate.test.ts (from the frontend/ directory).
// G2 (listing creation) starts verification in place (PMCM-652 phase 6).
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, it } from "node:test"
import {
  announceCreateListingBlocked,
  createDraftBehindGate,
  createListingTitleFor,
  isCreateListingBlocked,
  markCreateListingBlocked,
} from "./create-listing-gate"

const root = process.cwd()
const read = (...p: string[]) => readFileSync(join(root, ...p), "utf8")
const code = (source: string) =>
  source.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")
const count = (source: string, needle: string) =>
  source.split(needle).length - 1

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

const hostSource = read("utils", "CreateListingGateHost.tsx")
const layout = read("app", "layout.tsx")
const rejected = (status: number, data: Record<string, unknown> = {}) => ({
  response: { status, data },
})
const refusal = (missing: string) =>
  rejected(403, {
    error: "VERIFICATION_REQUIRED",
    missingRequirements: missing,
  })

// every file that can start a draft, with the places each does it
const ENTRY_POINTS: Record<string, number> = {
  "app/(group)/my-listings/page.tsx": 1, // New Listing -> Project and Service (one handler); the empty state opens the same chooser
  "components/talent-dashboard-comps.tsx": 3, // the three dashboard Create Project buttons
  "app/publish-project/page.tsx": 2, // opening the page, and the first save
  "app/job-listing/page.tsx": 2,
  "app/edit-listing/[slug]/page.tsx": 2,
  "app/(group)/my-listings/[slug]/page.tsx": 2, // the first field save, and the fallback when no draft exists
  "src/lib/my-listings.ts": 1, // automatic background seed: silent, no modal, nothing to verify in place
}

describe("G2: every entry point reaches the one modal host", () => {
  it("the inventory of draft-creating callers is exactly the audited one", () => {
    const callers = Object.fromEntries(
      app
        .filter(
          ({ file, text }) =>
            file !== "service/http/project.ts" &&
            code(text).includes("ProjectAPI.CreateProjectDraft(")
        )
        .map(({ file, text }) => [
          file,
          count(code(text), "ProjectAPI.CreateProjectDraft("),
        ])
    )
    assert.deepEqual(callers, ENTRY_POINTS)
  })

  it("nothing else posts to the draft route: every path asks the creation check first", () => {
    assert.deepEqual(filesWith("/publish/project/draft"), [
      "service/http/project.ts",
    ])
    const project = read("service", "http", "project.ts")
    assert.ok(
      project.includes("check: () => ProjectAPI.CheckCreateListingGate()")
    )
    assert.equal(count(project, "createDraftBehindGate({"), 1)
  })

  it("/my-listings: Project and Service share one handler and the empty state opens the same chooser", () => {
    const page = read("app", "(group)", "my-listings", "page.tsx")
    assert.equal(count(page, "ProjectAPI.CreateProjectDraft("), 1)
    assert.ok(page.includes("listingType: option.type"))
    assert.equal(count(page, "setShowNewListingDialog(true)"), 2) // New Listing, Create Your First Listing
    assert.ok(page.includes("Create Your First Listing"))
  })

  it("the three dashboard buttons keep only their console error: no second message, no navigation of their own", () => {
    const comps = read("components", "talent-dashboard-comps.tsx")
    assert.equal(
      count(comps, 'console.error("Failed to create draft", err)'),
      3
    )
    assert.ok(
      !/START_VERIFICATION|startVerification|talent-dashboard\?/.test(
        code(comps)
      )
    )
  })

  it("a blocked attempt never shows a destructive toast on top of the modal", () => {
    const slug = read("app", "(group)", "my-listings", "[slug]", "page.tsx")
    assert.ok(slug.includes("} else if (!isCreateListingBlocked(createErr)) {"))
    for (const file of [
      ["app", "publish-project", "page.tsx"],
      ["app", "job-listing", "page.tsx"],
      ["app", "edit-listing", "[slug]", "page.tsx"],
    ]) {
      assert.ok(
        read(...file).includes(
          'if (isCreateListingBlocked(error)) router.replace("/my-listings")'
        ),
        file.join("/")
      )
    }
  })

  it("the only navigation G2 pages do on a refusal is back to /my-listings, never the dashboard", () => {
    for (const file of [
      "app/publish-project/page.tsx",
      "app/job-listing/page.tsx",
      "app/edit-listing/[slug]/page.tsx",
      "app/(group)/my-listings/[slug]/page.tsx",
      "app/(group)/my-listings/page.tsx",
    ]) {
      const c = code(read(...file.split("/")))
      assert.ok(
        !/START_VERIFICATION|startVerification=|start-verification-handoff/.test(
          c
        ),
        file
      )
      assert.ok(
        !/router\.(push|replace)\(["'`]\/talent-dashboard/.test(c),
        file
      )
    }
  })
})

describe("G2 Start Verification runs in place through the shared host", () => {
  it("the host never navigates, reloads or uses the dashboard handoff", () => {
    const c = code(hostSource)
    assert.ok(!/useRouter|router\.|next\/navigation/.test(c))
    assert.ok(
      !/START_VERIFICATION|startVerification=|start-verification-handoff/.test(
        c
      )
    )
    assert.ok(
      !/talent-dashboard|window\.location|location\.(assign|replace|reload|href)|history\./.test(
        c
      )
    )
  })

  it("Start Verification closes the modal, then calls the shared host exactly once, and nothing else", () => {
    const goVerify = hostSource.slice(
      hostSource.indexOf("const goVerify = () => {"),
      hostSource.indexOf("return (", hostSource.indexOf("const goVerify"))
    )
    assert.equal(count(goVerify, "void startVerification()"), 1)
    assert.ok(
      goVerify.indexOf("setBlock(null)") <
        goVerify.indexOf("void startVerification()")
    )
    assert.ok(
      !/ProjectAPI|Draft|await|fetch|setTimeout|dispatchEvent/.test(goVerify)
    )
    assert.equal(count(hostSource, "onClick={goVerify}"), 1)
    assert.equal(count(hostSource, "useIdentityVerification()"), 1)
  })

  it("the status-unavailable popup uses the same action and keeps its own dismissal", () => {
    assert.ok(
      hostSource.includes("onVerify={goVerify}") &&
        hostSource.includes("onRetryConnectionCheck={goVerify}")
    )
    assert.ok(
      hostSource.includes("onDismissConnectionError={() => setBlock(null)}")
    )
    assert.ok(hostSource.includes('reason="status_unavailable"'))
  })

  it("Cancel, Escape and an outside click only close the modal", () => {
    const modal = hostSource.slice(
      hostSource.indexOf('open={block?.kind === "verification"}'),
      hostSource.indexOf("<DialogContent")
    )
    assert.ok(modal.includes("if (!open) setBlock(null)"))
    assert.ok(
      !/onInteractOutside|onEscapeKeyDown|onPointerDownOutside|startVerification|router|Draft/.test(
        modal
      )
    )
    assert.ok(
      /<DialogClose asChild>\s*<Button variant="outlined" size="md">\s*Cancel/.test(
        hostSource
      )
    )
  })

  it("the modal and the status-unavailable popup are byte-for-byte dev-main's (sha256, whitespace-insensitive)", () => {
    const block = hostSource
      .slice(hostSource.indexOf("  return (\n    <>\n      <Dialog"))
      .replace(/\s+/g, "")
    assert.equal(
      createHash("sha256").update(block).digest("hex"),
      "2dc3f21058b1226cf99fa9026c586c45ef601b10ef08f1e51b15a3633a616833"
    )
  })

  it("the three requirement variants keep their copy", () => {
    assert.equal(
      createListingTitleFor("both"),
      "To publish this job, you must verify your identity and location"
    )
    assert.equal(
      createListingTitleFor("identity"),
      "To publish this job, you must verify your identity"
    )
    assert.equal(
      createListingTitleFor("location"),
      "To publish this job, you must verify your location"
    )
  })
})

describe("G2 placement: one modal host, inside the one verification provider", () => {
  it("<CreateListingGateHost /> is mounted exactly once, inside IdentityVerificationHostProvider, so it can reach the host", () => {
    assert.equal(count(layout, "<CreateListingGateHost />"), 1)
    const open = layout.indexOf("<IdentityVerificationHostProvider>")
    const host = layout.indexOf("<CreateListingGateHost />")
    const close = layout.indexOf("</IdentityVerificationHostProvider>")
    assert.ok(open > -1 && open < host && host < close)
    assert.deepEqual(filesWith("<CreateListingGateHost"), ["app/layout.tsx"])
  })

  it("there is still one provider, one flow and one gate instance; the G2 host renders none of them", () => {
    assert.deepEqual(filesWith("<IdentityVerificationHostProvider"), [
      "app/layout.tsx",
    ])
    assert.ok(!hostSource.includes("<IdentityVerificationFlow"))
    assert.ok(!hostSource.includes('reason="unstarted"'))
  })

  it("G3, G8 and G9 are untouched by G2", () => {
    const goVerify =
      "const goVerify = () => {\n    setBlock(null)\n    void startVerification()\n  }"
    assert.ok(read("utils", "useApplyGate.tsx").includes(goVerify))
    assert.ok(read("utils", "useStartTimeGate.tsx").includes(goVerify))
    assert.ok(
      read("components", "withdraw-funds-dialog.tsx").includes(
        "void startVerification()"
      )
    )
    assert.ok(
      read("app", "transfer-funds", "page.tsx").includes(
        "void startVerification()"
      )
    )
    assert.ok(
      read("app", "verify-withdrawal", "page.tsx").includes(
        "void startVerification() : router.push"
      )
    )
  })
})

describe("G2: a blocked create makes no draft, and nothing is created or retried by verification", () => {
  const harness = (checkOutcome: () => Promise<unknown>) => {
    const calls = { check: 0, post: 0, refuse: [] as unknown[] }
    return {
      calls,
      run: () =>
        createDraftBehindGate({
          check: () => {
            calls.check++
            return checkOutcome()
          },
          post: async () => {
            calls.post++
            return { data: { id: "draft-1" } }
          },
          refuse: (error) => {
            calls.refuse.push(error)
          },
        }),
    }
  }

  it("a refused check creates no draft, announces once, and rethrows (Project and Service share this one door and handler)", async () => {
    const h = harness(async () => {
      throw refusal("both")
    })
    await assert.rejects(h.run())
    assert.equal(h.calls.check, 1)
    assert.equal(h.calls.post, 0)
    assert.equal(h.calls.refuse.length, 1)
  })

  it("closing verification and completing verification create and retry nothing: only a new, explicit click posts", async () => {
    let gateOpen = false
    const calls = { post: 0, refuse: 0 }
    const click = () =>
      createDraftBehindGate({
        check: async () => {
          if (!gateOpen) throw refusal("both")
        },
        post: async () => {
          calls.post++
          return { data: { id: "draft-1" } }
        },
        refuse: () => {
          calls.refuse++
        },
      })
    await assert.rejects(click()) // blocked: modal shown, Start Verification clicked
    assert.deepEqual(calls, { post: 0, refuse: 1 })
    // verification is closed / completed: the account becomes verified. Nothing runs by itself.
    gateOpen = true
    await new Promise((resolve) => setTimeout(resolve, 20))
    assert.deepEqual(calls, { post: 0, refuse: 1 })
    // only the user clicking the original action again creates the draft
    const result = await click()
    assert.deepEqual(calls, { post: 1, refuse: 1 })
    assert.deepEqual(result, { data: { id: "draft-1" } })
  })

  it("404 and 401 compatibility is unchanged: 404 lets the POST decide, 401 posts nothing and shows no modal", async () => {
    const h404 = harness(async () => {
      throw rejected(404)
    })
    await h404.run()
    assert.deepEqual(
      {
        check: h404.calls.check,
        post: h404.calls.post,
        refuse: h404.calls.refuse.length,
      },
      { check: 1, post: 1, refuse: 0 }
    )
    const h401 = harness(async () => {
      throw rejected(401)
    })
    await assert.rejects(h401.run())
    assert.deepEqual(
      { post: h401.calls.post, refuse: h401.calls.refuse.length },
      { post: 0, refuse: 0 }
    )
  })

  it("403 shows the modal and 503, 5xx and network failures show status-unavailable: none posts", async () => {
    for (const failure of [
      refusal("identity"),
      rejected(503, { error: "IDENTITY_VERIFICATION_UNAVAILABLE" }),
      rejected(500),
      rejected(502),
      new Error("Network Error"),
    ]) {
      const h = harness(async () => {
        throw failure
      })
      await assert.rejects(h.run())
      assert.equal(h.calls.post, 0)
      assert.equal(h.calls.refuse.length, 1)
    }
  })

  it("one refusal announces the modal once (one event), and the silent seed announces none", () => {
    const events: unknown[] = []
    const target = {
      dispatchEvent: (event: Event) => {
        events.push(event)
        return true
      },
    }
    const error = refusal("location")
    announceCreateListingBlocked(error, target)
    assert.equal(events.length, 1)
    assert.equal(isCreateListingBlocked(error), true)
    const silent = refusal("location")
    markCreateListingBlocked(silent) // what the silent background seed does
    assert.equal(events.length, 1)
    assert.equal(isCreateListingBlocked(silent), true)
  })

  it("no code holds a blocked create for later: the host and the gate module keep no queue, and the provider never creates", () => {
    const gate = code(read("src", "lib", "api", "create-listing-gate.ts"))
    assert.ok(
      !/pendingDraft|queuedDraft|retryDraft|resumeDraft|setTimeout|setInterval/.test(
        gate
      )
    )
    const c = code(hostSource)
    assert.ok(
      !/ProjectAPI|CreateProjectDraft|createDraftBehindGate|pending|queue|retry/i.test(
        c.replace(/onRetryConnectionCheck/g, "")
      )
    )
    const provider = code(read("contexts", "identity-verification-host.tsx"))
    assert.ok(
      !/ProjectAPI|CreateProjectDraft|create-listing-gate/.test(provider)
    )
    assert.equal(count(hostSource, "useEffect("), 1) // the one event listener
  })
})
