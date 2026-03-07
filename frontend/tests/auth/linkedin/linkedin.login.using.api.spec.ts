import { expect, test } from "@playwright/test"

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001"

test("login using API (no UI)", async ({ page, request, context }) => {
  test.setTimeout(120000)

  const ts = Date.now()
  const email = `signin_${ts}@test.com`
  const username = `signin_${ts}`
  const password = "Test@12345"

  console.log("Starting API login test")
  console.log("Test user:", { email, username })

  console.log("Sending REGISTER request...")
  const registerResponse = await request.post(`${AUTH_URL}/auth/register`, {
    data: { email, username, password },
  })

  console.log("Register status:", registerResponse.status())

  if (!registerResponse.ok()) {
    const body = await registerResponse.text().catch(() => "")
    console.error("Register failed:", body)
    throw new Error(`Register failed: ${registerResponse.status()} ${body}`)
  }

  console.log("Registration successful")

  console.log("Sending LOGIN request...")
  const loginResponse = await request.post(`${AUTH_URL}/auth/login`, {
    data: { email, password },
  })

  console.log("Login status:", loginResponse.status())

  if (!loginResponse.ok()) {
    const body = await loginResponse.text().catch(() => "")
    console.error("Login failed:", body)
    throw new Error(`Login failed: ${loginResponse.status()} ${body}`)
  }

  const loginData = await loginResponse.json()
  console.log("Login response data:", loginData)

  const accessToken = loginData.access_token ?? loginData.accessToken
  console.log("Extracted token:", accessToken ? "Present" : "Missing")

  if (!accessToken) {
    throw new Error("Login response missing access token")
  }

  console.log("Setting cookie...")
  await context.addCookies([
    {
      name: "access_token",
      value: accessToken,
      domain: "localhost",
      path: "/",
    },
  ])

  console.log("Opening base URL...")
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" })

  console.log("Setting localStorage token...")
  await page.evaluate((token) => {
    localStorage.setItem("token", token)
    localStorage.setItem("access_token", token)
  }, accessToken)

  console.log("Navigating to dashboard...")
  await page.goto("/talent-dashboard", { waitUntil: "domcontentloaded" })

  await expect(page).toHaveURL(/\/talent-dashboard|\/onboarding/, {
    timeout: 20000,
  })

  console.log("Current URL after navigation:", page.url())

  if (page.url().includes("sign-in")) {
    console.error("User NOT logged in, redirected to sign-in")
  } else {
    console.log("User appears logged in")
  }

  await expect(page).not.toHaveURL(/sign-in/)

  console.log("Successfully logged in via API")
})
