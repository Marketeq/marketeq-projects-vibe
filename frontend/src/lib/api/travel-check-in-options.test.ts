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
      // the first-time TravelingForm story's row (flex, gap-x-3, default Label) plus feedback only
      assert.ok(/className="group flex w-fit origin-left items-center gap-x-3 /.test(group))
      assert.ok(group.indexOf("<RadioGroupItem") < group.indexOf("<Label"))
      assert.ok(group.includes(`htmlFor={\`${prefix}\${index}\`}`))
      assert.ok(group.includes(`id={\`${prefix}\${index}\`}`))
      assert.ok(group.includes("{label}"))
      assert.ok(group.includes('className="mt-6"'))
      assert.ok(!group.includes("space-y")) // the group's own gap-y-2.5 is the only spacing
      // the Label keeps its default 12px/18px medium type; only colour/weight on hover are added
      assert.ok(!/text-(xs|sm|base)|leading-|font-(bold|normal|light)/.test(group))
    })

    it(`${where}: the group is named, pointer on the radio, and no raw controls`, () => {
      assert.ok(group.includes("aria-label="))
      assert.ok(
        group.includes('className="cursor-pointer disabled:cursor-not-allowed"')
      )
      assert.ok(!/<(button|input|label)\b/.test(group))
    })

    it(`${where}: no card, border, shadow, background, padding box or Passport hover`, () => {
      assert.ok(
        !/\b(border|shadow|bg-|ring|rounded|px-|py-|pl-|pr-|h-14|has-\[\[data-state|hover:(bg|border|ring))/.test(
          group
        ),
        where
      )
      assert.ok(!/Passport|Chevron/.test(group))
    })

    it(`${where}: hover darkens and bolds only the text; press is a tiny scale; reduced motion respected`, () => {
      for (const c of [
        "group-hover:font-semibold",
        "group-hover:text-gray-900",
        "active:scale-[0.99]",
        "origin-left",
        "transition-transform",
        "duration-150",
        "motion-reduce:transition-none",
        "motion-reduce:active:scale-100",
      ]) {
        assert.ok(group.includes(c), c)
      }
      // text hover is on the Label, the press scale on the row; neither changes size or spacing
      assert.ok(!/\b(m[trblxy]?-|p[trblxy]?-|gap-y|space-y|w-\[|h-\[|scale-(1[1-9]|[2-9])\d)/.test(
        group.replace("mt-6", "").replace("gap-x-3", "")
      ))
    })

    it(`${where}: a disabled option shows no hover or press feedback`, () => {
      for (const c of [
        "has-[:disabled]:active:scale-100",
        "group-has-[:disabled]:group-hover:font-medium",
        "group-has-[:disabled]:group-hover:text-gray-800",
        "group-has-[:disabled]:cursor-not-allowed",
      ]) {
        assert.ok(group.includes(c), c)
      }
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
    assert.ok(!/>\s*Confirm\s*</.test(stories))
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
