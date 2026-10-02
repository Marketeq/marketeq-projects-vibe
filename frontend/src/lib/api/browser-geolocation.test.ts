// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { getBrowserPosition, type GeolocationLike } from "./browser-geolocation"

const geo = (
  behavior: (
    ok: Parameters<GeolocationLike["getCurrentPosition"]>[0],
    fail: Parameters<GeolocationLike["getCurrentPosition"]>[1],
    options: Parameters<GeolocationLike["getCurrentPosition"]>[2]
  ) => void
): GeolocationLike => ({ getCurrentPosition: behavior })

describe("getBrowserPosition", () => {
  it("does not touch the geolocation API until it is called", () => {
    let touched = 0
    const g = geo(() => {
      touched++
    })
    assert.equal(touched, 0)
    void getBrowserPosition(g)
    assert.equal(touched, 1)
  })

  it("returns the coordinates on success", async () => {
    const g = geo((ok) => ok({ coords: { latitude: 41.88, longitude: -87.63 } }))
    assert.deepEqual(await getBrowserPosition(g), {
      status: "ok",
      latitude: 41.88,
      longitude: -87.63,
    })
  })

  it("maps permission denied, position unavailable and timeout", async () => {
    for (const [code, status] of [
      [1, "denied"],
      [2, "unavailable"],
      [3, "timeout"],
      [99, "unavailable"],
    ] as const) {
      const g = geo((_ok, fail) => fail({ code }))
      assert.deepEqual(await getBrowserPosition(g), { status })
    }
  })

  it("reports an unsupported browser", async () => {
    assert.deepEqual(await getBrowserPosition(undefined), { status: "unsupported" })
    assert.deepEqual(
      await getBrowserPosition({} as unknown as GeolocationLike),
      { status: "unsupported" }
    )
  })

  it("treats a throwing API as unavailable", async () => {
    const g = geo(() => {
      throw new Error("insecure context")
    })
    assert.deepEqual(await getBrowserPosition(g), { status: "unavailable" })
  })

  it("rejects out-of-range or non-finite coordinates", async () => {
    for (const [latitude, longitude] of [
      [91, 0],
      [0, 181],
      [Number.NaN, 0],
      [0, Number.POSITIVE_INFINITY],
    ]) {
      const g = geo((ok) => ok({ coords: { latitude, longitude } }))
      assert.deepEqual(await getBrowserPosition(g), { status: "unavailable" })
    }
  })

  it("asks for a fresh, coarse position with a timeout", async () => {
    let seen: unknown
    const g = geo((ok, _fail, options) => {
      seen = options
      ok({ coords: { latitude: 1, longitude: 2 } })
    })
    await getBrowserPosition(g)
    assert.deepEqual(seen, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 0,
    })
  })
})
