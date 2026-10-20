// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { shouldShowProfileBanner } from "./identity-next-step"
import { parseIdentityVerificationSummary } from "./identity-verification-state"
import {
  TRAVEL_EXPIRY_DISMISSED_PREFIX,
  dismissTravelExpiryPopup,
  shouldShowTravelExpiryPopup,
  travelExpiryDismissalKey,
  type DismissalStorage,
} from "./travel-expiry-popup"

// A faithful in-memory Storage.
function memoryStorage(initial: Record<string, string> = {}): DismissalStorage & { dump: () => Record<string, string> } {
  const map = new Map(Object.entries(initial))
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
const show = (over: Partial<Parameters<typeof shouldShowTravelExpiryPopup>[0]> = {}) =>
  shouldShowTravelExpiryPopup({ expired: true, loginSessionKey: SID_A, storage: memoryStorage(), ...over })

describe("when the expiry popup is shown", () => {
  it("shown when Travel Mode expired, whatever the verification status", () => {
    assert.equal(show(), true)
  })

  it("verified + expired shows the popup", () => {
    // verification status is not an input at all: the same call serves both accounts
    const verified = parseIdentityVerificationSummary({ nextAction: "complete", fullyVerified: true, travelModeExpired: true })
    assert.equal(show({ expired: verified?.travelModeExpired ?? null }), true)
  })

  it("unverified + expired still shows the popup", () => {
    const unverified = parseIdentityVerificationSummary({ nextAction: "confirm_location", fullyVerified: false, travelModeExpired: true })
    assert.equal(show({ expired: unverified?.travelModeExpired ?? null }), true)
  })

  it("verified + active Travel Mode does not show the expiry popup", () => {
    const active = parseIdentityVerificationSummary({ nextAction: "complete", fullyVerified: true, travelModeExpired: false })
    assert.equal(show({ expired: active?.travelModeExpired ?? null }), false)
  })

  it("not shown unless the backend says expired === true", () => {
    for (const expired of [false, null]) assert.equal(show({ expired }), false)
  })

  it("cleared Travel Mode state (home country confirmed) stops it, even if never closed", () => {
    // the backend clears the travel fields; /me then reports no expired state
    const cleared = parseIdentityVerificationSummary({ nextAction: "complete", fullyVerified: true })
    assert.equal(cleared?.travelModeExpired, null)
    assert.equal(show({ expired: cleared?.travelModeExpired ?? null, storage: memoryStorage() }), false)
  })

  it("a new Travel Mode period suppresses it, and it returns after that period's next expiry (a later login)", () => {
    const storage = memoryStorage()
    dismissTravelExpiryPopup(SID_A, storage) // closed during the first expiry
    assert.equal(show({ expired: false, storage, loginSessionKey: SID_B }), false) // new period active
    assert.equal(show({ expired: true, storage, loginSessionKey: SID_B }), true) // next expiry, new login
  })
})

describe("the logic never changes verification or gate values", () => {
  it("is a pure decision: the input is not modified and no status is returned", () => {
    const input = Object.freeze({ expired: true, loginSessionKey: SID_A, storage: memoryStorage() })
    assert.equal(typeof shouldShowTravelExpiryPopup(input), "boolean")
  })

  it("verification status and gate values never reach this file", () => {
    const source = readFileSync("src/lib/api/travel-expiry-popup.ts", "utf8")
    const code = source.replace(/\/\/.*$/gm, "")
    for (const name of ["fullyVerified", "isVerified", "inGrace", "gateOpen", "identityVerificationStatus", "locationVerificationStatus"]) {
      assert.ok(!code.includes(name), `${name} must not appear in the expiry popup logic`)
    }
  })

  it("the dashboard passes only the expired flag and the session marker", () => {
    const page = readFileSync("app/(group)/talent-dashboard/page.tsx", "utf8")
    const call = page.slice(page.indexOf("shouldShowTravelExpiryPopup({"), page.indexOf("setTravelPopup(\"expiry\")"))
    assert.ok(!call.includes("fullyVerified"))
  })
})

describe("the general profile banner is unchanged", () => {
  const banner = (body: Record<string, unknown>) => shouldShowProfileBanner(parseIdentityVerificationSummary(body))

  it("a verified user (expired Travel Mode or not) never gets the banner, only the Travel Mode popup", () => {
    assert.equal(banner({ nextAction: "complete", fullyVerified: true, travelModeExpired: true }), false)
    assert.equal(banner({ nextAction: "complete", fullyVerified: true, travelModeExpired: false }), false)
  })

  it("an unverified user's banner depends on nextAction only, not on Travel Mode", () => {
    for (const expired of [true, false, undefined]) {
      assert.equal(banner({ nextAction: "confirm_location", fullyVerified: false, travelModeExpired: expired }), true)
      assert.equal(banner({ nextAction: "await_review", fullyVerified: false, travelModeExpired: expired }), false)
    }
  })
})

describe("dismissal is per login, keyed by the session id", () => {
  it("the key is exactly travelExpiryDismissed:<sid> in localStorage", () => {
    assert.equal(TRAVEL_EXPIRY_DISMISSED_PREFIX, "travelExpiryDismissed:")
    assert.equal(travelExpiryDismissalKey(SID_A), `travelExpiryDismissed:${SID_A}`)
    const storage = memoryStorage()
    dismissTravelExpiryPopup(SID_A, storage)
    assert.deepEqual(Object.keys(storage.dump()), [`travelExpiryDismissed:${SID_A}`])
  })

  it("closing the X dismisses it for this login", () => {
    const storage = memoryStorage()
    assert.equal(show({ storage }), true)
    dismissTravelExpiryPopup(SID_A, storage)
    assert.equal(show({ storage }), false)
  })

  it("a refresh (same session id) does not show it again", () => {
    const storage = memoryStorage()
    dismissTravelExpiryPopup(SID_A, storage)
    for (let reload = 0; reload < 3; reload += 1) assert.equal(show({ storage, loginSessionKey: SID_A }), false)
  })

  it("a later login (a different session id) shows it again", () => {
    const storage = memoryStorage()
    dismissTravelExpiryPopup(SID_A, storage)
    assert.equal(show({ storage, loginSessionKey: SID_B }), true)
  })

  it("closing it in the new login dismisses that login too, and only one marker is ever kept", () => {
    const storage = memoryStorage({ unrelated: "keep" })
    dismissTravelExpiryPopup(SID_A, storage)
    dismissTravelExpiryPopup(SID_B, storage)

    assert.equal(show({ storage, loginSessionKey: SID_B }), false)
    assert.deepEqual(storage.dump(), { [`travelExpiryDismissed:${SID_B}`]: "1", unrelated: "keep" })
  })

  it("many logins never accumulate markers", () => {
    const storage = memoryStorage()
    for (let i = 0; i < 25; i += 1) dismissTravelExpiryPopup(`sid-${i}`, storage)
    const markers = Object.keys(storage.dump()).filter((k) => k.startsWith(TRAVEL_EXPIRY_DISMISSED_PREFIX))
    assert.deepEqual(markers, [`${TRAVEL_EXPIRY_DISMISSED_PREFIX}sid-24`])
  })

})

describe("a missing session id", () => {
  it("still shows the popup", () => {
    for (const loginSessionKey of [null, ""]) assert.equal(show({ loginSessionKey }), true)
  })

  it("never persists a dismissal that could leak across logins", () => {
    const storage = memoryStorage()
    dismissTravelExpiryPopup(null, storage)
    dismissTravelExpiryPopup("", storage)
    assert.deepEqual(storage.dump(), {})
    assert.equal(show({ loginSessionKey: null, storage }), true) // it may reappear after a refresh
  })

  it("does not read a previous login's marker as this login's", () => {
    const storage = memoryStorage()
    dismissTravelExpiryPopup(SID_A, storage)
    assert.equal(show({ loginSessionKey: null, storage }), true)
  })
})

describe("storage that is unavailable", () => {
  const broken: DismissalStorage = {
    length: 0,
    key: () => { throw new Error("blocked") },
    getItem: () => { throw new Error("blocked") },
    setItem: () => { throw new Error("blocked") },
    removeItem: () => { throw new Error("blocked") },
  }
  it("shows the popup rather than hiding it silently", () => {
    assert.equal(show({ storage: broken }), true)
    assert.equal(show({ storage: undefined }), true)
  })
  it("closing never throws", () => {
    assert.doesNotThrow(() => dismissTravelExpiryPopup(SID_A, broken))
    assert.doesNotThrow(() => dismissTravelExpiryPopup(SID_A, undefined))
  })
})

describe("the key comes from /me, never from the HttpOnly session_id cookie", () => {
  const KEY_A = "a".repeat(64)
  const KEY_B = "b".repeat(64)
  const parse = (extra: Record<string, unknown>) => parseIdentityVerificationSummary({ nextAction: "complete", ...extra })

  it("the summary carries the opaque key exactly as sent", () => {
    assert.equal(parse({ loginSessionKey: KEY_A })?.loginSessionKey, KEY_A)
  })
  it("a missing or malformed key is null, so the popup shows and nothing is persisted", () => {
    for (const bad of [undefined, null, "", "short", 123, {}, "G".repeat(64), "a".repeat(65), `${KEY_A}\n`]) {
      assert.equal(parse({ loginSessionKey: bad })?.loginSessionKey, null, String(bad))
    }
  })
  it("no cookie reader exists any more in the popup modules or the dashboard", () => {
    const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
    for (const file of [
      read("src", "lib", "api", "travel-expiry-popup.ts"),
      read("src", "lib", "api", "travel-location-prompt.ts"),
      read("app", "(group)", "talent-dashboard", "page.tsx"),
    ]) {
      assert.ok(!/document\.cookie|readSessionId|readCookieValue|SESSION_COOKIE_NAME/.test(file))
    }
  })
  it("a refresh keeps the key and a new login changes it, so the dismissal follows the login", () => {
    const storage = memoryStorage()
    dismissTravelExpiryPopup(KEY_A, storage)
    assert.equal(shouldShowTravelExpiryPopup({ expired: true, loginSessionKey: KEY_A, storage }), false) // refresh
    assert.equal(shouldShowTravelExpiryPopup({ expired: true, loginSessionKey: KEY_B, storage }), true) // new login
    dismissTravelExpiryPopup(KEY_B, storage)
    assert.deepEqual(Object.keys(storage.dump()), [travelExpiryDismissalKey(KEY_B)]) // one marker only
  })
  it("another account's key never matches this login's marker", () => {
    const storage = memoryStorage()
    dismissTravelExpiryPopup(KEY_A, storage)
    assert.equal(shouldShowTravelExpiryPopup({ expired: true, loginSessionKey: KEY_B, storage }), true)
  })
})
