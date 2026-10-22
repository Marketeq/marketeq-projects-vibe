// Run like travel-check-in.test.ts (from the frontend/ directory).
// The duration screen: the whole row of each option is interactive.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { CHECK_IN_DURATION_LABELS } from "./travel-check-in"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const page = read("app", "(group)", "talent-dashboard", "page.tsx")
const stories = read("stories", "identity-verification-check-in.stories.tsx")
const between = (source: string, from: string, to: string) => {
  const start = source.indexOf(from)
  assert.ok(start >= 0, `missing: ${from}`)
  return source.slice(start, source.indexOf(to, start))
}
const rowClass = (group: string) => {
  const m = /<Label\b[^>]*?className="([^"]+)"/.exec(group)
  assert.ok(m, "row className")
  return m[1]
}
const pageGroup = between(page, "<RadioGroup", "</RadioGroup>")
const storyGroup = between(stories, "<RadioGroup", "</RadioGroup>")
const ROW_CLASS = rowClass(pageGroup)

describe("every option row is one label tied to its radio input", () => {
  for (const [where, group, prefix] of [
    ["dashboard", pageGroup, "check-in-duration-"],
    ["story", storyGroup, "check-in-duration-${answerCount}-"],
  ] as const) {
    it(`${where}: the label wraps the radio and the text, and htmlFor matches the radio id`, () => {
      assert.ok(group.includes("CHECK_IN_DURATION_LABELS.map("))
      assert.equal((group.match(/<Label\b/g) ?? []).length, 1) // one per mapped option
      assert.equal((group.match(/<RadioGroupItem\b/g) ?? []).length, 1)
      // radio is inside the label, followed by the option text
      assert.ok(group.indexOf("<Label") < group.indexOf("<RadioGroupItem"))
      assert.ok(group.indexOf("<RadioGroupItem") < group.lastIndexOf("{label}"))
      assert.ok(group.lastIndexOf("{label}") < group.indexOf("</Label>"))
      assert.ok(group.includes(`htmlFor={\`${prefix}\${index}\`}`))
      assert.ok(group.includes(`id={\`${prefix}\${index}\`}`))
      assert.ok(group.includes(`className="${ROW_CLASS}"`))
    })

    it(`${where}: the group has an accessible name and no raw controls`, () => {
      assert.ok(group.includes("aria-label="))
      assert.ok(!/<(button|input|label)\b/.test(group))
    })
  }

  it("all four options exist, so all four rows get this markup (first-time and later copy share it)", () => {
    assert.deepEqual([...CHECK_IN_DURATION_LABELS], [
      "A few days",
      "1–2 weeks",
      "More than 2 weeks",
      "Not sure",
    ])
    assert.ok(storyGroup.includes("CHECK_IN_DURATION_LABELS.map("))
    // one group serves both copies; only the title/body/alert differ
    assert.equal((page.match(/<RadioGroup\b/g) ?? []).length, 1)
  })
})

describe("the row looks interactive", () => {
  const classes = ROW_CLASS.split(" ")
  it("the dashboard and the story use the same row classes", () => {
    assert.equal(rowClass(storyGroup), ROW_CLASS)
  })

  it("pointer cursor, full-width row, hover, focus and selected styling", () => {
    for (const c of [
      "cursor-pointer",
      "w-full",
      "hover:bg-gray-50",
      "has-[:focus-visible]:ring-2",
      "has-[[data-state=checked]]:bg-primary-25",
    ]) {
      assert.ok(classes.includes(c), c)
    }
  })

  it("disabled rows show it and stop reacting to hover", () => {
    for (const c of [
      "has-[:disabled]:cursor-not-allowed",
      "has-[:disabled]:opacity-50",
      "has-[:disabled]:hover:bg-transparent",
    ]) {
      assert.ok(classes.includes(c), c)
    }
  })
})

describe("one click submits once, and nothing is clickable while saving", () => {
  it("the only submit path is the group's onValueChange; the label and the rows have no onClick", () => {
    assert.equal((pageGroup.match(/onValueChange=/g) ?? []).length, 1)
    assert.ok(!pageGroup.includes("onClick"))
    assert.ok(pageGroup.includes("void handleCheckInAnswer(label)"))
  })

  it("all choices are disabled while the request is in flight, and a second call is refused", () => {
    assert.ok(pageGroup.includes("disabled={checkInSaving}"))
    const handler = between(
      page,
      "const handleCheckInAnswer",
      "const outcome = await answerCheckIn("
    )
    assert.ok(
      handler.includes("if (!checkIn || checkInSavingRef.current) return")
    )
    assert.ok(handler.indexOf("checkInSavingRef.current = true") > 0)
  })

  it("the group keeps the radio-group primitive, so arrow keys, Space and focus work natively", () => {
    assert.ok(page.includes("RadioGroup,") || page.includes("RadioGroup\n"))
    assert.ok(!pageGroup.includes("onKeyDown"))
    assert.ok(!pageGroup.includes("tabIndex"))
  })
})
