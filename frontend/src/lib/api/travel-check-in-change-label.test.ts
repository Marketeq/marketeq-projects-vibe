// BTB-400: the returning-user "Still traveling?" check-in says "Change my home country".
// Run: see location-mismatch.test.ts (tsc to a tmp dir, then `node --test` from frontend/).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { CHECK_IN_COPY } from "./travel-check-in"
import {
  CHECK_IN_PROMPT_ACTIONS_CLASS,
  CHECK_IN_PROMPT_UPDATE_BUTTON_CLASS,
} from "../../../lib/travel-check-in-prompt-layout"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const page = read("app", "(group)", "talent-dashboard", "page.tsx")
const story = read("stories", "identity-verification-check-in.stories.tsx")
const promptStart = page.indexOf('checkIn?.phase === "prompt" && (')
const prompt = page.slice(
  promptStart,
  page.indexOf('checkIn?.phase === "duration"', promptStart)
)

describe("BTB-400: check-in prompt label", () => {
  it("the returning-user check-in says Change my home country", () => {
    assert.equal(CHECK_IN_COPY.prompt.updateHomeCountry, "Change my home country")
    assert.ok(prompt.includes("{CHECK_IN_COPY.prompt.updateHomeCountry}"))
    assert.ok(story.includes("{CHECK_IN_COPY.prompt.updateHomeCountry}"))
  })

  it("I’m still traveling and the heading are unchanged", () => {
    assert.equal(CHECK_IN_COPY.prompt.stillTraveling, "I’m still traveling")
    assert.equal(CHECK_IN_COPY.prompt.title, "Still traveling?")
  })

  it("the old 'Update my home country' label is gone from every production source", () => {
    const sources = [
      read("src", "lib", "api", "travel-check-in.ts"),
      read("lib", "travel-check-in-prompt-layout.ts"),
      story,
    ]
    for (const s of sources) assert.ok(!s.includes("Update my home country"))
    assert.ok(!/>\s*Update my home country\s*</.test(page))
    // The page's own handler comment is a code anchor other tests pin; it is not UI copy.
  })

  it("other screens keep their own copy", () => {
    // Location-mismatch dialog (already Change) and the Travel Mode card actions stay as they were.
    assert.ok(page.includes("Change my home country\n"))
    assert.ok(!CHECK_IN_COPY.prompt.title.includes("Change"))
  })

  it("handler, loading state, order and width reservation are untouched", () => {
    assert.ok(
      /disabled=\{checkInStarting\}\s+loading=\{checkInStarting\}\s+aria-busy=\{checkInStarting\}\s+onClick=\{\(\) => void handleCheckInUpdateHomeCountry\(\)\}/.test(
        prompt
      )
    )
    assert.ok(prompt.includes("onClick={handleCheckInStillTraveling}"))
    assert.ok(
      prompt.indexOf("CHECK_IN_COPY.prompt.stillTraveling") <
        prompt.indexOf("CHECK_IN_COPY.prompt.updateHomeCountry")
    )
    assert.equal(CHECK_IN_PROMPT_UPDATE_BUTTON_CLASS, "min-w-[231px]")
    assert.equal(
      CHECK_IN_PROMPT_ACTIONS_CLASS,
      "mt-[50px] flex flex-col items-center gap-3 md:flex-row md:justify-center"
    )
  })
})
