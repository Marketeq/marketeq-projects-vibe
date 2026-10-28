// Run like status-alerts.test.ts (from the frontend/ directory).
// PMCM-651, Christopher's timing rule: in the login where Travel Mode is activated only the
// persistent "Travel Mode is on" card shows; "You are in Travel Mode / Update" starts with the
// next login, and at once when Travel Mode was already in force when the login began.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { readLiveDismissals } from "./live-alert-dismissal"
import {
  type LiveDisplayAlert,
  dismissLiveAlert,
} from "./status-alert-dismissal"
import { isNewTravelActivation } from "./status-alert-reconcile"
import {
  type DismissalState,
  applySupersession,
  buildAlertStack,
} from "./status-alert-state"
import type { StatusAlert } from "./status-alerts"
import {
  TRAVEL_ACTIVATED_IN_LOGIN_PREFIX,
  readTravelActivationsInLogin,
  rememberTravelActivationInLogin,
} from "./travel-activation-login"

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
const LOGIN_1 = "1".repeat(64)
const LOGIN_2 = "2".repeat(64)
const LOGIN_3 = "3".repeat(64)
const ENDS_1 = "2026-11-25T12:00:00.000Z"
const ENDS_2 = "2026-12-25T12:00:00.000Z"
const NOW = Date.parse("2026-10-26T12:00:00.000Z")
type Travel = {
  travelModeActive: boolean
  travelModeEndsAt: string | null
  travelModeExpired: boolean
}
const OFF: Travel = {
  travelModeActive: false,
  travelModeEndsAt: null,
  travelModeExpired: false,
}
const ON = (endsAt = ENDS_1): Travel => ({
  travelModeActive: true,
  travelModeEndsAt: endsAt,
  travelModeExpired: false,
})

const alert = (
  type: StatusAlert["type"],
  minAgo: number,
  seed = 0
): StatusAlert => ({
  id: `00000000-0000-4000-8000-${String(seed * 1000 + minAgo + 1).padStart(12, "0")}`,
  type,
  title: type,
  body: "b",
  link: null,
  metadata: null,
  createdAt: new Date(NOW - minAgo * 60_000).toISOString(),
})

// What the dashboard does for one render of one browser: remembers an activation seen as a
// transition in this page visit (the layout effect), reads the per-login markers, builds the stack.
class Browser {
  storage = fakeStorage()
  previous: Travel | null = null
  dismissal: DismissalState = {
    dismissedPersistentIds: new Set(),
    dismissedLiveKeys: new Set(),
  }
  persistent: StatusAlert[] = []
  loginKey: string | null = null
  // A page load: nothing is remembered in memory, only the storage survives.
  load(loginKey: string) {
    this.loginKey = loginKey
    this.previous = null
    this.dismissal = {
      ...this.dismissal,
      dismissedLiveKeys: readLiveDismissals(loginKey, this.storage),
    }
  }
  see(summary: Travel) {
    if (
      isNewTravelActivation(this.previous, summary) &&
      summary.travelModeEndsAt
    ) {
      rememberTravelActivationInLogin(
        this.loginKey,
        summary.travelModeEndsAt,
        this.storage
      )
    }
    this.previous = summary
    const here = readTravelActivationsInLogin(this.loginKey, this.storage)
    return buildAlertStack({
      persistent: this.persistent,
      ...this.dismissal,
      loginSessionKey: this.loginKey,
      travelModeActive: summary.travelModeActive,
      travelModeOccurrence: summary.travelModeEndsAt,
      travelModeActivatedAt: null,
      travelModeActivatedThisLogin: Boolean(
        summary.travelModeEndsAt && here.has(summary.travelModeEndsAt)
      ),
    })
  }
  dismissUpdate(stack: ReturnType<typeof buildAlertStack>) {
    const card = stack.find((a) => a.source === "live") as LiveDisplayAlert
    dismissLiveAlert({
      alert: card,
      loginSessionKey: this.loginKey,
      storage: this.storage,
      update: (change) => (this.dismissal = change(this.dismissal)),
    })
  }
}
const types = (s: ReturnType<typeof buildAlertStack>) => s.map((a) => a.type)

