import type { APIRequestContext } from "@playwright/test"
import { expect, test } from "@playwright/test"

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001"
const USER_URL = process.env.NEXT_PUBLIC_USER_URL ?? "http://localhost:3003"

async function assertServiceReachable(
  request: APIRequestContext,
  url: string,
  name: string
) {
  try {
    await request.get(url, { failOnStatusCode: false, timeout: 10000 })
  } catch {
    throw new Error(
      `${name} is unreachable at ${url}. Start the service before running signup tests.`
    )
  }
}

test("client onboarding reaches final step from signup", async ({
  page,
  request,
}) => {
  test.setTimeout(180000)
  await assertServiceReachable(request, AUTH_URL, "Auth service")
  await assertServiceReachable(request, USER_URL, "User service")

  const email = `reka_hire_${Date.now()}@test.com`
  const username = `hire_${Date.now()}`

  const clickSkip = async () => {
    const skipBtn = page.getByRole("button", { name: /^skip$/i }).last()
    await expect(skipBtn).toBeVisible({ timeout: 15000 })
    await expect(skipBtn).toBeEnabled({ timeout: 15000 })
    await skipBtn.click({ force: true })
  }

  const clickContinue = async () => {
    const continueBtn = page.getByRole("button", { name: /^continue$/i }).last()
    await expect(continueBtn).toBeVisible({ timeout: 15000 })
    await expect(continueBtn).toBeEnabled({ timeout: 15000 })
    await page.keyboard.press("Escape").catch(() => {})
    await continueBtn.click({ force: true })
  }

  const expectStep = async (step: number) => {
    await expect(page.getByText(`STEP ${step} / 5`)).toBeVisible({
      timeout: 15000,
    })
  }

  await page.context().clearCookies()
  await page.goto(`${BASE_URL}/sign-up`, { waitUntil: "domcontentloaded" })
  await expect(page.locator("#email")).toBeVisible({ timeout: 60000 })
  await page.fill("#email", email)

  const terms = page.locator("#agrees-to-terms-privacy-policy")
  if (await terms.isVisible().catch(() => false)) {
    await terms.click()
  }

  await page.getByRole("button", { name: /create my account/i }).click()
  const destination = await Promise.race([
    page
      .waitForURL(/\/onboarding/, { timeout: 60000 })
      .then(() => "onboarding"),
    page.waitForURL(/\/sign-in/, { timeout: 60000 }).then(() => "sign-in"),
  ])
  if (destination === "sign-in") {
    throw new Error(
      "Signup redirected to /sign-in. Ensure auth service (NEXT_PUBLIC_AUTH_URL) and user service (NEXT_PUBLIC_USER_URL) are both running and reachable."
    )
  }

  await expect(
    page.getByRole("heading", { name: /what brings you here today/i })
  ).toBeVisible()

  await page.getByText(/i want to hire/i).click()
  await page.waitForURL(/\/onboarding\/client/)

  await expectStep(1)
  await page.fill("#your-team-name", "Marketeq QA Team")
  await page.fill("#your-role", "QA Engineer")
  await page.getByText(/select a industry/i).click()
  await page.getByRole("option", { name: "Technology" }).click()
  await clickSkip()

  await expectStep(2)
  await page.getByText("Growth & Expansion").click()
  await clickSkip()

  await expectStep(3)
  await clickSkip()

  await expectStep(4)
  await page.fill("input#username", username)
  await clickSkip()

  await expectStep(5)
  await clickSkip()

  await expect(page.getByText(/what would you like to do next/i)).toBeVisible()
})
