import { expect, test } from "@playwright/test"

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"

test("dashboard loads", async ({ page, context }) => {
  test.setTimeout(120000)

  console.log("Starting dashboard test")
  console.log("Navigating to:", `${BASE_URL}/talent-dashboard`)

  await page.goto(`${BASE_URL}/talent-dashboard`, {
    waitUntil: "domcontentloaded",
  })

  await expect(page).toHaveURL(/\/talent-dashboard|\/onboarding/, {
    timeout: 20000,
  })

  console.log("Current URL:", page.url())

  const cookies = await context.cookies()
  const hasAccessTokenCookie = cookies.some((c) => c.name === "access_token")
  console.log("Has access_token cookie:", hasAccessTokenCookie)

  const localStorageData = await page.evaluate(() => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("access_token")
    return { hasToken: Boolean(token) }
  })

  console.log("Has localStorage token:", localStorageData.hasToken)

  await expect(page).not.toHaveURL(/sign-in/)

  console.log("Dashboard/onboarding reachable with authenticated state.")
})