describe("Travel Mode activated during the current login", () => {
  it("shows only the persistent 'Travel Mode is on' card, not the Update card", () => {
    const b = new Browser()
    b.load(LOGIN_1)
    assert.deepEqual(types(b.see(OFF)), [])
    b.persistent = [alert("travel_mode", 0)] // stored a moment after the activation
    assert.deepEqual(types(b.see(ON())), ["travel_mode"])
  })

  it("the Update card does not appear before the persistent card arrives either", () => {
    const b = new Browser()
    b.load(LOGIN_1)
    b.see(OFF)
    assert.deepEqual(types(b.see(ON())), []) // the alert is not stored yet: still no Update
  })

  it("a refresh within the activation login keeps Update hidden", () => {
    const b = new Browser()
    b.load(LOGIN_1)
    b.see(OFF)
    b.persistent = [alert("travel_mode", 0)]
    b.see(ON())
    b.load(LOGIN_1) // refresh: same loginSessionKey, memory gone, storage kept
    assert.deepEqual(types(b.see(ON())), ["travel_mode"])
    b.load(LOGIN_1)
    assert.deepEqual(types(b.see(ON())), ["travel_mode"]) // and again
  })

  it("logout and a new login: the Update card appears next to the persistent card", () => {
    const b = new Browser()
    b.load(LOGIN_1)
    b.see(OFF)
    b.persistent = [alert("travel_mode", 5)]
    b.see(ON())
    b.load(LOGIN_2)
    assert.deepEqual(types(b.see(ON())).sort(), [
      "travel_mode",
      "travel_mode_ongoing",
    ])
  })

  it("dismissing Update hides it for the current login, even across a refresh", () => {
    const b = new Browser()
    b.load(LOGIN_2)
    b.dismissUpdate(b.see(ON()))
    assert.deepEqual(types(b.see(ON())), [])
    b.load(LOGIN_2)
    assert.deepEqual(types(b.see(ON())), [])
  })

  it("another new login: the dismissed Update card returns while Travel Mode is active", () => {
    const b = new Browser()
    b.load(LOGIN_2)
    b.dismissUpdate(b.see(ON()))
    b.load(LOGIN_3)
    assert.deepEqual(types(b.see(ON())), ["travel_mode_ongoing"])
  })

  it("a second activation in the same login (a new period) is announced, not 'Update'd", () => {
    const b = new Browser()
    b.load(LOGIN_2)
    assert.deepEqual(types(b.see(ON(ENDS_1))), ["travel_mode_ongoing"])
    assert.deepEqual(types(b.see(ON(ENDS_2))), []) // a new occurrence made in this login
    b.load(LOGIN_3)
    assert.deepEqual(types(b.see(ON(ENDS_2))), ["travel_mode_ongoing"])
  })
})

describe("Travel Mode already active before the login", () => {
  it("shows the Update card immediately, with no activation seen in this login", () => {
    const b = new Browser()
    b.load(LOGIN_2)
    assert.deepEqual(types(b.see(ON())), ["travel_mode_ongoing"])
    assert.equal(b.storage.store.size, 0) // nothing was recorded as an activation
  })
})

describe("neither Travel Mode card", () => {
  it("while Travel Mode is inactive (never active, or ended)", () => {
    const b = new Browser()
    b.load(LOGIN_1)
    assert.deepEqual(types(b.see(OFF)), [])
    b.persistent = [alert("travel_mode", 0)]
    b.see(ON())
    // Ended: the live card is gone; the stored persistent card stays until dismissed
    assert.equal(
      b.see(OFF).some((a) => a.type === "travel_mode_ongoing"),
      false
    )
  })

  it("after Home Country Updated supersedes Travel Mode", () => {
    for (const activatedHere of [true, false]) {
      const b = new Browser()
      b.load(LOGIN_1)
      if (activatedHere) b.see(OFF)
      b.persistent = [
        alert("travel_mode", 10),
        alert("home_country_updated", 1),
      ]
      // An approved change clears Travel Mode on the profile, so /me reads inactive.
      assert.deepEqual(types(b.see(OFF)), ["home_country_updated"])
    }
    // The profile read before the change still says active; the live card stays out.
    const stale = buildAlertStack({
      persistent: [alert("home_country_updated", 1)],
      loginSessionKey: LOGIN_2,
      travelModeActive: true,
      travelModeActivatedAt: new Date(NOW - 60 * 60_000).toISOString(),
    })
    assert.deepEqual(types(stale), ["home_country_updated"])
  })
})

