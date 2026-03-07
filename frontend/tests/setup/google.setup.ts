import { chromium } from "@playwright/test"
import path from "path"

const userDataDir = path.resolve("playwright-user-data")

async function run() {
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: "chrome",
    args: ["--disable-blink-features=AutomationControlled"],
  })

  const page = await context.newPage()

  await page.goto("http://localhost:3000/sign-in")
  console.log("👉 Please login manually (Google)...")
  console.log(
    "👉 After successful login, the browser will automatically save the authenticated state to tests/.auth/google.json"
  )
  // 👇 You login manually here

  /*  skip manual login entirely:
    await context.addCookies([...]);
    or
    localStorage.setItem("token", "JWT");
  */

  // ✅ Wait until you reach dashboard AFTER manual login
  await page.waitForURL(/dashboard/, { timeout: 180000 })
  // ✅ Save session state to file for use in tests
  await context.storageState({ path: "tests/.auth/google.json" })

  console.log("Saved login state!")

  await context.close()
}

run()

// RUN ONLY ONCE
// To create the login state file, then all tests will use that file to start with a logged-in state. If you need to update the login state (e.g. token expired), just run this setup script again to refresh the .json file.
// npx ts-node tests/setup/google.setup.ts
// AFTER running, you can delete the "playwright-user-data" folder that was created, as it's not needed for the tests. The important output is the "tests/.auth/google.json" file which contains the authenticated state for your tests.
// In playwright config.ts make sure to set globalSetup to this file, so it runs before tests and ensures the .json file is created if missing. Then all tests that use that storageState will start with the authenticated state.
// globalSetup: './tests/setup/google.setup.ts', to the projects or test.use in config.ts to use the saved login state in tests.
