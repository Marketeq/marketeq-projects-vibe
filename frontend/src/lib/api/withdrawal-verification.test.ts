// Run like time-tracker-download.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { withdrawalBlockFor } from "./withdrawal-verification"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")

describe("withdrawalBlockFor (G9 payout gate answers)", () => {
  it("403 VERIFICATION_REQUIRED opens the verification popup", () => {
    assert.equal(withdrawalBlockFor(403, { errorCode: "VERIFICATION_REQUIRED", missingRequirements: "identity" }), "verification_required")
  })
  it("503 IDENTITY_VERIFICATION_UNAVAILABLE shows the existing status-unavailable popup", () => {
    assert.equal(withdrawalBlockFor(503, { errorCode: "IDENTITY_VERIFICATION_UNAVAILABLE" }), "verification_unavailable")
  })
  it("every other answer is an ordinary failure, never a block", () => {
    for (const [s, d] of [[403, {}], [403, { errorCode: "KYC_NOT_STARTED" }], [503, {}], [404, { errorCode: "VERIFICATION_REQUIRED" }], [500, { errorCode: "IDENTITY_VERIFICATION_UNAVAILABLE" }], [403, null], [403, undefined]] as const) {
      assert.equal(withdrawalBlockFor(s, d), null)
    }
  })
})

describe("every withdrawal caller opens the existing Verify My Account popup", () => {
  for (const [name, file] of [
    ["withdraw dialog", ["components", "withdraw-funds-dialog.tsx"]],
    ["transfer-funds page", ["app", "transfer-funds", "page.tsx"]],
    ["verify-withdrawal page", ["app", "verify-withdrawal", "page.tsx"]],
  ] as const) {
    it(`${name} uses AccountVerificationGate and the shared mapper`, () => {
      const src = read(...file)
      assert.ok(src.includes('import { AccountVerificationGate } from "@/components/account-verification-gate"'))
      assert.ok(src.includes("withdrawalBlockFor(res.status, data)"))
      assert.ok(src.includes("<AccountVerificationGate"))
    })
  }
  it("the block is handled before the generic decline/invalid handling", () => {
    for (const file of [["components", "withdraw-funds-dialog.tsx"], ["app", "transfer-funds", "page.tsx"]] as const) {
      const src = read(...file)
      const at = src.indexOf("withdrawalBlockFor(res.status, data)")
      assert.ok(at > -1 && src.indexOf('data.errorCode === "ERR_INSUFFICIENT_BALANCE"', at) > at)
      assert.ok(src.slice(at, at + 200).includes("setVerificationBlock(block)"))
    }
    const v = read("app", "verify-withdrawal", "page.tsx")
    assert.ok(v.indexOf("withdrawalBlockFor(res.status, data)") < v.indexOf('data.errorCode === "ERR_MAGIC_LINK_EXPIRED"'))
  })
})
