// Run like status-alerts.test.ts (from the frontend/ directory).
// PMCM-651: an already-active traveler's Update > Temporarily traveling is a Travel Mode
// confirmation: a NEW persistent "Travel Mode is on" occurrence, no Update card for the rest
// of that login, no legacy toast, and the activation-login timing of 7e0d6915 unchanged.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { readLiveDismissals } from "./live-alert-dismissal"
import {
  type LiveDisplayAlert,
  dismissLiveAlert,
} from "./status-alert-dismissal"
import { isNewTravelActivation } from "./status-alert-reconcile"
import { type DismissalState, buildAlertStack } from "./status-alert-state"
import type { StatusAlert } from "./status-alerts"
import {
  readTravelActivationsInLogin,
  rememberTravelActivationInLogin,
} from "./travel-activation-login"
import {
  type PendingConfirmation,
  confirmActiveTravelMode,
} from "./travel-mode-confirmation"

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
const LOGIN = (n: number) => String(n).repeat(64)
const ENDS = "2026-11-02T14:50:52.523Z"
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
const ON: Travel = {
  travelModeActive: true,
  travelModeEndsAt: ENDS,
  travelModeExpired: false,
}
const types = (s: ReturnType<typeof buildAlertStack>) =>
  s.map((a) => a.type).sort()

// notification-service in miniature: one row per (type, occurrenceKey), a dismissed row is
// never resurrected, a new key is a new alert. The backend maps a confirmation id to
// `travel-mode-confirmed:<id>`; an activation uses `travel-mode:<activatedAt>`.
class FakeBackend {
  rows: Array<{ key: string; id: string; dismissed: boolean; at: number }> = []
  clock = 1_000
  failNext = 0
  requests: string[] = []
  upsert(key: string) {
    if (!this.rows.some((r) => r.key === key)) {
      this.rows.push({
        key,
        id: `00000000-0000-4000-8000-${String(this.rows.length).padStart(12, "0")}`,
        dismissed: false,
        at: (this.clock += 1000),
      })
    }
  }
  activate() {
    this.upsert(`travel-mode:${ENDS}`)
  }
  async confirm(confirmationId: string) {
    this.requests.push(confirmationId)
    if (this.failNext > 0) {
      this.failNext -= 1
      throw new Error("503")
    }
    this.upsert(`travel-mode-confirmed:${confirmationId}`)
  }
  list(): StatusAlert[] {
    return this.rows
      .filter((r) => !r.dismissed)
      .map((r) => ({
        id: r.id,
        type: "travel_mode" as const,
        title: "Travel Mode is on",
        body: "b",
        link: null,
        metadata: null,
        createdAt: new Date(
          Date.parse("2026-10-26T12:00:00Z") + r.at
        ).toISOString(),
      }))
  }
  dismissAll() {
    this.rows.forEach((r) => (r.dismissed = true))
  }
}

class Browser {
  storage = fakeStorage()
  previous: Travel | null = null
  loginKey = ""
  dismissal: DismissalState = {
    dismissedPersistentIds: new Set(),
    dismissedLiveKeys: new Set(),
  }
  pending: PendingConfirmation = { current: null }
  persistent: StatusAlert[] = []
  activationsHere: ReadonlySet<string> = new Set()
  summary: Travel = OFF
  ids = 0
  toastsOpened = 0 // the flow's legacy "Travel mode is on." toast: never mounted by the page
  constructor(public backend: FakeBackend) {}
  load(loginKey: string, summary: Travel) {
    this.loginKey = loginKey
    this.previous = null
    this.pending = { current: null }
    this.summary = summary
    this.dismissal = {
      ...this.dismissal,
      dismissedLiveKeys: readLiveDismissals(loginKey, this.storage),
    }
    this.activationsHere = readTravelActivationsInLogin(loginKey, this.storage)
    this.persistent = this.backend.list()
    this.see(summary)
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
      this.activationsHere = readTravelActivationsInLogin(
        this.loginKey,
        this.storage
      )
    }
    this.previous = summary
    this.summary = summary
  }
  refreshAlerts() {
    this.persistent = this.backend.list()
  }
  stack() {
    return buildAlertStack({
      persistent: this.persistent,
      ...this.dismissal,
      loginSessionKey: this.loginKey,
      travelModeActive: this.summary.travelModeActive,
      travelModeOccurrence: this.summary.travelModeEndsAt,
      travelModeActivatedAt: null,
      travelModeActivatedThisLogin: Boolean(
        this.summary.travelModeEndsAt &&
        this.activationsHere.has(this.summary.travelModeEndsAt)
      ),
    })
  }
  dismissCard(type: "travel_mode" | "travel_mode_ongoing") {
    const card = this.stack().find((a) => a.type === type)
    assert.ok(card, `no ${type} card to dismiss`)
    if (card.source === "live") {
      dismissLiveAlert({
        alert: card as LiveDisplayAlert,
        loginSessionKey: this.loginKey,
        storage: this.storage,
        update: (change) => (this.dismissal = change(this.dismissal)),
      })
    } else {
      this.dismissal = {
        ...this.dismissal,
        dismissedPersistentIds: new Set([
          ...this.dismissal.dismissedPersistentIds,
          card.id,
        ]),
      }
      this.backend.rows.find((r) => r.id === card.id)!.dismissed = true
    }
  }
  // Update > Temporarily traveling, as the page runs it.
  async chooseTemporarilyTraveling() {
    let reopened = false
    const result = await confirmActiveTravelMode({
      confirm: (id) => this.backend.confirm(id),
      pending: this.pending,
      newId: () =>
        `00000000-0000-4000-8000-${String(++this.ids).padStart(12, "0")}`,
      loginSessionKey: this.loginKey,
      occurrence: this.summary.travelModeEndsAt,
      storage: this.storage,
      onConfirmed: (occurrence) => {
        if (occurrence)
          this.activationsHere = new Set([...this.activationsHere, occurrence])
        this.refreshAlerts()
      },
      onFailed: () => {
        reopened = true
      },
    })
    return { result, reopened }
  }
}
const setup = () => {
  const backend = new FakeBackend()
  const b = new Browser(backend)
  return { backend, b }
}
// Activation in login 1, then a later login 2 where the Update card shows.
const toLaterLogin = () => {
  const { backend, b } = setup()
  b.load(LOGIN(1), OFF)
  backend.activate()
  b.see(ON)
  b.refreshAlerts()
  b.load(LOGIN(2), ON)
  return { backend, b }
}

