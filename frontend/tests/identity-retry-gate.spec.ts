// Browser-level checks of the post-decline retry gate, on the real shared identity-verification
// host and the real AccountVerificationGate (nothing about the dialog or the host is mocked).
// Only the identity API answers that put the account into the state under test are replaced:
//   GET  /identity-verification/me                  -> the real answer, with nextAction retry_identity
//   POST /identity-verification/kyc-sessions/reconcile -> 200 (a result was reconciled)
//   POST /identity-verification/kyc-sessions        -> counted, answered 500 (no real session)
//   POST /identity-verification/home-country/confirm -> counted, answered 500
//
// Needs the local stack (frontend :3000, gateway :4000, auth) and an existing talent account.
// Run: IDV_QA_EMAIL=<local talent email> npx playwright test tests/identity-retry-gate.spec.ts --config <a headless config>
import { expect, test, type Page } from "@playwright/test"

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const API_URL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:4000/api"
// An existing LOCAL talent account (dev-login). No account is named here: set IDV_QA_EMAIL.
const EMAIL = process.env.IDV_QA_EMAIL
// A second existing local talent account (unverified is fine), for the account-switch test only.
const EMAIL_B = process.env.IDV_QA_EMAIL_B
const AWAITING_KEY = "marketeq:identity-verification:awaiting-result"
const ORIGIN_PAGE = "/my-jobs"

test.use({ headless: true })
test.skip(!EMAIL, "set IDV_QA_EMAIL to an existing local talent account")

interface Counters {
  kycSessions: number
  diditUrl: string | null
  confirms: number
  reconciles: number
  attemptsUsed: number
}

async function signIn(page: Page) {
  const res = await page.request.post(`${API_URL}/auth/dev-login`, {
    data: { email: EMAIL as string },
  })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  await page.context().addCookies(
    ["access_token", "refresh_token"]
      .filter((k) => body[k])
      .map((name) => ({
        name,
        value: body[name] as string,
        domain: "localhost",
        path: "/",
      }))
  )
}

// The identity API, in the "declined, attempts left" state.
async function mockDeclinedState(page: Page): Promise<Counters> {
  const counters: Counters = { kycSessions: 0, diditUrl: null, confirms: 0, reconciles: 0, attemptsUsed: 1 }
  await page.route("**/identity-verification/me", async (route) => {
    // The real answer supplies every field the page reads; only the verification state is set.
    // (A busy dev gateway can rate-limit a rapid reload with a 429: the state is still served.)
    // (if the dev gateway resets the connection, the state is still served)
    const json = await route
      .fetch()
      .then((real) => real.json())
      .catch(() => ({}))
    const body = json?.data ?? json
    Object.assign(body, {
      nextAction: "retry_identity",
      attemptsUsed: counters.attemptsUsed,
      attemptsRemaining: 3 - counters.attemptsUsed,
      maxAttempts: 3,
      canRetry: true,
      retryAvailableAt: null,
      fullyVerified: false,
      identityVerificationStatus: "rejected",
      locationVerificationStatus: "verified",
    })
    await route.fulfill({ status: 200, json })
  })
  await page.route("**/identity-verification/kyc-sessions/reconcile", async (route) => {
    counters.reconciles += 1
    await route.fulfill({ status: 200, json: {} })
  })
  await page.route("**/identity-verification/kyc-sessions", async (route) => {
    if (route.request().method() !== "POST") return route.continue()
    counters.kycSessions += 1
    // With diditUrl set the session "starts" and the real SDK opens its real modal on that URL.
    if (counters.diditUrl) return route.fulfill({ status: 200, json: { url: counters.diditUrl } })
    await route.fulfill({ status: 500, json: { message: "test: no real session" } })
  })
  await page.route("**/identity-verification/home-country/confirm", async (route) => {
    counters.confirms += 1
    await route.fulfill({ status: 500, json: { message: "test: no confirmation" } })
  })
  return counters
}

// A Didit trip just ended: the marker the return path looks for, then a load, which is what
// the redirect return and the in-page completion both end in (the host reconciles and reads /me).
async function endDiditTrip(page: Page, path = ORIGIN_PAGE) {
  await page.goto(`${BASE_URL}${path}`)
  await page.evaluate(
    ([key, at]) => window.localStorage.setItem(key, at),
    [AWAITING_KEY, String(Date.now())] as const
  )
  await page.reload()
}

const gate = (page: Page) =>
  page.getByRole("dialog").filter({ hasText: "Your profile is not public" })

