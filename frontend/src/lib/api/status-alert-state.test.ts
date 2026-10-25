// Run like status-alerts.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  type DismissalState,
  MAX_VISIBLE_ALERTS,
  type StatusAlertInputs,
  applySupersession,
  buildAlertStack,
  dismissAlert,
  isUnverifiedBannerVisible,
  liveAlertKey,
  selectVisibleAlerts,
  undoPersistentDismissal,
} from "./status-alert-state"
import type { StatusAlert, StatusAlertType } from "./status-alerts"

const NOW = Date.parse("2026-10-23T12:00:00.000Z")
const alert = (
  n: number,
  type: StatusAlertType,
  createdAt: string
): StatusAlert => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  type,
  title: `t${n}`,
  body: `b${n}`,
  link: null,
  metadata: null,
  createdAt,
})
const at = (min: number) => new Date(NOW - min * 60_000).toISOString()

const base = (over: Partial<StatusAlertInputs> = {}): StatusAlertInputs => ({
  persistent: [],
  loginSessionKey: "login-1",
  nowMs: NOW,
  travelModeActive: false,
  fullyVerified: true,
  ...over,
})
const empty: DismissalState = {
  dismissedPersistentIds: new Set(),
  dismissedLiveKeys: new Set(),
}

describe("ordering and the visible cap", () => {
  it("orders persistent alerts newest first", () => {
    const stack = buildAlertStack(
      base({
        persistent: [
          alert(1, "travel_mode", at(30)),
          alert(2, "verified", at(5)),
          alert(3, "home_country_updated", at(40)),
        ],
      })
    )
    assert.deepEqual(
      stack.map((a) => a.type),
      ["verified", "travel_mode", "home_country_updated"]
    )
  })

  it("keeps a stable order for equal timestamps", () => {
    const same = at(5)
    const a = buildAlertStack(
      base({
        persistent: [alert(2, "verified", same), alert(1, "travel_mode", same)],
      })
    )
    const b = buildAlertStack(
      base({
        persistent: [alert(1, "travel_mode", same), alert(2, "verified", same)],
      })
    )
    assert.deepEqual(
      a.map((x) => x.key),
      b.map((x) => x.key)
    )
  })

  it("shows at most 3 and reports how many wait behind them", () => {
    const stack = buildAlertStack(
      base({
        persistent: [
          alert(1, "travel_mode", at(40)),
          alert(2, "verified", at(30)),
          alert(3, "home_country_updated", at(50)),
        ],
        travelModeActive: true,
        travelModeActivatedAt: at(10),
        fullyVerified: false,
        loginStartedAt: at(1),
      })
    )
    assert.equal(MAX_VISIBLE_ALERTS, 3)
    assert.equal(stack.length, 5)
    const { visible, hiddenCount } = selectVisibleAlerts(stack)
    assert.equal(visible.length, 3)
    assert.equal(hiddenCount, 2)
    assert.equal(visible[0].type, "unverified_account") // newest
  })

  it("an empty stack shows nothing", () => {
    assert.deepEqual(selectVisibleAlerts(buildAlertStack(base())), {
      visible: [],
      hiddenCount: 0,
    })
  })

  it("drops a persistent alert with an unreadable time instead of throwing", () => {
    const stack = buildAlertStack(
      base({ persistent: [alert(1, "verified", "not-a-date")] })
    )
    assert.equal(stack.length, 0)
  })
})