describe("Update > Temporarily traveling for an already-active traveler", () => {
  it("1. a later login shows the Update card", () => {
    const { b } = toLaterLogin()
    assert.deepEqual(types(b.stack()), ["travel_mode", "travel_mode_ongoing"])
  })

  it("2-4. succeeds: the Update card disappears for that login and a NEW 'Travel Mode is on' occurrence appears", async () => {
    const { backend, b } = toLaterLogin()
    b.dismissCard("travel_mode") // the activation's alert was dismissed before
    assert.deepEqual(types(b.stack()), ["travel_mode_ongoing"])
    const out = await b.chooseTemporarilyTraveling()
    assert.equal(out.result, "confirmed")
    assert.deepEqual(types(b.stack()), ["travel_mode"]) // only the new persistent card, not both
    assert.equal(backend.rows.filter((r) => !r.dismissed).length, 1)
    assert.match(
      backend.rows[backend.rows.length - 1].key,
      /^travel-mode-confirmed:/
    )
  })

  it("7. a previously dismissed confirmation does not suppress the new occurrence", async () => {
    const { backend, b } = toLaterLogin()
    b.dismissCard("travel_mode") // the activation's alert, dismissed earlier
    await b.chooseTemporarilyTraveling()
    b.dismissCard("travel_mode") // dismisses the newest (the confirmation)
    b.refreshAlerts()
    assert.deepEqual(types(b.stack()), [])
    await b.chooseTemporarilyTraveling() // a second click is a second occurrence
    assert.equal(backend.rows.length, 3) // activation + two confirmations
    assert.deepEqual(types(b.stack()), ["travel_mode"])
  })

  it("5. a refresh keeps only the persistent confirmation", async () => {
    const { backend, b } = toLaterLogin()
    await b.chooseTemporarilyTraveling()
    b.load(LOGIN(2), ON) // refresh: same login, memory gone
    assert.ok(types(b.stack()).includes("travel_mode"))
    assert.equal(types(b.stack()).includes("travel_mode_ongoing"), false)
    b.load(LOGIN(2), ON)
    assert.equal(types(b.stack()).includes("travel_mode_ongoing"), false)
    assert.ok(backend.rows.length >= 2)
  })

  it("6. a new login shows Update again while Travel Mode is active, and the confirmation stays until dismissed", async () => {
    const { b } = toLaterLogin()
    await b.chooseTemporarilyTraveling()
    b.load(LOGIN(3), ON)
    assert.ok(types(b.stack()).includes("travel_mode_ongoing"))
    assert.ok(types(b.stack()).includes("travel_mode"))
  })

  it("8. a retry or duplicate delivery is idempotent: the same id is stored once", async () => {
    const { backend, b } = toLaterLogin()
    const before = backend.rows.length
    backend.failNext = 1
    const first = await b.chooseTemporarilyTraveling()
    assert.equal(first.result, "failed")
    const retry = await b.chooseTemporarilyTraveling() // the same pending id
    assert.equal(retry.result, "confirmed")
    assert.equal(backend.requests[0], backend.requests[1])
    backend.upsert(`travel-mode-confirmed:${backend.requests[1]}`) // a broker redelivery
    assert.equal(backend.rows.length, before + 1)
    // The next click, after a success, gets a fresh id.
    await b.chooseTemporarilyTraveling()
    assert.notEqual(backend.requests[2], backend.requests[1])
  })

  it("a failed confirmation keeps the Update card, hides nothing, stores nothing and reopens the Update screen", async () => {
    const { backend, b } = toLaterLogin()
    const rows = backend.rows.length
    backend.failNext = 1
    const out = await b.chooseTemporarilyTraveling()
    assert.deepEqual(out, { result: "failed", reopened: true })
    assert.ok(types(b.stack()).includes("travel_mode_ongoing"))
    assert.equal(backend.rows.length, rows)
    assert.equal(readTravelActivationsInLogin(LOGIN(2), b.storage).size, 0)
    b.load(LOGIN(2), ON) // even a refresh: still Update, no success alert
    assert.ok(types(b.stack()).includes("travel_mode_ongoing"))
  })

  it("9. no legacy toast: the page replaces the flow instance on close and nothing in the page opens one", () => {
    const page = readFileSync(
      new URL(
        "../../../app/(group)/talent-dashboard/page.tsx",
        import.meta.url
      ),
      "utf8"
    )
    assert.match(
      page,
      /prev\.activeTravelModeUpdate \? \{ \.\.\.prev, key: prev\.key \+ 1 \} : prev/
    )
    assert.doesNotMatch(page, /setTravelModeNotificationOpen/)
    assert.equal(new FakeBackend().rows.length, 0)
  })

  it("10. the activation-login timing is unchanged: only 'Travel Mode is on' in the activation login", () => {
    const { backend, b } = setup()
    b.load(LOGIN(1), OFF)
    backend.activate()
    b.see(ON)
    b.refreshAlerts()
    assert.deepEqual(types(b.stack()), ["travel_mode"])
    b.load(LOGIN(1), ON)
    assert.deepEqual(types(b.stack()), ["travel_mode"])
    b.load(LOGIN(2), ON)
    assert.deepEqual(types(b.stack()), ["travel_mode", "travel_mode_ongoing"])
  })
})

