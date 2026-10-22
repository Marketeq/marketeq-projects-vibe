// Run like profile-banner.test.ts (from the frontend/ directory).
//
// The listing detail endpoints decide, per request, whether the caller is the listing's owner (full
// roster) or anyone else (only members whose gate is open). They know who is asking only from the
// session the browser sends. A cross-origin fetch sends no cookie unless it says
// `credentials: "include"`; without it the gateway has no token to forward and the owner is treated
// as an anonymous stranger on their own listing. These guards keep the two owner-facing pages
// sending the session.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")

/** Every `fetch(...)` call whose URL is a listing-detail read, with the options it passes. */
function listingFetches(source: string): string[] {
  const calls: string[] = []
  const re = /fetch\(\s*`[^`]*\/v1\/(?:projects|services)\/slug\/[^`]*`[^)]*\)/g
  for (const m of source.matchAll(re)) calls.push(m[0])
  return calls
}

describe("owner-facing listing pages send the session when they read a listing", () => {
  const pages: Array<[string, string]> = [
    ["project-details", read("app", "(group)", "(group)", "project-details", "[slug]", "page.tsx")],
    ["my-listings", read("app", "(group)", "my-listings", "[slug]", "page.tsx")],
  ]

  for (const [name, source] of pages) {
    it(`${name}: every /v1/projects/slug and /v1/services/slug read includes credentials`, () => {
      const calls = listingFetches(source)
      assert.ok(calls.length >= 3, `expected the page's listing reads, found ${calls.length}`)
      for (const call of calls) {
        assert.match(call, /credentials:\s*["']include["']/, call)
      }
    })

    it(`${name}: no listing read puts an owner or viewer claim in the URL`, () => {
      for (const call of listingFetches(source)) {
        assert.ok(!/[?&](viewer|viewerId|userId|owner|includeUnverified)=/i.test(call), call)
      }
    })
  }
})
