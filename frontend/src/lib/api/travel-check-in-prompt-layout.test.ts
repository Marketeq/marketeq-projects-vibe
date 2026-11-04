// Regression tests for the layout of the "Still traveling?" check-in prompt buttons.
// Bug: the button row was `w-[calc(100%+2rem)]` (389px) in a 357px content box, so
// "Update my home country" ran past the dialog's right edge (and the 405px dialog was
// wider than a 375px screen).
//
// Part 1 reads the source. Part 2 measures in Chrome: it opens the real Storybook story
// "Identity Verification Check-In / CheckIn" (real Dialog, real Button), applies the exact
// production class strings from lib/travel-check-in-prompt-layout.ts to it, and measures.
// Part 2 needs Storybook (STORYBOOK_URL, default http://localhost:6011) and Chrome, and is
// skipped, loudly, if either is missing.
//
// Run: npx tsc src/lib/api/travel-check-in-prompt-layout.test.ts --outDir <tmp> --module commonjs
//   --target es2020 --skipLibCheck --esModuleInterop --types node --lib es2020,dom
//   && (cd frontend && node --test <tmp>/src/lib/api/travel-check-in-prompt-layout.test.js)
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"
import { after, before, describe, it } from "node:test"
import {
  CHECK_IN_PROMPT_ACTIONS_CLASS,
  CHECK_IN_PROMPT_DIALOG_CLASS,
  CHECK_IN_PROMPT_UPDATE_BUTTON_CLASS,
} from "../../../lib/travel-check-in-prompt-layout"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")

describe("check-in prompt layout classes (source)", () => {
  it("the page takes its prompt layout from the shared strings", () => {
    const page = read("app", "(group)", "talent-dashboard", "page.tsx")
    assert.match(
      page,
      /<DialogContent className=\{CHECK_IN_PROMPT_DIALOG_CLASS\}>/
    )
    assert.match(page, /<div className=\{CHECK_IN_PROMPT_ACTIONS_CLASS\}>/)
    assert.match(page, /className=\{CHECK_IN_PROMPT_UPDATE_BUTTON_CLASS\}/)
  })

  it("the row is not wider than its container and does not wrap", () => {
    assert.doesNotMatch(CHECK_IN_PROMPT_ACTIONS_CLASS, /calc\(100%\+/)
    assert.doesNotMatch(CHECK_IN_PROMPT_ACTIONS_CLASS, /flex-wrap/)
    assert.doesNotMatch(CHECK_IN_PROMPT_ACTIONS_CLASS, /\bmx-auto\b/)
  })

  it("is a stacked column below 768px and a centered 12px row from md up", () => {
    const c = CHECK_IN_PROMPT_ACTIONS_CLASS.split(/\s+/)
    for (const t of [
      "flex",
      "flex-col",
      "items-center",
      "gap-3",
      "md:flex-row",
      "md:justify-center",
    ])
      assert.ok(c.includes(t), `missing ${t}`)
  })

  it("the dialog keeps 405px but never exceeds the screen less a 16px gutter", () => {
    const c = CHECK_IN_PROMPT_DIALOG_CLASS.split(/\s+/)
    assert.ok(c.includes("w-[405px]"))
    assert.ok(c.includes("max-w-[calc(100vw-2rem)]"))
  })

  it("the loading width stays pinned by min-w-[231px]", () => {
    assert.equal(CHECK_IN_PROMPT_UPDATE_BUTTON_CLASS, "min-w-[231px]")
  })

  it("does not touch the mismatch or duration dialogs", () => {
    const page = read("app", "(group)", "talent-dashboard", "page.tsx")
    assert.ok(page.includes('className="w-[456px]"'))
    assert.ok(page.includes("grid-cols-[repeat(auto-fit,minmax(190px,1fr))]"))
    assert.ok(page.includes('<DialogContent className="max-w-[650px]">'))
  })
})

const STORYBOOK = process.env.STORYBOOK_URL ?? "http://localhost:6011"
const STORY = `${STORYBOOK}/iframe.html?id=identity-verification-check-in--check-in&viewMode=story`
const STILL = "I’m still traveling"
const UPDATE = "Change my home country"

interface Box {
  left: number
  right: number
  top: number
  bottom: number
  width: number
}
interface Measure {
  dlg: Box
  still: Box
  update: Box
  scrollOverflow: number
  dialogScrollOverflow: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Page = any
interface Prod {
  dialog: string
  actions: string
  update: string
}

async function measure(
  page: Page,
  prod: Prod,
  loading: boolean
): Promise<Measure> {
  await page.getByRole("button", { name: "Trigger" }).click()
  await page.waitForSelector("[role=dialog] button")
  await page.evaluate(
    ({ prod, loading }: { prod: Prod; loading: boolean }) => {
      const d = document.querySelector("[role=dialog]") as HTMLElement
      // twMerge in DialogContent lets a max-w-* in className replace the base max-w-[480px].
      d.classList.remove("max-w-[480px]")
      d.classList.add(...prod.dialog.split(/\s+/))
      const [still, update] = Array.from(
        d.querySelectorAll("button")
      ) as HTMLButtonElement[]
      const row = still.parentElement as HTMLElement
      row.className = prod.actions
      update.classList.add(...prod.update.split(/\s+/))
      if (loading) {
        // Exactly the spinner Button renders while `loading` (components/ui/button/button.tsx).
        const ns = "http://www.w3.org/2000/svg"
        const svg = document.createElementNS(ns, "svg")
        svg.setAttribute("class", "animate-spin h-4 w-4")
        svg.setAttribute("viewBox", "0 0 24 24")
        update.insertBefore(svg, update.firstChild)
        update.disabled = true
      }
    },
    { prod, loading }
  )
  // Measure only once the dialog's open animation (zoom/slide) has finished: mid-animation the
  // dialog is scaled and offset, which makes the numbers differ under load.
  await page.waitForTimeout(100)
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        // The loading spinner repeats forever and never finishes.
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => null))
    )
  )
  return page.evaluate(() => {
    const box = (e: Element): Box => {
      const r = e.getBoundingClientRect()
      return {
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        width: r.width,
      }
    }
    const d = document.querySelector("[role=dialog]") as HTMLElement
    const [still, update] = Array.from(d.querySelectorAll("button"))
    return {
      dlg: box(d),
      still: box(still),
      update: box(update),
      scrollOverflow: document.documentElement.scrollWidth - window.innerWidth,
      dialogScrollOverflow: d.scrollWidth - d.clientWidth,
    }
  })
}

