import type { APIRequestContext } from "@playwright/test"
import { expect, test } from "@playwright/test"
import path from "path"

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

test("talent onboarding completes through step 5", async ({
  page,
  request,
}) => {
  test.setTimeout(180000)
  await assertServiceReachable(request, AUTH_URL, "Auth service")
  await assertServiceReachable(request, USER_URL, "User service")

  const email = `reka_${Date.now()}@test.com`
  const username = `reka_${Date.now()}`

  const clickContinue = async () => {
    const button = page.getByRole("button", { name: /^continue$/i }).last()
    await expect(button).toBeEnabled({ timeout: 15000 })
    await page.keyboard.press("Escape").catch(() => {})
    await button.click({ force: true })
  }

  await page.context().clearCookies()
  await page.goto(`${BASE_URL}/sign-up`, { waitUntil: "domcontentloaded" })
  await expect(page.locator("#email")).toBeVisible({ timeout: 60000 })
  await page.fill("#email", email)

  const terms = page.locator("#agrees-to-terms-privacy-policy")
  if (await terms.isVisible().catch(() => false)) {
    await terms.click()
  }

  const createAccountButton = page.getByRole("button", {
    name: /create my account/i,
  })

  await createAccountButton.click()

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
  await page.getByText(/looking for work/i).click()
  await page.waitForURL(/\/onboarding\/talent/)

  await expect(page.getByText("Introduce yourself!")).toBeVisible()

  const avatarPath = path.resolve(__dirname, "../../fixtures/avatar.jpg")
  const uploadButton = page.getByRole("button", { name: /upload picture/i })
  await expect(uploadButton).toBeVisible()
  await uploadButton.click()
  await page.waitForSelector('input[type="file"]', { timeout: 10000 })
  await page.setInputFiles('input[type="file"]', avatarPath)

  const saveImageBtn = page.getByRole("button", { name: /^save$/i })
  if (await saveImageBtn.isVisible().catch(() => false)) {
    await saveImageBtn.click()
  }

  await page.fill("#first-name", "Reka")
  await page.fill("#last-name", "N")
  await clickContinue()

  await expect(page.getByText(/create your username/i)).toBeVisible()
  await page.fill("input#username", username)
  await clickContinue()

  await expect(page.getByText(/share your location/i)).toBeVisible()
  await page.fill('input[placeholder="Enter your city or town"]', "New York")
  await page.fill('input[placeholder="Enter your languages"]', "English")
  await clickContinue()

  await expect(page.getByText(/showcase your talent/i)).toBeVisible()
  await page.fill("#recent-job-title", "QA Engineer")
  await page.fill("#industries", "Software")
  await page
    .getByPlaceholder("Enter job titles related to your project")
    .fill("React")
  await page
    .getByPlaceholder("Enter job titles related to your project")
    .press("Enter")
  await clickContinue()

  await expect(page.getByText(/set your preferences/i)).toBeVisible()
  await page
    .getByPlaceholder("Enter your project preferences (e.g., Data Analysis)")
    .fill("Web Development")
  await page
    .getByPlaceholder("Enter your project preferences (e.g., Data Analysis)")
    .press("Enter")

  await page.locator("#availability").click()
  await page.getByRole("option", { name: /part-time/i }).click()

  const skipBtn = page.getByRole("button", { name: /^skip$/i }).last()
  if (await skipBtn.isVisible().catch(() => false)) {
    await skipBtn.click({ force: true })
  } else {
    await clickContinue()
  }

  await expect(page.getByText(/what would you like to do next/i)).toBeVisible({
    timeout: 15000,
  })
})
