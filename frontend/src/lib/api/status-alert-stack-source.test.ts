// Run like status-alerts.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { withoutStatusAlertStack } from "./status-alert-stack-source"

const START = "{(statusAlertStack.visible.length > 0 ||"
const BANNER = "{profileBannerShown && !profileBannerDismissed && ("
const wrap = (between: string) =>
  `<div>\n${START} x) && (<div>stack</div>)}${between}\n${BANNER} y)}\n<Welcome onToggle />`

describe("the layout guards' status-alert stack exemption stays strict", () => {
  it("removes exactly the stack block and leaves the banner and everything after it", () => {
    assert.equal(
      withoutStatusAlertStack(wrap("")).replace(/\s+/g, ""),
      `<div>${BANNER} y)}<Welcome onToggle />`.replace(/\s+/g, "")
    )
  })

  it("refuses extra markup between the block and the banner (it would escape the hash)", () => {
    assert.throws(() =>
      withoutStatusAlertStack(wrap("<section>hidden</section>"))
    )
    assert.throws(() => withoutStatusAlertStack(wrap("{extra}")))
  })

  it("refuses a missing, duplicated or unbalanced block", () => {
    assert.throws(() => withoutStatusAlertStack(`<div>${BANNER} y)}`))
    assert.throws(() => withoutStatusAlertStack(wrap("") + wrap("")))
    assert.throws(() =>
      withoutStatusAlertStack(`${START} x && (<div>)\n${BANNER} y)}`)
    )
  })

  it("accepts the real dashboard page", () => {
    const page = readFileSync(
      join(process.cwd(), "app", "(group)", "talent-dashboard", "page.tsx"),
      "utf8"
    )
    const stripped = withoutStatusAlertStack(page)
    assert.ok(!stripped.includes("statusAlertStack.visible.length"))
    assert.ok(stripped.includes(BANNER))
  })
})