const near = (a: number, b: number, tol: number, msg: string) =>
  assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (±${tol})`)

describe("check-in prompt layout (Chrome, Storybook)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any
  let reason = ""
  const prod = {
    dialog: CHECK_IN_PROMPT_DIALOG_CLASS,
    actions: CHECK_IN_PROMPT_ACTIONS_CLASS,
    update: CHECK_IN_PROMPT_UPDATE_BUTTON_CLASS,
  }

  before(async () => {
    try {
      const res = await fetch(STORY, { signal: AbortSignal.timeout(4000) })
      if (!res.ok) throw new Error(`Storybook answered ${res.status}`)
      const req = createRequire(join(process.cwd(), "package.json"))
      const { chromium } = req("playwright")
      browser = await chromium.launch({ channel: "chrome" })
    } catch (e) {
      reason = `SKIPPED, needs Storybook at ${STORYBOOK} and Chrome: ${(e as Error).message}`
      console.warn(reason)
    }
  })
  after(async () => {
    await browser?.close()
  })

  const run = async (width: number, loading: boolean) => {
    const page = await browser.newPage({ viewport: { width, height: 800 } })
    try {
      await page.goto(STORY)
      return { m: await measure(page, prod, loading), page }
    } finally {
      await page.close()
    }
  }

  for (const width of [375, 768, 1280, 1440]) {
    for (const loading of [false, true]) {
      it(`${width}px ${loading ? "loading" : "idle"}: dialog and both buttons stay inside, evenly spaced`, async (t) => {
        if (!browser) return t.skip(reason)
        const { m } = await run(width, loading)
        // The dialog fits the screen, with at least the 16px gutter at 375px.
        assert.ok(m.dlg.left >= 16 - 0.5, `dialog left ${m.dlg.left}`)
        assert.ok(
          m.dlg.right <= width - 16 + 0.5,
          `dialog right ${m.dlg.right}`
        )
        near(m.dlg.left + m.dlg.right, width, 1, "dialog centered on screen")
        assert.ok(
          m.scrollOverflow <= 0,
          `page scrolls horizontally by ${m.scrollOverflow}`
        )
        assert.ok(
          m.dialogScrollOverflow <= 0,
          `dialog content overflows by ${m.dialogScrollOverflow}`
        )
        for (const [name, b] of [
          ["still", m.still],
          ["update", m.update],
        ] as const) {
          assert.ok(
            b.left - m.dlg.left >= 8,
            `${name} is ${b.left - m.dlg.left}px from the dialog's left edge`
          )
          assert.ok(
            m.dlg.right - b.right >= 8,
            `${name} is ${m.dlg.right - b.right}px from the dialog's right edge`
          )
        }
        const mid = (m.dlg.left + m.dlg.right) / 2
        if (width >= 768) {
          near(
            (m.still.left + m.update.right) / 2,
            mid,
            1,
            "the button group is centered"
          )
          // One row, button order kept, 12px apart, equal space on both outer sides.
          near(m.still.top, m.update.top, 1, "same row")
          assert.ok(
            m.still.right < m.update.left,
            "order: still traveling, then update"
          )
          near(m.update.left - m.still.right, 12, 0.5, "gap")
          near(
            m.still.left - m.dlg.left,
            m.dlg.right - m.update.right,
            1,
            "equal outer spacing"
          )
        } else {
          // Stacked and centered.
          assert.ok(
            m.update.top >= m.still.bottom,
            "update is below still traveling"
          )
          near(m.update.top - m.still.bottom, 12, 0.5, "vertical gap")
          near(
            (m.still.left + m.still.right) / 2,
            mid,
            1,
            "first button centered"
          )
          near(
            (m.update.left + m.update.right) / 2,
            mid,
            1,
            "second button centered"
          )
        }
      })
    }

    it(`${width}px: idle and loading widths and positions are identical`, async (t) => {
      if (!browser) return t.skip(reason)
      const idle = (await run(width, false)).m
      const busy = (await run(width, true)).m
      near(idle.still.width, busy.still.width, 0.5, "still traveling width")
      near(idle.update.width, busy.update.width, 0.5, "update width")
      near(idle.still.left, busy.still.left, 0.5, "still traveling x")
      near(idle.update.left, busy.update.left, 0.5, "update x")
      near(idle.update.top, busy.update.top, 0.5, "update y")
    })
  }

  it("keyboard order is still traveling, then update my home country", async (t) => {
    if (!browser) return t.skip(reason)
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    })
    try {
      await page.goto(STORY)
      await measure(page, prod, false)
      await page.keyboard.press("Tab")
      assert.equal(
        await page.evaluate(() => document.activeElement?.textContent?.trim()),
        STILL
      )
      await page.keyboard.press("Tab")
      assert.equal(
        await page.evaluate(() => document.activeElement?.textContent?.trim()),
        UPDATE
      )
    } finally {
      await page.close()
    }
  })
})
