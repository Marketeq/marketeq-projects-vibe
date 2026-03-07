import { expect, test } from "@playwright/test"

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001"

test("login using API (no UI)", async ({ page, request, context }) => {
  const ts = Date.now()
  const email = `signin_${ts}@test.com`
  const username = `signin_${ts}`
  const password = "Test@12345"

  console.log("🚀 Starting API login test")
  console.log("🆕 Test user:", { email, username })

  // =========================
  // REGISTER
  // =========================
  console.log("📡 Sending REGISTER request...")

  const registerResponse = await request.post(`${AUTH_URL}/auth/register`, {
    data: { email, username, password },
  })

  console.log("📥 Register status:", registerResponse.status())

  if (!registerResponse.ok()) {
    const body = await registerResponse.text().catch(() => "")
    console.error("❌ Register failed:", body)
    throw new Error(`Register failed: ${registerResponse.status()} ${body}`)
  }

  console.log("✅ Registration successful")

  // =========================
  // LOGIN
  // =========================
  console.log("📡 Sending LOGIN request...")

  const loginResponse = await request.post(`${AUTH_URL}/auth/login`, {
    data: { email, password },
  })

  console.log("📥 Login status:", loginResponse.status())

  if (!loginResponse.ok()) {
    const body = await loginResponse.text().catch(() => "")
    console.error("❌ Login failed:", body)
    throw new Error(`Login failed: ${loginResponse.status()} ${body}`)
  }

  const loginData = await loginResponse.json()
  console.log("🔑 Login response data:", loginData)

  const access_token = loginData.access_token ?? loginData.accessToken

  console.log("🔐 Extracted token:", access_token ? "Present ✅" : "Missing ❌")

  // =========================
  // SET COOKIE
  // =========================
  console.log("🍪 Setting cookie...")

  await context.addCookies([
    {
      name: "access_token",
      value: access_token,
      domain: "localhost",
      path: "/",
    },
  ])

  const cookies = await context.cookies()
  //console.log("🍪 Current cookies:", cookies);

  // =========================
  // OPEN APP
  // =========================
  console.log("🌐 Opening base URL...")
  await page.goto(BASE_URL)

  console.log("💾 Setting localStorage token...")

  await page.evaluate((token) => {
    localStorage.setItem("token", token)
  }, access_token)

  const localStorageData = await page.evaluate(() => {
    return { ...localStorage }
  })

  //console.log("💾 LocalStorage after set:", localStorageData);

  // =========================
  // NAVIGATE TO DASHBOARD
  // =========================
  console.log("➡️ Navigating to dashboard...")
  await page.goto("/talent-dashboard")

  await page.waitForLoadState("networkidle")

  console.log("📍 Current URL after navigation:", page.url())

  // =========================
  // VERIFY LOGIN
  // =========================
  if (page.url().includes("sign-in")) {
    console.error("❌ User NOT logged in, redirected to sign-in")
  } else {
    console.log("✅ User appears logged in")
  }

  await expect(page).not.toHaveURL(/sign-in/)

  console.log("🎉 Successfully logged in via API")
})
