// Run like travel-check-in.test.ts (from the frontend/ directory).
// The duration screen (Figma 13101-46818 and the first-time TravelingForm): a plain vertical
// radio list. The radio and its text are both clickable through one accessible label.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  CHECK_IN_COPY,
  CHECK_IN_DURATION_LABELS,
  durationCopyFor,
} from "./travel-check-in"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const page = read("app", "(group)", "talent-dashboard", "page.tsx")
const stories = read("stories", "identity-verification-check-in.stories.tsx")
const between = (source: string, from: string, to: string) => {
  const start = source.indexOf(from)
  assert.ok(start >= 0, `missing: ${from}`)
  return source.slice(start, source.indexOf(to, start))
}
const pageGroup = between(page, "<RadioGroup", "</RadioGroup>")
const storyGroup = between(stories, "<RadioGroup", "</RadioGroup>")

describe("a simple vertical radio list with an accessible label per option", () => {
  for (const [where, group, prefix] of [
    ["dashboard", pageGroup, "check-in-duration-"],
    ["story", storyGroup, "check-in-duration-${answerCount}-"],
  ] as const) {
    it(`${where}: radio, then its Label (htmlFor = radio id), in an inline row`, () => {
      assert.ok(group.includes("CHECK_IN_DURATION_LABELS.map("))
      assert.equal((group.match(/<Label\b/g) ?? []).length, 1)
      assert.equal((group.match(/<RadioGroupItem\b/g) ?? []).length, 1)
      // the same rows as the first-time TravelingForm story (Figma): flex row, gap-x-3, default Label
      assert.ok(group.includes('className="flex items-center gap-x-3"'))
      assert.ok(group.indexOf("<RadioGroupItem") < group.indexOf("<Label"))
      assert.ok(group.includes(`htmlFor={\`${prefix}\${index}\`}`))
      assert.ok(group.includes(`id={\`${prefix}\${index}\`}`))
      assert.ok(group.includes("{label}"))
      assert.ok(group.includes('className="mt-6"'))
      assert.ok(!group.includes("space-y")) // the group's own gap-y-2.5 is the only spacing
      assert.ok(!/<Label[^>]*className/.test(group)) // default Label: 12px/18px, medium
    })

    it(`${where}: the group is named, pointer on the radio, and no raw controls`, () => {
      assert.ok(group.includes("aria-label="))
      assert.ok(
        group.includes('className="cursor-pointer disabled:cursor-not-allowed"')
      )
      assert.ok(!/<(button|input|label)\b/.test(group))
    })

    it(`${where}: no card, border, shadow, background, padding box or hover treatment`, () => {
      assert.ok(
        !/\b(border|shadow|bg-|ring|rounded|hover:|has-\[|px-|py-|pl-|pr-|h-14)/.test(
          group.replace(/text-dark-blue-400/g, "")
        ),
        where
      )
      assert.ok(!/Passport|Chevron/.test(group))
    })
  }

  it("the four options, in order", () => {
    assert.deepEqual(
      [...CHECK_IN_DURATION_LABELS],
      ["A few days", "1–2 weeks", "More than 2 weeks", "Not sure"]
    )
  })
})

describe("later-check-in copy and the Skip button", () => {
  it("second/third time copy", () => {
    const later = durationCopyFor(1)
    assert.equal(later.title, "How much longer will you be traveling?")
    assert.equal(
      later.body,
      "We’ve asked before, answering helps reduce these reminders."
    )
    assert.equal(
      later.alert,
      "You won’t be asked again for a while based on your selection."
    )
    assert.equal(durationCopyFor(2), later)
  })

  it("a full-width Skip, and no Confirm button, on the duration screen", () => {
    const screen = between(page, 'checkIn?.phase === "duration"', "</DialogContent>")
    assert.ok(screen.includes('<div className="mt-6 grid">'))
    assert.ok(screen.includes("{CHECK_IN_COPY.skip}"))
    assert.equal(CHECK_IN_COPY.skip, "Skip")
    assert.equal((screen.match(/<Button\b/g) ?? []).length, 1)
    assert.ok(!/Confirm/.test(screen))
    assert.ok(!/Confirm/.test(stories))
  })
})

describe("one selection submits once, and nothing is clickable while saving", () => {
  it("the only submit path is the group's onValueChange; no onClick on the options", () => {
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
    assert.ok(handler.includes("if (!checkIn || checkInSavingRef.current) return"))
    assert.ok(handler.indexOf("checkInSavingRef.current = true") > 0)
  })

  it("native radio-group keyboard behaviour is untouched", () => {
    assert.ok(!pageGroup.includes("onKeyDown"))
    assert.ok(!pageGroup.includes("tabIndex"))
  })
})