describe("dismissal and promotion", () => {
  const four = base({
    persistent: [
      alert(1, "travel_mode", at(40)),
      alert(2, "verified", at(30)),
      alert(3, "home_country_updated", at(20)),
      alert(4, "submitted_for_review", at(50)),
    ],
  })

  it("dismissing the top alert moves the rest up and promotes the hidden one", () => {
    const stack = buildAlertStack(four)
    // home_country_updated (20m ago) supersedes travel_mode (40m ago), verified supersedes
    // submitted (50m ago): two remain, newest first.
    assert.deepEqual(
      stack.map((a) => a.type),
      ["home_country_updated", "verified"]
    )
    const top = stack[0]
    const out = dismissAlert(empty, top)
    assert.deepEqual(out.effect, {
      kind: "dismiss_on_server",
      id: (top as { id: string }).id,
    })
    const after = buildAlertStack({ ...four, ...out.state })
    assert.deepEqual(
      after.map((a) => a.type),
      ["verified"]
    )
  })

  it("promotes a hidden fourth alert when a visible one is dismissed", () => {
    const input = base({
      persistent: [
        alert(1, "travel_mode", at(10)),
        alert(2, "verified", at(20)),
        alert(3, "home_country_updated", at(30)),
      ],
      travelModeActive: true,
      travelModeActivatedAt: at(5),
      fullyVerified: false,
      loginStartedAt: at(1),
    })
    // submitted/travel supersession does not apply here: home_country (30m) is OLDER than
    // travel_mode (10m), so a fresh Travel Mode alert stays.
    const stack = buildAlertStack(input)
    assert.equal(stack.length, 5)
    const first = selectVisibleAlerts(stack)
    assert.equal(first.hiddenCount, 2)
    const out = dismissAlert(empty, first.visible[0])
    const next = selectVisibleAlerts(
      buildAlertStack({ ...input, ...out.state })
    )
    assert.equal(next.visible.length, 3)
    assert.equal(next.hiddenCount, 1)
    assert.ok(!next.visible.some((a) => a.key === first.visible[0].key))
  })

  it("a persistent dismissal is not undone by a new login; a failed request can be undone", () => {
    const stack = buildAlertStack(
      base({ persistent: [alert(1, "verified", at(5))] })
    )
    const out = dismissAlert(empty, stack[0])
    assert.equal(
      buildAlertStack(
        base({
          persistent: [alert(1, "verified", at(5))],
          loginSessionKey: "login-2",
          ...out.state,
        })
      ).length,
      0
    )
    const restored = undoPersistentDismissal(
      out.state,
      (stack[0] as { id: string }).id
    )
    assert.equal(
      buildAlertStack(
        base({ persistent: [alert(1, "verified", at(5))], ...restored })
      ).length,
      1
    )
  })

  it("does not mutate the previous state", () => {
    const stack = buildAlertStack(
      base({ persistent: [alert(1, "verified", at(5))] })
    )
    dismissAlert(empty, stack[0])
    assert.equal(empty.dismissedPersistentIds.size, 0)
  })
})

describe("supersession", () => {
  it("Verified removes an older Submitted for Review", () => {
    const out = applySupersession([
      alert(1, "submitted_for_review", at(10)),
      alert(2, "verified", at(5)),
    ])
    assert.deepEqual(
      out.map((a) => a.type),
      ["verified"]
    )
  })

  it("a Submitted that is newer than the Verified (a later re-verification) stays", () => {
    const out = applySupersession([
      alert(1, "verified", at(60)),
      alert(2, "submitted_for_review", at(5)),
    ])
    assert.equal(out.length, 2)
  })

  it("an approved home-country update removes the older Travel Mode alert", () => {
    const out = applySupersession([
      alert(1, "travel_mode", at(10)),
      alert(2, "home_country_updated", at(5)),
    ])
    assert.deepEqual(
      out.map((a) => a.type),
      ["home_country_updated"]
    )
  })

  it("a Travel Mode activated after the home-country update stays", () => {
    const out = applySupersession([
      alert(1, "home_country_updated", at(60)),
      alert(2, "travel_mode", at(5)),
    ])
    assert.equal(out.length, 2)
  })

  it("does not change the input list", () => {
    const input = [
      alert(1, "submitted_for_review", at(10)),
      alert(2, "verified", at(5)),
    ]
    applySupersession(input)
    assert.equal(input.length, 2)
  })
})

describe("live alerts", () => {
  it("the ongoing Travel Mode card shows while Travel Mode is active", () => {
    const stack = buildAlertStack(
      base({ travelModeActive: true, travelModeActivatedAt: at(5) })
    )
    assert.equal(stack.length, 1)
    assert.equal(stack[0].source, "live")
    assert.equal(stack[0].type, "travel_mode_ongoing")
  })

  it("it stays hidden once Travel Mode ends, even if it was never dismissed", () => {
    assert.equal(buildAlertStack(base({ travelModeActive: false })).length, 0)
  })

  it("dismissing it lasts for this login only and returns on the next login while Travel Mode is on", () => {
    const input = base({ travelModeActive: true, travelModeActivatedAt: at(5) })
    const card = buildAlertStack(input)[0]
    const out = dismissAlert(empty, card)
    assert.deepEqual(out.effect, {
      kind: "remember_for_session",
      key: card.key,
    })
    assert.equal(buildAlertStack({ ...input, ...out.state }).length, 0)
    // same login after a refresh: still dismissed
    assert.equal(
      buildAlertStack({ ...input, ...out.state, nowMs: NOW + 1000 }).length,
      0
    )
    // next login: a new loginSessionKey, the stored key no longer matches
    assert.equal(
      buildAlertStack({ ...input, ...out.state, loginSessionKey: "login-2" })
        .length,
      1
    )
  })

  it("the persistent 'Travel Mode is on' alert is independent of the live card", () => {
    const input = base({
      persistent: [alert(1, "travel_mode", at(5))],
      travelModeActive: true,
      travelModeActivatedAt: at(5),
    })
    const stack = buildAlertStack(input)
    assert.equal(stack.length, 2)
    const out = dismissAlert(
      empty,
      stack.find((a) => a.source === "persistent")!
    )
    const after = buildAlertStack({ ...input, ...out.state })
    assert.deepEqual(
      after.map((a) => a.source),
      ["live"]
    )
  })

  it("the unverified card shows for an unverified account and returns on every new login", () => {
    const input = base({ fullyVerified: false })
    const card = buildAlertStack(input)[0]
    assert.equal(card.type, "unverified_account")
    const out = dismissAlert(empty, card)
    assert.equal(buildAlertStack({ ...input, ...out.state }).length, 0)
    assert.equal(
      buildAlertStack({ ...input, ...out.state, loginSessionKey: "login-2" })
        .length,
      1
    )
  })

  it("once fully verified the unverified card never appears, whatever was dismissed", () => {
    assert.equal(buildAlertStack(base({ fullyVerified: true })).length, 0)
  })

  it("shows no live alert while the profile is loading or the login is unknown", () => {
    assert.equal(
      buildAlertStack(
        base({ fullyVerified: undefined, travelModeActive: undefined })
      ).length,
      0
    )
    assert.equal(
      buildAlertStack(
        base({
          loginSessionKey: null,
          fullyVerified: false,
          travelModeActive: true,
        })
      ).length,
      0
    )
  })

  it("live keys are per login session and per kind", () => {
    assert.notEqual(
      liveAlertKey("unverified_account", "a"),
      liveAlertKey("unverified_banner", "a")
    )
    assert.notEqual(
      liveAlertKey("unverified_banner", "a"),
      liveAlertKey("unverified_banner", "b")
    )
  })
})

