// Run like status-alerts.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  LIVE_ALERT_DISMISSED_PREFIX,
  liveAlertDismissalStorageKey,
  readLiveDismissals,
  rememberLiveDismissal,
} from "./live-alert-dismissal"
import {
  type LiveDisplayAlert,
  dismissLiveAlert,
  isRenderedAlert,
} from "./status-alert-dismissal"
import {
  type DismissalState,
  type StatusAlertInputs,
  buildAlertStack,
  liveAlertKey,
} from "./status-alert-state"
import type { StatusAlert } from "./status-alerts"

const fakeStorage = () => {
  const store = new Map<string, string>()
  return {
    store,
    get length() {
      return store.size
    },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  }
}
const A = "a".repeat(64) // login 1 of account X
const B = "b".repeat(64) // a new login of the same account
const NOW = Date.parse("2026-10-25T12:00:00.000Z")
const empty: DismissalState = {
  dismissedPersistentIds: new Set(),
  dismissedLiveKeys: new Set(),
}
const inputs = (over: Partial<StatusAlertInputs> = {}): StatusAlertInputs => ({
  persistent: [],
  loginSessionKey: A,
  nowMs: NOW,
  travelModeActive: true,
  fullyVerified: undefined,
  ...over,
})
const persistentAlert = (
  type: StatusAlert["type"],
  min: number
): StatusAlert => ({
  id: `00000000-0000-4000-8000-${String(min).padStart(12, "0")}`,
  type,
  title: "t",
  body: "b",
  link: null,
  metadata: null,
  createdAt: new Date(NOW - min * 60_000).toISOString(),
})

describe("per-login storage of live dismissals", () => {
  it("nothing is dismissed before anything is stored, or without a key or storage", () => {
    const s = fakeStorage()
    assert.equal(readLiveDismissals(A, s).size, 0)
    assert.equal(readLiveDismissals(null, s).size, 0)
    assert.equal(readLiveDismissals(A, undefined).size, 0)
  })

  it("a dismissal survives a refresh (same key) and does not carry to a new login", () => {
    const s = fakeStorage()
    const k = liveAlertKey("travel_mode_ongoing", A)
    rememberLiveDismissal(A, k, s)
    assert.ok(readLiveDismissals(A, s).has(k)) // after a refresh in the same login
    assert.equal(readLiveDismissals(B, s).size, 0) // the next login: the card returns
  })

  it("keeps exactly one marker: a later login's write removes the earlier login's", () => {
    const s = fakeStorage()
    rememberLiveDismissal(A, liveAlertKey("travel_mode_ongoing", A), s)
    rememberLiveDismissal(B, liveAlertKey("travel_mode_ongoing", B), s)
    assert.deepEqual([...s.store.keys()], [liveAlertDismissalStorageKey(B)])
    assert.ok([...s.store.keys()][0].startsWith(LIVE_ALERT_DISMISSED_PREFIX))
  })

  it("accumulates several live keys in one login", () => {
    const s = fakeStorage()
    rememberLiveDismissal(A, "one", s)
    rememberLiveDismissal(A, "two", s)
    assert.deepEqual([...readLiveDismissals(A, s)].sort(), ["one", "two"])
  })

  it("a corrupt marker or unavailable storage never hides the card and never throws", () => {
    const s = fakeStorage()
    s.setItem(liveAlertDismissalStorageKey(A), "{not json")
    assert.equal(readLiveDismissals(A, s).size, 0)
    s.setItem(liveAlertDismissalStorageKey(A), '"a string"')
    assert.equal(readLiveDismissals(A, s).size, 0)
    const broken = {
      length: 0,
      key: () => null,
      getItem: () => {
        throw new Error("denied")
      },
      setItem: () => {
        throw new Error("denied")
      },
      removeItem: () => undefined,
    }
    assert.equal(readLiveDismissals(A, broken).size, 0)
    assert.doesNotThrow(() => rememberLiveDismissal(A, "k", broken))
  })

  it("without a login key nothing is stored", () => {
    const s = fakeStorage()
    rememberLiveDismissal(null, "k", s)
    assert.equal(s.store.size, 0)
  })
})