describe("persistent 'Travel Mode is on' behavior is unchanged", () => {
  it("stays until dismissed, then stays hidden, and a new activation is a new alert", () => {
    const first = alert("travel_mode", 30, 1)
    const second = alert("travel_mode", 0, 2)
    assert.notEqual(first.id, second.id)
    const base = { loginSessionKey: LOGIN_1, travelModeActive: false as const }
    const shown = buildAlertStack({ persistent: [first], ...base })
    assert.deepEqual(types(shown), ["travel_mode"])
    const dismissedIds = new Set([first.id])
    assert.deepEqual(
      types(
        buildAlertStack({
          persistent: [first],
          dismissedPersistentIds: dismissedIds,
          ...base,
        })
      ),
      []
    )
    assert.deepEqual(
      types(
        buildAlertStack({
          persistent: [first, second],
          dismissedPersistentIds: dismissedIds,
          ...base,
        })
      ),
      ["travel_mode"]
    )
    assert.equal(applySupersession([first, second]).length, 2)
  })
})

describe("the per-login activation marker", () => {
  it("is keyed by the login, drops other logins' markers, and is safe without storage", () => {
    const s = fakeStorage()
    rememberTravelActivationInLogin(LOGIN_1, ENDS_1, s)
    assert.ok(readTravelActivationsInLogin(LOGIN_1, s).has(ENDS_1))
    assert.equal(readTravelActivationsInLogin(LOGIN_2, s).size, 0)
    rememberTravelActivationInLogin(LOGIN_2, ENDS_2, s)
    assert.deepEqual(
      [...s.store.keys()].filter((k) =>
        k.startsWith(TRAVEL_ACTIVATED_IN_LOGIN_PREFIX)
      ),
      [`${TRAVEL_ACTIVATED_IN_LOGIN_PREFIX}${LOGIN_2}`]
    )
    rememberTravelActivationInLogin(null, ENDS_1, s)
    assert.equal(s.store.size, 1)
    s.setItem(`${TRAVEL_ACTIVATED_IN_LOGIN_PREFIX}${LOGIN_2}`, "{bad")
    assert.equal(readTravelActivationsInLogin(LOGIN_2, s).size, 0)
    assert.doesNotThrow(() =>
      rememberTravelActivationInLogin(LOGIN_1, ENDS_1, undefined)
    )
  })

  it("uses no clock: the helper and the stack compare no times for this rule", () => {
    const src = readFileSync(
      new URL("./travel-activation-login.ts", import.meta.url),
      "utf8"
    )
    assert.equal(/Date\.now|new Date|setTimeout|setInterval/.test(src), false)
  })
})

describe("dashboard wiring", () => {
  const page = readFileSync(
    new URL("../../../app/(group)/talent-dashboard/page.tsx", import.meta.url),
    "utf8"
  )
  it("marks an activation seen in this visit before paint and feeds the stack", () => {
    assert.match(
      page,
      /useLayoutEffect\(\(\) => \{\s*if \(!user \|\| !isNewTravelActivation\(previousTravelSummaryRef\.current/
    )
    assert.match(
      page,
      /rememberTravelActivationInLogin\(liveLoginKey, occurrence/
    )
    assert.match(page, /travelModeActivatedThisLogin: Boolean\(/)
    assert.match(
      page,
      /readTravelActivationsInLogin\(liveLoginKey, window\.localStorage\)/
    )
  })
})
