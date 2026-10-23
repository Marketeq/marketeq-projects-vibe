// Run like travel-location-prompt.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { kycReturnOriginBody } from "./kyc-return-origin"

const at = (origin: string) => ({ location: { origin } })

describe("kycReturnOriginBody", () => {
  it("staging sends the staging origin", () => {
    assert.deepEqual(
      kycReturnOriginBody(at("https://staging-marketeq-projects.vercel.app")),
      {
        returnOrigin: "https://staging-marketeq-projects.vercel.app",
      }
    )
  })

  it("production sends the production origin", () => {
    assert.deepEqual(
      kycReturnOriginBody(at("https://live-marketeq-projects.vercel.app")),
      {
        returnOrigin: "https://live-marketeq-projects.vercel.app",
      }
    )
  })

  it("local development sends localhost", () => {
    assert.deepEqual(kycReturnOriginBody(at("http://localhost:3000")), {
      returnOrigin: "http://localhost:3000",
    })
  })

  it("sends nothing it cannot vouch for: no window, an empty origin, or an opaque 'null' origin", () => {
    assert.deepEqual(kycReturnOriginBody(undefined), {})
    assert.deepEqual(kycReturnOriginBody(at("")), {})
    assert.deepEqual(kycReturnOriginBody(at("null")), {})
  })

  it("never carries anything but returnOrigin", () => {
    assert.deepEqual(
      Object.keys(kycReturnOriginBody(at("https://a.example"))),
      ["returnOrigin"]
    )
  })
})

describe("both Didit session starts send it", () => {
  const http = readFileSync(
    join(process.cwd(), "service", "http", "identity-verification.ts"),
    "utf8"
  )
  it("startFreeKyc and startHomeCountryChange post the origin body, and no start posts a bare {}", () => {
    assert.equal((http.match(/kycReturnOriginBody\(\)/g) ?? []).length, 2)
    assert.ok(!/kyc-sessions"?, \{\}\)/.test(http))
    assert.ok(!/kyc-sessions\/home-country-change"?, \{\}\)/.test(http))
  })
})