describe("the callback fires only for this exact branch of the flow (read-only file, one additive prop)", () => {
  const flow = readFileSync(
    new URL(
      "../../../components/identity-verification-flow.tsx",
      import.meta.url
    ),
    "utf8"
  )
  const calls = [...flow.matchAll(/onTravelModeConfirmed\?\.\(\)/g)]
  const branchStart = flow.indexOf("if (activeTravelModeUpdate) {")
  const branch = flow.slice(
    branchStart,
    flow.indexOf('send("NEXT")', branchStart)
  )

  it("is declared as an optional prop and called exactly once", () => {
    assert.match(flow, /onTravelModeConfirmed\?: \(\) => void/)
    assert.equal(calls.length, 1)
  })

  it("is called inside the activeTravelModeUpdate branch of 'Temporarily traveling', before the flow closes", () => {
    assert.ok(branch.includes("onTravelModeConfirmed?.()"))
    assert.ok(
      branch.indexOf("onTravelModeConfirmed?.()") <
        branch.indexOf("onOpenChange(false)")
    )
    assert.match(
      flow.slice(branchStart - 60, branchStart),
      /onClick=\{\(\) => \{\s*$/
    )
  })

  it("is not called by first-time activation (send NEXT), Permanently relocated, close or back", () => {
    const outside = flow.replace(branch, "")
    assert.equal(outside.includes("onTravelModeConfirmed?.()"), false)
    const first = flow.slice(
      branchStart + branch.length,
      branchStart + branch.length + 80
    )
    assert.ok(first.includes('send("NEXT")'))
    const relocated = flow.slice(
      flow.indexOf('persistTravelClassification("permanently_relocated")') -
        120,
      flow.indexOf('persistTravelClassification("permanently_relocated")') + 200
    )
    assert.equal(relocated.includes("onTravelModeConfirmed"), false)
    assert.equal(/DialogClose[^]{0,200}onTravelModeConfirmed/.test(flow), false)
    assert.equal(
      /send\("BACK"\)[^]{0,120}onTravelModeConfirmed/.test(flow),
      false
    )
  })

  it("adds nothing else: the toast markup and its state are as before", () => {
    assert.match(
      flow,
      /const \[travelModeNotificationOpen, setTravelModeNotificationOpen\] =/
    )
    assert.ok(branch.includes("setTravelModeNotificationOpen(true)"))
  })
})

describe("the dashboard wires the confirmation", () => {
  const page = readFileSync(
    new URL("../../../app/(group)/talent-dashboard/page.tsx", import.meta.url),
    "utf8"
  )
  it("passes the callback and confirms through the backend endpoint, awaiting the new alert", () => {
    assert.match(
      page,
      /onTravelModeConfirmed=\{\(\) => void handleTravelModeConfirmed\(\)\}/
    )
    assert.match(
      page,
      /confirm: \(id\) => IdentityVerificationAPI\.confirmTravelMode\(id\)/
    )
    assert.match(page, /startAlertReconcile\(\["travel_mode"\]\)/)
  })
})
