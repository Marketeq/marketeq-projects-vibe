// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  SESSION_COOKIE_NAME,
  TRAVEL_EXPIRY_DISMISSED_PREFIX,
  dismissTravelExpiryPopup,
  readCookieValue,
  readSessionId,
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
  shouldShowTravelExpiryPopup({ expired: true, fullyVerified: false, sessionId: SID_A, storage: memoryStorage(), ...over })

describe("when the expiry popup is shown", () => {
  it("shown when Travel Mode expired and the account is not fully verified", () => {
    assert.equal(show(), true)
  })

  it("not shown unless the backend says expired === true", () => {
    for (const expired of [false, null]) assert.equal(show({ expired }), false)
  })

  it("never shown to a fully verified account (that case is undecided and not handled)", () => {
    assert.equal(show({ fullyVerified: true }), false)
  })

  it("an unknown verification state shows nothing", () => {
    assert.equal(show({ fullyVerified: null }), false)
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
    for (let reload = 0; reload < 3; reload += 1) assert.equal(show({ storage, sessionId: SID_A }), false)
  })

  it("a later login (a different session id) shows it again", () => {
    const storage = memoryStorage()
    dismissTravelExpiryPopup(SID_A, storage)
    assert.equal(show({ storage, sessionId: SID_B }), true)
  })

  it("closing it in the new login dismisses that login too, and only one marker is ever kept", () => {
    const storage = memoryStorage({ unrelated: "keep" })
    dismissTravelExpiryPopup(SID_A, storage)
    dismissTravelExpiryPopup(SID_B, storage)

    assert.equal(show({ storage, sessionId: SID_B }), false)
    assert.deepEqual(storage.dump(), { [`travelExpiryDismissed:${SID_B}`]: "1", unrelated: "keep" })
  })

  it("many logins never accumulate markers", () => {
    const storage = memoryStorage()
    for (let i = 0; i < 25; i += 1) dismissTravelExpiryPopup(`sid-${i}`, storage)
    const markers = Object.keys(storage.dump()).filter((k) => k.startsWith(TRAVEL_EXPIRY_DISMISSED_PREFIX))
    assert.deepEqual(markers, [`${TRAVEL_EXPIRY_DISMISSED_PREFIX}sid-24`])
  })

  it("becoming fully verified later hides it even if it was never closed", () => {
    assert.equal(show({ fullyVerified: true, storage: memoryStorage() }), false)
  })
})

describe("a missing session id", () => {
  it("still shows the popup", () => {
    for (const sessionId of [null, ""]) assert.equal(show({ sessionId }), true)
  })

  it("never persists a dismissal that could leak across logins", () => {
    const storage = memoryStorage()
    dismissTravelExpiryPopup(null, storage)
    dismissTravelExpiryPopup("", storage)
    assert.deepEqual(storage.dump(), {})
    assert.equal(show({ sessionId: null, storage }), true) // it may reappear after a refresh
  })

  it("does not read a previous login's marker as this login's", () => {
    const storage = memoryStorage()
    dismissTravelExpiryPopup(SID_A, storage)
    assert.equal(show({ sessionId: null, storage }), true)
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

describe("reading the existing session_id cookie", () => {
  it("reads the session id from document.cookie", () => {
    assert.equal(SESSION_COOKIE_NAME, "session_id")
    assert.equal(readSessionId(`theme=dark; session_id=${SID_A}; other=1`), SID_A)
  })
  it("matches the exact name only", () => {
    assert.equal(readCookieValue("xsession_id=nope; session_id_old=nope2", "session_id"), null)
    assert.equal(readCookieValue("session_id=abc", "session_id"), "abc")
  })
  it("decodes an encoded value", () => {
    assert.equal(readCookieValue("session_id=a%2Db", "session_id"), "a-b")
  })
  it("an absent or empty cookie is null", () => {
    assert.equal(readSessionId(""), null)
    assert.equal(readSessionId("a=1; b=2"), null)
    assert.equal(readSessionId("session_id="), null)
    assert.equal(readSessionId(undefined), null)
  })
  it("a refresh keeps the id and a new login changes it, so the same key logic holds", () => {
    const before = readSessionId(`session_id=${SID_A}`)
    const afterRefresh = readSessionId(`session_id=${SID_A}`)
    const afterNewLogin = readSessionId(`session_id=${SID_B}`)
    assert.equal(before, afterRefresh)
    assert.notEqual(before, afterNewLogin)
  })
})