test.describe("post-decline retry gate", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  // First in the file on purpose: it ends with the second account's REAL gate check, and the dev
  // gateway rate-limits a long burst of requests from one machine.
  test("the session becomes another account's while Didit is open: coming back to the tab closes it, nothing is sent, the other account can verify on its own", async ({ page }) => {
    test.skip(!EMAIL_B, "set IDV_QA_EMAIL_B to a second existing local talent account")
    test.setTimeout(240_000)
    const c = await mockDeclinedState(page)
    c.diditUrl = "https://verify.didit.me/session/qa-mock-session-token-0000"
    const navigations: string[] = []
    page.on("framenavigated", (f) => { if (f === page.mainFrame()) navigations.push(new URL(f.url()).pathname) })
    await endDiditTrip(page)
    await expect(gate(page)).toBeVisible({ timeout: 30_000 })
    await gate(page).getByRole("button", { name: "Verify My Account" }).click()
    await expect(page.locator(".didit-modal-overlay.active")).toBeVisible({ timeout: 30_000 })
    const sessionsBefore = c.kycSessions

    // the signed-in account is replaced in this browser: no sign-out, no reload, no navigation
    const res = await page.request.post(`${API_URL}/auth/dev-login`, { data: { email: EMAIL_B as string } })
    const body = await res.json()
    await page.context().clearCookies()
    await page.context().addCookies(
      ["access_token", "refresh_token"].filter((k) => body[k]).map((name) => ({ name, value: body[name] as string, domain: "localhost", path: "/" }))
    )
    await page.unroute("**/identity-verification/**") // from here on the identity API is the real one
    const requestsAfter: string[] = []
    page.on("request", (r) => {
      if (r.method() === "POST" && /identity-verification/.test(r.url())) requestsAfter.push(new URL(r.url()).pathname)
    })
    const before = navigations.length

    // coming back to the tab: focus and visibility together
    await page.evaluate(() => { window.dispatchEvent(new Event("focus")); document.dispatchEvent(new Event("visibilitychange")) })
    await expect(page.locator(".didit-modal-overlay.active")).toHaveCount(0, { timeout: 15_000 })
    await page.waitForTimeout(3000)
    expect(navigations.length).toBe(before) // no navigation
    expect(new URL(page.url()).pathname).toBe(ORIGIN_PAGE)
    await expect(gate(page)).toBeHidden()
    expect(await page.getByRole("dialog").count()).toBe(0)
    for (const key of [AWAITING_KEY, "marketeq:identity-verification:return-origin"]) {
      expect(await page.evaluate((k) => window.localStorage.getItem(k), key)).toBeNull()
    }
    expect(requestsAfter).toEqual([]) // no reconcile, confirmation or session for either account
    expect(c.kycSessions).toBe(sessionsBefore)

    // the other account starts its own verification afterwards
    await page.getByText("Apply Now").first().click()
    await page.getByRole("button", { name: "Start Verification" }).click()
    const yes = page.getByRole("button", { name: "Yes, this is my home country" })
    await Promise.race([
      yes.waitFor({ timeout: 40_000 }).then(() => yes.click()),
      page.locator(".didit-modal-overlay.active").waitFor({ timeout: 40_000 }),
    ]).catch(() => {})
    await expect(page.locator(".didit-modal-overlay.active")).toBeVisible({ timeout: 60_000 })
  })

  test("opens once over the originating page, with Cancel before Verify My Account", async ({ page }) => {
    const c = await mockDeclinedState(page)
    await endDiditTrip(page)
    await expect(gate(page)).toBeVisible({ timeout: 30_000 })
    const buttons = gate(page).getByRole("button")
    await expect(buttons).toHaveText(["Cancel", "Verify My Account"])
    expect(new URL(page.url()).pathname).toBe(ORIGIN_PAGE)
    expect(c.kycSessions + c.confirms).toBe(0) // nothing starts by itself
    expect(c.reconciles).toBe(1)
    await page.waitForTimeout(3000) // and it stays: nothing in the load sequence closes it
    await expect(gate(page)).toBeVisible()
  })

  for (const how of ["Cancel button", "Escape", "outside click"] as const) {
    test(`${how} closes it without starting anything, and it stays closed`, async ({ page }) => {
      const c = await mockDeclinedState(page)
      const navigations: string[] = []
      page.on("framenavigated", (f) => {
        if (f === page.mainFrame()) navigations.push(new URL(f.url()).pathname)
      })
      await endDiditTrip(page)
      await expect(gate(page)).toBeVisible({ timeout: 30_000 })
      const before = navigations.length

      if (how === "Cancel button") await gate(page).getByRole("button", { name: "Cancel" }).click()
      if (how === "Escape") await page.keyboard.press("Escape")
      // (Radix attaches its outside-click listener a tick after the dialog mounts)
      if (how === "outside click") {
        await page.waitForTimeout(400)
        await page.mouse.click(4, 4)
      }

      await expect(gate(page)).toBeHidden()
      // focus, visibility and route-free activity do not bring it back
      await page.evaluate(() => {
        window.dispatchEvent(new Event("focus"))
        document.dispatchEvent(new Event("visibilitychange"))
      })
      await page.waitForTimeout(1500)
      await expect(gate(page)).toBeHidden()
      expect(c.kycSessions).toBe(0)
      expect(c.confirms).toBe(0)
      expect(navigations.length).toBe(before) // no navigation
      expect(new URL(page.url()).pathname).toBe(ORIGIN_PAGE)
      await expect(page.locator("main, body")).toBeVisible() // the page is still mounted
    })
  }

  test("the same decline does not reopen after a reload; a new trip opens it again", async ({ page }) => {
    await mockDeclinedState(page)
    await endDiditTrip(page)
    await expect(gate(page)).toBeVisible({ timeout: 30_000 })
    await gate(page).getByRole("button", { name: "Cancel" }).click()
    await expect(gate(page)).toBeHidden()

    await page.reload() // marker cleared: nothing is waiting
    await page.waitForTimeout(2500)
    await expect(gate(page)).toBeHidden()

    await endDiditTrip(page) // a genuinely later result: a new marker
    await expect(gate(page)).toBeVisible({ timeout: 30_000 })
  })

  test("Verify My Account starts one request even on a double click", async ({ page }) => {
    const c = await mockDeclinedState(page)
    await endDiditTrip(page)
    await expect(gate(page)).toBeVisible({ timeout: 30_000 })
    await gate(page).getByRole("button", { name: "Verify My Account" }).dblclick()
    await expect.poll(() => c.kycSessions, { timeout: 20_000 }).toBeGreaterThanOrEqual(1)
    await page.waitForTimeout(2000)
    expect(c.kycSessions).toBe(1)
    expect(c.confirms).toBe(0) // the Didit-only path: no home-country confirmation
    expect(new URL(page.url()).pathname).toBe(ORIGIN_PAGE)
  })

  test("a route change closes it (the host resets with the page, as it does for a sign-out)", async ({ page }) => {
    await mockDeclinedState(page)
    await endDiditTrip(page)
    await expect(gate(page)).toBeVisible({ timeout: 30_000 })
    await page.evaluate(() =>
      (window as unknown as { next: { router: { push: (p: string) => void } } }).next.router.push("/my-listings")
    )
    await expect(page).toHaveURL(/my-listings/, { timeout: 30_000 }) // first visit compiles the route in dev
    await expect(gate(page)).toBeHidden()
  })

  test("a standard gate is unchanged: no Cancel, Escape and outside click do nothing", async ({ page }) => {
    await page.goto(`${BASE_URL}/my-listings`)
    await page.getByRole("button", { name: "New Listing" }).click()
    await page.getByText("Project", { exact: true }).first().click()
    const standard = page.getByRole("dialog").filter({ hasText: "Verify My Account" })
    await expect(standard).toBeVisible({ timeout: 30_000 })
    await expect(standard.getByRole("button", { name: "Cancel" })).toHaveCount(0)
    await page.keyboard.press("Escape")
    await page.mouse.click(4, 4)
    await expect(standard).toBeVisible()
  })

  // --- Didit opened from the retry gate -----------------------------------------------------
  const MOCK_DIDIT = "https://verify.didit.me/session/qa-mock-session-token-0000"
  const diditClose = (page: Page) => page.locator(".didit-close-button")
  const cancelDidit = async (page: Page) => {
    await diditClose(page).click({ timeout: 30_000 })
    await page.locator('[data-action="exit"]').click()
    await expect(page.locator(".didit-modal-overlay.active")).toHaveCount(0)
  }

  test("Verify opens Didit; cancelling Didit brings the same gate back once, starting nothing", async ({ page }) => {
    const c = await mockDeclinedState(page)
    c.diditUrl = MOCK_DIDIT
    await endDiditTrip(page)
    await expect(gate(page)).toBeVisible({ timeout: 30_000 })
    await gate(page).getByRole("button", { name: "Verify My Account" }).click()
    await expect(page.locator(".didit-modal-overlay.active")).toBeVisible({ timeout: 30_000 })
    await expect(gate(page)).toBeHidden() // Didit and the gate are never both on screen
    expect(c.kycSessions).toBe(1)

    await cancelDidit(page)
    await expect(gate(page)).toBeVisible({ timeout: 15_000 }) // back, once
    await expect(gate(page).getByRole("button")).toHaveText(["Cancel", "Verify My Account"])
    await page.waitForTimeout(2500)
    await expect(gate(page)).toHaveCount(1)
    expect(c.kycSessions).toBe(1) // reopening started nothing
    expect(c.confirms).toBe(0)
    expect(new URL(page.url()).pathname).toBe(ORIGIN_PAGE)

    // only Verify launches Didit again, exactly once
    await gate(page).getByRole("button", { name: "Verify My Account" }).dblclick()
    await expect(page.locator(".didit-modal-overlay.active")).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(1500)
    expect(c.kycSessions).toBe(2)
    await cancelDidit(page)
    await expect(gate(page)).toBeVisible({ timeout: 15_000 })

    // and Cancel on the reopened gate ends this decline for good
    await gate(page).getByRole("button", { name: "Cancel" }).click()
    await expect(gate(page)).toBeHidden()
    await page.reload()
    await page.waitForTimeout(2500)
    await expect(gate(page)).toBeHidden()
    expect(c.kycSessions).toBe(2)
  })

  for (const how of ["Escape", "outside click"] as const) {
    test(`the gate reopened after a Didit cancel closes on ${how} without any request, for good`, async ({ page }) => {
      const c = await mockDeclinedState(page)
      c.diditUrl = MOCK_DIDIT
      await endDiditTrip(page)
      await expect(gate(page)).toBeVisible({ timeout: 30_000 })
      await gate(page).getByRole("button", { name: "Verify My Account" }).click()
      await expect(page.locator(".didit-modal-overlay.active")).toBeVisible({ timeout: 30_000 })
      await cancelDidit(page)
      await expect(gate(page)).toBeVisible({ timeout: 15_000 })
      const before = c.kycSessions
      if (how === "Escape") await page.keyboard.press("Escape")
      else {
        await page.waitForTimeout(400)
        await page.mouse.click(4, 4)
      }
      await expect(gate(page)).toBeHidden()
      await page.evaluate(() => {
        window.dispatchEvent(new Event("focus"))
        document.dispatchEvent(new Event("visibilitychange"))
      })
      await page.waitForTimeout(1500)
      await expect(gate(page)).toBeHidden()
      expect(c.kycSessions).toBe(before)
      expect(c.confirms).toBe(0)
      await page.reload()
      await page.waitForTimeout(2500)
      await expect(gate(page)).toBeHidden()
    })
  }

  test("a route change while Didit is open closes it, never reopens the gate and clears the trip markers", async ({ page }) => {
    const c = await mockDeclinedState(page)
    c.diditUrl = MOCK_DIDIT
    await endDiditTrip(page)
    await expect(gate(page)).toBeVisible({ timeout: 30_000 })
    await gate(page).getByRole("button", { name: "Verify My Account" }).click()
    await expect(page.locator(".didit-modal-overlay.active")).toBeVisible({ timeout: 30_000 })
    await page.evaluate(() =>
      (window as unknown as { next: { router: { push: (p: string) => void } } }).next.router.push("/my-listings")
    )
    await expect(page).toHaveURL(/my-listings/, { timeout: 30_000 }) // first visit compiles the route in dev
    await expect(page.locator(".didit-modal-overlay.active")).toHaveCount(0)
    await page.waitForTimeout(2000)
    await expect(gate(page)).toBeHidden()
    const marker = await page.evaluate((k) => window.localStorage.getItem(k), AWAITING_KEY)
    expect(marker).toBeNull()
  })

  test("signing out while Didit is open closes it, never reopens the gate and leaves no marker for the next account", async ({ page }) => {
    const c = await mockDeclinedState(page)
    c.diditUrl = MOCK_DIDIT
    await endDiditTrip(page)
    await expect(gate(page)).toBeVisible({ timeout: 30_000 })
    await gate(page).getByRole("button", { name: "Verify My Account" }).click()
    await expect(page.locator(".didit-modal-overlay.active")).toBeVisible({ timeout: 30_000 })
    await page.evaluate(async () => {
      const trigger = Array.from(document.querySelectorAll("button")).find(
        (b) => b.getAttribute("aria-haspopup") === "menu" && (b as HTMLElement).className.includes("lg:inline-flex")
      ) as HTMLElement
      trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }))
      await new Promise((r) => setTimeout(r, 400))
      ;(Array.from(document.querySelectorAll('[role="menuitem"]')).find((e) => /log out/i.test(e.textContent || "")) as HTMLElement).click()
    })
    await expect(page).toHaveURL(/sign-in/, { timeout: 30_000 })
    await expect(page.locator(".didit-modal-overlay.active")).toHaveCount(0)
    await expect(gate(page)).toBeHidden()
    expect(await page.evaluate((k) => window.localStorage.getItem(k), AWAITING_KEY)).toBeNull()
  })
})
