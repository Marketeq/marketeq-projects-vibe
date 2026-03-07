import type { APIRequestContext } from "@playwright/test"
import { expect, test } from "@playwright/test"
import path from "path"

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001"
const USER_URL = process.env.NEXT_PUBLIC_USER_URL ?? "http://localhost:3003"
const DASHBOARD_HOLD_MS = Number(process.env.DASHBOARD_HOLD_MS ?? "0")

function isPlaceholderAvatar(src: string | null) {
  if (!src) return true
  return /placeholder|default-avatar|avatar-default|anon|blank/i.test(src)
}

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

test("signup with username/password via API, complete onboarding, verify avatar", async ({
  page,
  request,
  context,
}) => {
  test.setTimeout(180000)
  await assertServiceReachable(request, AUTH_URL, "Auth service")
  await assertServiceReachable(request, USER_URL, "User service")

  const ts = Date.now()
  const email = `signin_${ts}@test.com`
  const username = `signin_${ts}`
  const password = "Test@12345"

  const registerResponse = await request.post(`${AUTH_URL}/auth/register`, {
    data: { email, username, password },
  })
  if (!registerResponse.ok()) {
    const body = await registerResponse.text().catch(() => "")
    throw new Error(`Register failed: ${registerResponse.status()} ${body}`)
  }

  const loginResponse = await request.post(`${AUTH_URL}/auth/login`, {
    data: { email, password },
  })
  if (!loginResponse.ok()) {
    const body = await loginResponse.text().catch(() => "")
    throw new Error(`Login failed: ${loginResponse.status()} ${body}`)
  }

  const loginData = await loginResponse.json()
  const accessToken = loginData.access_token ?? loginData.accessToken
  if (!accessToken) {
    throw new Error("Auth login response is missing access token")
  }

  await context.addCookies([
    {
      name: "access_token",
      value: accessToken,
      domain: "localhost",
      path: "/",
    },
  ])

  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" })
  await page.evaluate((token) => {
    localStorage.setItem("token", token)
  }, accessToken)

  const apiLogs: string[] = []
  const userHostPrefix = `${USER_URL}/`
  const isAvatarProfileApi = (url: string) =>
    url.startsWith(userHostPrefix) &&
    /avatar|upload|profile|user\/me|onboarding-dismissed|\/talent/i.test(url)
  const responseLogger = async (res: any) => {
    const url = res.url()
    if (!isAvatarProfileApi(url)) return
    const method = res.request()?.method?.() ?? "GET"
    let body = ""
    try {
      body = await res.text()
    } catch {
      body = "<no-body>"
    }
    apiLogs.push(`RES ${res.status()} ${method} ${url} :: ${body.slice(0, 300)}`)
  }
  const requestLogger = (req: any) => {
    const url = req.url()
    if (!isAvatarProfileApi(url)) return
    apiLogs.push(`REQ ${req.method()} ${url}`)
  }
  page.on("response", responseLogger)
  page.on("request", requestLogger)

  const clickContinue = async () => {
    const button = page.getByRole("button", { name: /^continue$/i }).last()
    await expect(button).toBeEnabled({ timeout: 15000 })
    await page.keyboard.press("Escape").catch(() => {})
    await button.click({ force: true })
  }

  await page.goto(`${BASE_URL}/onboarding`, { waitUntil: "domcontentloaded" })

  await expect(
    page.getByRole("heading", { name: /what brings you here today/i })
  ).toBeVisible({ timeout: 60000 })
  await page.getByText(/looking for work/i).click()
  await page.waitForURL(/\/onboarding\/talent/)

  await expect(page.getByText("Introduce yourself!")).toBeVisible()

  const avatarPath = path.resolve(__dirname, "../../fixtures/avatar.jpg")
  const uploadButton = page.getByRole("button", { name: /upload picture/i })
  await expect(uploadButton).toBeVisible()
  await uploadButton.click({ force: true })
  await page.waitForSelector('input[type="file"]', { timeout: 10000 })
  await page.setInputFiles('input[type="file"]', avatarPath)

  const saveImageBtn = page.getByRole("button", { name: /^save$/i })
  if (await saveImageBtn.isVisible().catch(() => false)) {
    await saveImageBtn.click()
  }

  await expect(page.locator("img[alt='Avatar']")).toBeVisible()

  await page.fill("#first-name", "Reka")
  await page.fill("#last-name", "N")
  await page.getByRole("button", { name: /^continue$/i }).last().click()

  await expect(page.getByText(/create your username/i)).toBeVisible()
  await page.fill("input#username", `reka_${ts}`)

  const continueAtUsername = page
    .getByRole("button", { name: /^continue$/i })
    .last()
  await page.waitForTimeout(1200)

  if (await continueAtUsername.isEnabled().catch(() => false)) {
    await continueAtUsername.click({ force: true })
  } else {
    const skipAtUsername = page.getByRole("button", { name: /^skip$/i }).last()
    await expect(skipAtUsername).toBeVisible({ timeout: 10000 })
    await skipAtUsername.click({ force: true })
  }

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

  // Step 5 must submit to persist profile fields (including avatar) via /talent.
  await clickContinue()

  await expect(page.getByText(/what would you like to do next/i)).toBeVisible({
    timeout: 15000,
  })

  const dashboardBtn = page.getByRole("button", { name: /go to dashboard/i })
  await expect(dashboardBtn).toBeVisible({ timeout: 15000 })
  await dashboardBtn.click({ force: true, noWaitAfter: true })

  await expect
    .poll(() => page.url(), { timeout: 30000 })
    .toMatch(/talent-dashboard|sign-in|onboarding\/talent/)

  if (!page.url().includes("/talent-dashboard")) {
    await page.goto(`${BASE_URL}/talent-dashboard`, {
      waitUntil: "domcontentloaded",
    })
  }

  await expect(page).toHaveURL(/\/talent-dashboard/, { timeout: 30000 })

  const emailButton = page.getByRole("button", { name: new RegExp(email, "i") })
  const logo = page.locator("a[href='/marketplace']").first()
  const topNavFallback = logo
    .locator("xpath=ancestor::*[self::div or self::header][1]")
    .locator("button")
    .last()

  let avatarButton = topNavFallback
  if (await emailButton.first().isVisible().catch(() => false)) {
    avatarButton = emailButton.first()
  }

  await expect(avatarButton, "Top-right avatar button is not visible").toBeVisible({
    timeout: 15000,
  })

  const avatarImg = avatarButton.locator("img").first()
  const avatarFallback = avatarButton
    .locator("span.rounded-full, span[class*='rounded-full']")
    .first()

  const hasAvatarImg = (await avatarImg.count()) > 0
  const hasAvatarFallback = (await avatarFallback.count()) > 0

  expect(
    hasAvatarImg || hasAvatarFallback,
    "Top-right avatar area is not visible"
  ).toBeTruthy()

  if (hasAvatarImg) {
    const dashboardAvatarSrc = await avatarImg.getAttribute("src")
    console.log("Dashboard avatar src:", dashboardAvatarSrc)
    expect(
      isPlaceholderAvatar(dashboardAvatarSrc),
      `Dashboard avatar is placeholder. src=${dashboardAvatarSrc}`
    ).toBeFalsy()

    await expect
      .poll(
        async () =>
          await avatarImg.evaluate((img: HTMLImageElement) => {
            return img.complete && img.naturalWidth > 0
          }),
        {
          message: "Avatar image failed to load (naturalWidth remains 0)",
          timeout: 10000,
        }
      )
      .toBeTruthy()
  }

  if (DASHBOARD_HOLD_MS > 0) {
    await page.waitForTimeout(DASHBOARD_HOLD_MS)
  }

  console.log("Avatar/Profile API logs:", apiLogs)
  page.off("response", responseLogger)
  page.off("request", requestLogger)
})
