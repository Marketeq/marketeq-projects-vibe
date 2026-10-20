// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { parseIdentityVerificationSummary } from "./identity-verification-state"
import {
  answerTravelerPrompt,
  markTravelerPromptShown,
  shouldOfferTravelerPrompt,
  travelLocationPromptKey,
} from "./travel-location-prompt"
import type { DismissalStorage } from "./travel-expiry-popup"

function memoryStorage(): DismissalStorage & { dump: () => Record<string, string> } {
  const map = new Map<string, string>()
  return {
    get length() { return map.size },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    dump: () => Object.fromEntries(map),
  }
}
const SID_A = "7a1b2c3d-0000-4000-8000-00000000000a"
const SID_B = "7a1b2c3d-0000-4000-8000-00000000000b"
const summary = parseIdentityVerificationSummary({
  nextAction: "none",
  status: "verified",
  travelModeLocationMismatch: true,
})
const offered = (sessionId: string | null, storage: DismissalStorage) =>
  shouldOfferTravelerPrompt({ summary, sessionId, storage })

const page = readFileSync(
  join(process.cwd(), "app", "(group)", "talent-dashboard", "page.tsx"),
  "utf8"
)
const dialogStart = page.indexOf("open={locationMismatchOpen || travelerPromptOpen}")
const dialog = page.slice(page.lastIndexOf("<Dialog", dialogStart), page.indexOf("</Dialog>", dialogStart))

describe("the dialog cannot be dismissed except by its two buttons", () => {
  it("outside click is prevented", () => {
    assert.match(dialog, /onInteractOutside=\{\(event\) => event\.preventDefault\(\)\}/)
  })
  it("Escape is prevented", () => {
    assert.match(dialog, /onEscapeKeyDown=\{\(event\) => event\.preventDefault\(\)\}/)
  })
  it("no X / close control and no onOpenChange that could close it", () => {
    assert.ok(!dialog.includes("onOpenChange"))
    assert.ok(!/DialogClose|IconButton|<X\b/.test(dialog))
  })
  it("offers exactly the two approved actions", () => {
    const text = [...dialog.matchAll(/>\s*([^<>{}]*[A-Za-z][^<>{}]*?)\s*</g)].map((m) => m[1].trim())
    assert.ok(text.includes("I’m still traveling"))
    assert.ok(text.includes("Change my home country"))
    assert.equal((dialog.match(/<Button\b/g) ?? []).length, 2)
  })
})

describe("opening marks nothing; only an answer does", () => {
  it("the page's open effect never writes the marker", () => {
    const effect = page.slice(page.indexOf("shouldOfferTravelerPrompt({"), page.indexOf("setTravelerPromptOpen(true)") + 30)
    assert.ok(!effect.includes("markTravelerPromptShown"))
  })
  it("a refresh (same login) before any answer offers it again", () => {
    const storage = memoryStorage()
    assert.equal(offered(SID_A, storage), true) // opened, nothing marked
    assert.deepEqual(storage.dump(), {})
    assert.equal(offered(SID_A, storage), true) // refresh
  })
  it("'I’m still traveling' marks the login, so a refresh does not reopen it", () => {
    const handler = page.slice(page.indexOf("const handleTravelerStillTraveling"), page.indexOf("const handleChangeHomeCountry"))
    assert.ok(handler.indexOf("markTravelerPromptAnswered()") < handler.indexOf("setTravelerPromptOpen(false)"))
    const storage = memoryStorage()
    markTravelerPromptShown(SID_A, storage)
    assert.equal(storage.getItem(travelLocationPromptKey(SID_A)), "1")
    assert.equal(offered(SID_A, storage), false) // refresh after answering
  })
  it("a new login (new session id) offers it again and leaves one marker", () => {
    const storage = memoryStorage()
    markTravelerPromptShown(SID_A, storage)
    assert.equal(offered(SID_B, storage), true)
    markTravelerPromptShown(SID_B, storage)
    assert.deepEqual(Object.keys(storage.dump()), [travelLocationPromptKey(SID_B)])
  })
  it("no session id: offered, nothing persisted", () => {
    const storage = memoryStorage()
    markTravelerPromptShown(null, storage)
    assert.deepEqual(storage.dump(), {})
    assert.equal(offered(null, storage), true)
  })
})

describe("'Change my home country'", () => {
  it("marks the login only after the start succeeds, then returns its result", async () => {
    const order: string[] = []
    const r = await answerTravelerPrompt(
      async () => { order.push("start"); return { location: "FR" } },
      () => order.push("mark")
    )
    assert.deepEqual(order, ["start", "mark"])
    assert.deepEqual(r, { ok: true, value: { location: "FR" } })
  })
  it("a failed start marks nothing, so the prompt stays available", async () => {
    const storage = memoryStorage()
    const original = console.error
    console.error = () => {}
    try {
      const r = await answerTravelerPrompt(
        async () => { throw new Error("boom") },
        () => markTravelerPromptShown(SID_A, storage)
      )
      assert.deepEqual(r, { ok: false })
    } finally {
      console.error = original
    }
    assert.deepEqual(storage.dump(), {})
    assert.equal(offered(SID_A, storage), true)
  })
  it("the page leaves the prompt open on failure and marks only a traveler prompt", () => {
    const handler = page.slice(page.indexOf("const handleChangeHomeCountry"), page.indexOf("const vpnProxyModalCopy"))
    assert.match(handler, /answerTravelerPrompt\(\s*startChangeHomeCountry,\s*travelerPromptOpen \? markTravelerPromptAnswered : \(\) => \{\}\s*\)/)
    assert.match(handler, /if \(result\.ok\) openFlowFromMismatch\(result\.value\)/)
  })
  it("after a successful answer the prompt is marked and the flow opens (answered once per login)", async () => {
    const storage = memoryStorage()
    const r = await answerTravelerPrompt(async () => ({ location: "FR" }), () => markTravelerPromptShown(SID_A, storage))
    assert.equal(r.ok, true)
    assert.equal(offered(SID_A, storage), false)
  })
})
