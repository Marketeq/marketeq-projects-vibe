import { expect, test } from "@playwright/test"
import {
  AUTH_URL,
  assertServiceReachable,
  createEmailPasswordUser,
} from "../helpers"

test("forgot password resets credentials and invalidates the old password", async ({
  request,
}) => {
  test.setTimeout(120000)
  await assertServiceReachable(request, AUTH_URL, "Auth service")

  const { email, password: oldPassword } =
    await createEmailPasswordUser(request)
  const newPassword = "Reset@12345"

  const loginBeforeReset = await request.post(`${AUTH_URL}/auth/login`, {
    data: { email, password: oldPassword },
    timeout: 20000,
  })
  expect(loginBeforeReset.ok()).toBeTruthy()
  const loginBeforeResetBody = await loginBeforeReset.json()
  expect(loginBeforeResetBody.refresh_token).toBeTruthy()

  const forgotResponse = await request.post(
    `${AUTH_URL}/auth/forgot-password`,
    {
      data: {
        email,
        redirectUrl: "https://evil.example/reset-password",
      },
      timeout: 20000,
    }
  )

  expect(forgotResponse.ok()).toBeTruthy()

  const forgotBody = await forgotResponse.json()
  expect(forgotBody.message).toContain("If an account exists")

  const resetToken = forgotBody.reset_token
  expect(resetToken).toBeTruthy()
  expect(forgotBody.reset_url ?? "").not.toContain("evil.example")

  const resetResponse = await request.post(`${AUTH_URL}/auth/reset-password`, {
    data: { token: resetToken, password: newPassword },
    timeout: 20000,
  })
  expect(resetResponse.ok()).toBeTruthy()

  const staleRefreshResponse = await request.post(`${AUTH_URL}/auth/refresh`, {
    data: { refresh_token: loginBeforeResetBody.refresh_token },
    timeout: 20000,
  })
  expect(staleRefreshResponse.status()).toBe(401)

  const oldLoginResponse = await request.post(`${AUTH_URL}/auth/login`, {
    data: { email, password: oldPassword },
    timeout: 20000,
  })
  expect(oldLoginResponse.status()).toBe(401)

  const newLoginResponse = await request.post(`${AUTH_URL}/auth/login`, {
    data: { email, password: newPassword },
    timeout: 20000,
  })
  expect(newLoginResponse.ok()).toBeTruthy()
})
