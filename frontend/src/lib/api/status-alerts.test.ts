// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  STATUS_ALERT_TYPES,
  StatusAlertResponseError,
  type StatusAlertTransport,
  dismissStatusAlert,
  listStatusAlerts,
  parseStatusAlert,
  parseStatusAlerts,
} from "./status-alerts"

const ID = "6f1c1d0e-2b7a-4c52-9a4e-0d6a1d9f3b10"
const alert = (over: Record<string, unknown> = {}) => ({
  id: ID,
  type: "travel_mode",
  title: "You are in Travel Mode",
  body: "Update your status if your location changes",
  link: null,
  metadata: null,
  createdAt: "2026-10-22T12:00:00.000Z",
  ...over,
})

function transport(over: Partial<StatusAlertTransport> = {}) {
  const calls: { method: string; path: string }[] = []
  const t: StatusAlertTransport = {
    get: async (path) => {
      calls.push({ method: "GET", path })
      return { data: [] }
    },
    post: async (path) => {
      calls.push({ method: "POST", path })
      return { data: { dismissed: true } }
    },
    ...over,
  }
  return { t, calls }
}

describe("parseStatusAlerts", () => {
  it("accepts a valid list and keeps its order", () => {
    const list = parseStatusAlerts([
      alert(),
      alert({ id: "6f1c1d0e-2b7a-4c52-9a4e-0d6a1d9f3b11", type: "verified" }),
    ])
    assert.equal(list.length, 2)
    assert.deepEqual(
      list.map((a) => a.type),
      ["travel_mode", "verified"]
    )
    assert.equal(list[0].createdAt, "2026-10-22T12:00:00.000Z")
  })

  it("accepts an empty list", () => {
    assert.deepEqual(parseStatusAlerts([]), [])
  })

  it("accepts each of the four alert types", () => {
    assert.deepEqual(
      [...STATUS_ALERT_TYPES],
      [
        "travel_mode",
        "submitted_for_review",
        "verified",
        "home_country_updated",
      ]
    )
    for (const type of STATUS_ALERT_TYPES) {
      assert.equal(parseStatusAlert(alert({ type }))?.type, type, type)
    }
  })

  it("keeps an in-app link, an https link and metadata", () => {
    assert.equal(
      parseStatusAlert(alert({ link: "/talent-dashboard" }))?.link,
      "/talent-dashboard"
    )
    assert.equal(
      parseStatusAlert(alert({ link: "https://example.com/x" }))?.link,
      "https://example.com/x"
    )
    assert.deepEqual(
      parseStatusAlert(alert({ metadata: { a: 1 } }))?.metadata,
      { a: 1 }
    )
  })

  it("drops an unknown type but keeps the valid alerts beside it", () => {
    const list = parseStatusAlerts([
      alert({ type: "something_new" }),
      alert({ type: "verified" }),
    ])
    assert.deepEqual(
      list.map((a) => a.type),
      ["verified"]
    )
  })

  it("drops malformed items", () => {
    const bad: unknown[] = [
      null,
      "x",
      42,
      [],
      alert({ id: "" }),
      alert({ id: 5 }),
      alert({ title: "  " }),
      alert({ body: undefined }),
      alert({ type: undefined }),
      alert({ type: "VERIFIED" }),
      alert({ createdAt: "not a date" }),
      alert({ createdAt: 1761134400000 }),
      alert({ link: 7 }),
      alert({ metadata: [] }),
      alert({ metadata: "x" }),
    ]
    assert.deepEqual(parseStatusAlerts(bad), [])
  })

  it("drops a link that is not an in-app path or http(s) URL", () => {
    for (const link of [
      "javascript:alert(1)",
      "//evil.example",
      "data:text/html,x",
      "ftp://x",
      "/a b",
    ]) {
      assert.equal(parseStatusAlert(alert({ link })), null, link)
    }
  })

  it("throws when the body is not a list", () => {
    for (const raw of [null, undefined, {}, "x", 1, { data: [] }]) {
      assert.throws(() => parseStatusAlerts(raw), StatusAlertResponseError)
    }
  })

  it("does not expose fields the contract does not carry", () => {
    const parsed = parseStatusAlert(
      alert({ userId: "u1", occurrenceKey: "k", dismissedAt: null })
    )
    assert.deepEqual(Object.keys(parsed ?? {}).sort(), [
      "body",
      "createdAt",
      "id",
      "link",
      "metadata",
      "title",
      "type",
    ])
  })
})

describe("listStatusAlerts", () => {
  it("GETs the status-alerts route and parses the body", async () => {
    const calls: { method: string; path: string }[] = []
    const { t } = transport({
      get: async (path) => {
        calls.push({ method: "GET", path })
        return { data: [alert()] }
      },
    })
    const list = await listStatusAlerts(t)
    assert.equal(list.length, 1)
    assert.deepEqual(calls, [
      { method: "GET", path: "/v1/notifications/status-alerts" },
    ])
  })

  it("returns an empty list for an empty response", async () => {
    assert.deepEqual(await listStatusAlerts(transport().t), [])
  })

  it("propagates an API failure", async () => {
    const failure = Object.assign(new Error("Request failed"), {
      response: { status: 500 },
    })
    const { t } = transport({
      get: async () => {
        throw failure
      },
    })
    await assert.rejects(listStatusAlerts(t), failure)
  })

  it("rejects a response that is not a list", async () => {
    const { t } = transport({ get: async () => ({ data: { alerts: [] } }) })
    await assert.rejects(listStatusAlerts(t), StatusAlertResponseError)
  })
})

describe("dismissStatusAlert", () => {
  it("POSTs to the dismiss route of that alert", async () => {
    const { t, calls } = transport()
    await dismissStatusAlert(t, ID)
    assert.deepEqual(calls, [
      { method: "POST", path: `/v1/notifications/status-alerts/${ID}/dismiss` },
    ])
  })

  it("rejects an id that is not a UUID without sending a request", async () => {
    const { t, calls } = transport()
    for (const id of ["", "abc", "../read", `${ID}/x`, "1; DROP TABLE"]) {
      await assert.rejects(
        dismissStatusAlert(t, id),
        StatusAlertResponseError,
        id
      )
    }
    assert.equal(calls.length, 0)
  })

  it("propagates an API failure (404, 401, network)", async () => {
    for (const status of [404, 401, 500]) {
      const failure = Object.assign(new Error(`HTTP ${status}`), {
        response: { status },
      })
      const { t } = transport({
        post: async () => {
          throw failure
        },
      })
      await assert.rejects(dismissStatusAlert(t, ID), failure)
    }
    const offline = new Error("Network Error")
    await assert.rejects(
      dismissStatusAlert(
        transport({
          post: async () => {
            throw offline
          },
        }).t,
        ID
      ),
      offline
    )
  })

  it("rejects a response that does not confirm the dismissal", async () => {
    for (const data of [
      undefined,
      null,
      {},
      { dismissed: false },
      { dismissed: "true" },
      "ok",
    ]) {
      const { t } = transport({ post: async () => ({ data }) })
      await assert.rejects(dismissStatusAlert(t, ID), StatusAlertResponseError)
    }
  })
})
