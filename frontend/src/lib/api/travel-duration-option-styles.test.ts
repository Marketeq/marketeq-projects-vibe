// Run like travel-check-in-options.test.ts (from the frontend/ directory).
// Every Travel Mode duration screen takes its option look from lib/travel-duration-option-styles.ts:
// hover on every option, a bolder label on the selected one, nothing else changed.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import postcss from "postcss"
import tailwindcss from "tailwindcss"
import {
  TRAVEL_DURATION_OPTION_LABEL_CLASS as LABEL,
  TRAVEL_DURATION_OPTION_RADIO_CLASS as RADIO,
  TRAVEL_DURATION_OPTION_ROW_CLASS as ROW,
} from "../../../lib/travel-duration-option-styles"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const flow = read("components", "identity-verification-flow.tsx")
const page = read("app", "(group)", "talent-dashboard", "page.tsx")
const between = (source: string, from: string, to: string) => {
  const start = source.indexOf(from)
  assert.ok(start >= 0, `missing: ${from}`)
  return source.slice(start, source.indexOf(to, start))
}

// Every place the app renders the four duration options.
const screens = [
  [
    "activation / Travel Mode Update (flow)",
    between(flow, "<RadioGroup", "</RadioGroup>"),
  ],
  [
    "check-in / reminder (dashboard)",
    between(
      page,
      "aria-label={durationCopyFor(checkIn.answerCount).title}",
      "</RadioGroup>"
    ),
  ],
  [
    "reselect after confirmation (dashboard)",
    between(
      page,
      "aria-label={durationCopyFor(checkInConfirmation.answerCount).title}",
      "</RadioGroup>"
    ),
  ],
] as const

const tokens = (classes: string) => classes.split(/\s+/)

describe("every duration screen uses the shared option styles", () => {
  for (const [name, group] of screens) {
    it(`${name}: row, radio and label come from the shared constants, with no inline copies`, () => {
      const items = (group.match(/<RadioGroupItem\b/g) ?? []).length
      assert.ok(items === 1 || items === 4, `${items} options`)
      for (const c of ["ROW", "RADIO", "LABEL"]) {
        const uses = (
          group.match(
            new RegExp(`className=\\{TRAVEL_DURATION_OPTION_${c}_CLASS\\}`, "g")
          ) ?? []
        ).length
        assert.equal(uses, items, c)
      }
      assert.ok(
        !/group-hover:|font-(medium|semibold|bold)|active:scale/.test(group)
      )
    })
  }

  it("the app files that render options import the constants", () => {
    for (const source of [flow, page]) {
      assert.ok(source.includes('from "@/lib/travel-duration-option-styles"'))
    }
  })

  it("the activation screen offers the four options with their existing ids and label links", () => {
    const group = screens[0][1]
    for (const id of [
      "travel-duration-a-few-days",
      "travel-duration-1-2-weeks",
      "travel-duration-more-than-2-weeks",
      "travel-duration-not-sure",
    ]) {
      assert.ok(group.includes(`id="${id}"`), id)
      assert.match(group, new RegExp(`<Label\\s+htmlFor="${id}"`))
    }
  })
})

describe("hover, selected and unselected label styles", () => {
  const t = tokens(LABEL)

  it("every option row is a hover group and its label reacts on hover", () => {
    assert.ok(tokens(ROW).includes("group"))
    assert.ok(t.includes("group-hover:font-semibold"))
    assert.ok(t.includes("group-hover:text-gray-900"))
  })

  it("the selected option's label is semibold", () => {
    assert.ok(t.includes("group-has-[[data-state=checked]]:font-semibold"))
  })

  it("unselected options carry no unconditional selected weight (only the Label default, medium)", () => {
    const unconditional = t.filter((c) => /^font-(semibold|bold)$/.test(c))
    assert.deepEqual(unconditional, [])
    // The weight a disabled, unselected option falls back to on hover is medium, never semibold.
    assert.ok(
      t.includes(
        "group-has-[:disabled]:group-has-[[data-state=unchecked]]:group-hover:font-medium"
      )
    )
    // ...and a disabled selected option is never reset to medium.
    assert.ok(!t.includes("group-has-[:disabled]:group-hover:font-medium"))
  })

  it("keyboard focus is not suppressed and the radio keeps its pointer styles", () => {
    assert.ok(!/outline-none|focus:outline|tabindex/i.test(ROW + RADIO + LABEL))
    assert.equal(RADIO, "cursor-pointer disabled:cursor-not-allowed")
  })

  it("Tailwind generates the checked-weight and unchecked-reset rules", async () => {
    const result = await postcss([
      tailwindcss({
        content: [{ raw: `<div class="${ROW} ${RADIO} ${LABEL}"></div>` }],
        corePlugins: { preflight: false },
      }),
    ]).process("@tailwind utilities;", { from: undefined })
    const css = result.css
    assert.match(css, /data-state=checked[^{]*\{[^}]*font-weight:\s*600/)
    assert.match(
      css,
      /data-state=unchecked[^{]*:hover[^{]*\{[^}]*font-weight:\s*500/
    )
    assert.match(
      css,
      /\.group:hover \.group-hover\\:font-semibold|group-hover\\:font-semibold/
    )
  })
})

describe("selection behaviour is untouched", () => {
  it("dashboard options select only through the group's onValueChange (click and arrow keys are Radix's)", () => {
    for (const [name, group] of screens.slice(1)) {
      assert.equal((group.match(/onValueChange=/g) ?? []).length, 1, name)
      assert.ok(!/onClick|onKeyDown|onKeyUp|tabIndex/.test(group), name)
    }
    assert.ok(screens[1][1].includes("void handleCheckInAnswer(label)"))
    assert.ok(screens[2][1].includes("void handleCheckInRevise(label)"))
  })

  it("the activation screen still stores the chosen duration and clears a failed save", () => {
    const group = screens[0][1]
    assert.ok(group.includes("value={travelDuration ?? undefined}"))
    assert.ok(group.includes("setTravelDuration(value as TravelDuration)"))
    assert.ok(group.includes("setTravelModeSaveFailed(false)"))
    assert.ok(!/onClick|onKeyDown|tabIndex/.test(group))
  })
})