describe("the inline unverified banner", () => {
  it("shows for an unverified account and is dismissed for this login only", () => {
    const input = { fullyVerified: false, loginSessionKey: "login-1" }
    assert.equal(isUnverifiedBannerVisible(input), true)
    const dismissed = new Set([liveAlertKey("unverified_banner", "login-1")])
    assert.equal(
      isUnverifiedBannerVisible({ ...input, dismissedLiveKeys: dismissed }),
      false
    )
    assert.equal(
      isUnverifiedBannerVisible({
        ...input,
        loginSessionKey: "login-2",
        dismissedLiveKeys: dismissed,
      }),
      true
    )
  })

  it("dismissing the banner does not dismiss the card, and the reverse", () => {
    const bannerKey = liveAlertKey("unverified_banner", "login-1")
    const input = base({
      fullyVerified: false,
      dismissedLiveKeys: new Set([bannerKey]),
    })
    assert.equal(buildAlertStack(input).length, 1)
    const card = liveAlertKey("unverified_account", "login-1")
    assert.equal(
      isUnverifiedBannerVisible({
        fullyVerified: false,
        loginSessionKey: "login-1",
        dismissedLiveKeys: new Set([card]),
      }),
      true
    )
  })

  it("is never visible once fully verified, or while the profile is unknown", () => {
    assert.equal(
      isUnverifiedBannerVisible({ fullyVerified: true, loginSessionKey: "l" }),
      false
    )
    assert.equal(
      isUnverifiedBannerVisible({
        fullyVerified: undefined,
        loginSessionKey: "l",
      }),
      false
    )
    assert.equal(
      isUnverifiedBannerVisible({
        fullyVerified: false,
        loginSessionKey: null,
      }),
      false
    )
  })
})

describe("an approved home-country change ends Travel Mode", () => {
  const live = (over: Partial<StatusAlertInputs> = {}) =>
    base({
      travelModeActive: true,
      travelModeActivatedAt: at(60),
      ...over,
    })

  it("the ongoing card no longer qualifies once a newer Home Country Updated alert exists, even from a stale profile", () => {
    const stack = buildAlertStack(
      live({ persistent: [alert(1, "home_country_updated", at(5))] })
    )
    assert.deepEqual(
      stack.map((a) => a.type),
      ["home_country_updated"]
    )
  })

  it("a Travel Mode activated AFTER the home-country change shows its ongoing card again", () => {
    const stack = buildAlertStack(
      live({
        travelModeActivatedAt: at(5),
        persistent: [alert(1, "home_country_updated", at(60))],
      })
    )
    assert.ok(stack.some((a) => a.type === "travel_mode_ongoing"))
  })

  it("the persistent Travel Mode alert is superseded by the newer home-country alert, and not by an older one", () => {
    const out = applySupersession([
      alert(1, "travel_mode", at(30)),
      alert(2, "home_country_updated", at(5)),
    ])
    assert.deepEqual(
      out.map((a) => a.type),
      ["home_country_updated"]
    )
    const later = applySupersession([
      alert(1, "home_country_updated", at(30)),
      alert(2, "travel_mode", at(5)),
    ])
    assert.equal(later.length, 2)
  })
})