describe("the live Travel Mode card", () => {
  const stack = (over: Partial<StatusAlertInputs> = {}, state = empty) =>
    buildAlertStack({ ...inputs(over), ...state })
  const card = (over: Partial<StatusAlertInputs> = {}, state = empty) =>
    stack(over, state).find((a) => a.type === "travel_mode_ongoing")

  it("shows while Travel Mode is in force, with Figma's copy and the Update action", () => {
    const c = card() as LiveDisplayAlert
    assert.equal(c.title, "You are in Travel Mode")
    assert.equal(c.body, "Update your status if your location changes")
    assert.equal(c.actionLabel, "Update")
    assert.equal(isRenderedAlert(c), true)
  })

  it("does not show while the profile or login is still loading, or once Travel Mode ended", () => {
    assert.equal(card({ travelModeActive: undefined }), undefined)
    assert.equal(card({ loginSessionKey: undefined }), undefined)
    assert.equal(card({ travelModeActive: false }), undefined)
  })

  it("dismissing hides it for this login only, calls no backend and stores under the login key", () => {
    const s = fakeStorage()
    let state = empty
    const c = card() as LiveDisplayAlert
    dismissLiveAlert({
      alert: c,
      loginSessionKey: A,
      storage: s,
      update: (change) => {
        state = change(state)
      },
    })
    assert.equal(card({}, state), undefined)
    // refresh in the same login: the stored dismissal is read back
    const afterRefresh: DismissalState = {
      ...empty,
      dismissedLiveKeys: readLiveDismissals(A, s),
    }
    assert.equal(card({}, afterRefresh), undefined)
    // the next login while Travel Mode is still on: it returns
    const nextLogin: DismissalState = {
      ...empty,
      dismissedLiveKeys: readLiveDismissals(B, s),
    }
    assert.ok(card({ loginSessionKey: B }, nextLogin))
  })

  it("a card dismissed in this login returns for a LATER activation, and stays dismissed for the same one", () => {
    const s = fakeStorage()
    const first = card({
      travelModeOccurrence: "2026-11-01T00:00:00.000Z",
    }) as LiveDisplayAlert
    let state = empty
    dismissLiveAlert({
      alert: first,
      loginSessionKey: A,
      storage: s,
      update: (change) => {
        state = change(state)
      },
    })
    const stored: DismissalState = {
      ...empty,
      dismissedLiveKeys: readLiveDismissals(A, s),
    }
    assert.equal(
      card({ travelModeOccurrence: "2026-11-01T00:00:00.000Z" }, stored),
      undefined
    )
    assert.ok(
      card({ travelModeOccurrence: "2026-11-20T00:00:00.000Z" }, stored)
    )
  })

  it("is isolated by account: another account's login key has its own dismissals", () => {
    const s = fakeStorage()
    const other = "c".repeat(64)
    rememberLiveDismissal(A, liveAlertKey("travel_mode_ongoing", A), s)
    assert.equal(readLiveDismissals(other, s).size, 0)
  })

  it("is hidden by an approved home-country update newer than the activation, and returns for a later activation", () => {
    const home = persistentAlert("home_country_updated", 5)
    assert.equal(
      card({
        persistent: [home],
        travelModeActivatedAt: new Date(NOW - 60 * 60_000).toISOString(),
      }),
      undefined
    )
    assert.ok(
      card({
        persistent: [home],
        travelModeActivatedAt: new Date(NOW - 1 * 60_000).toISOString(),
      })
    )
  })

  it("is eligible with the persistent alerts: newest first, three at most", () => {
    const all = stack({
      persistent: [
        persistentAlert("travel_mode", 40),
        persistentAlert("submitted_for_review", 30),
        persistentAlert("verified", 20),
        persistentAlert("home_country_updated", 50),
      ],
      travelModeActivatedAt: new Date(NOW - 10 * 60_000).toISOString(),
    }).filter(isRenderedAlert)
    assert.equal(all[0].type, "travel_mode_ongoing") // activated most recently
    assert.ok(all.length >= 3)
  })
})
