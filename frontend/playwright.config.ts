import { defineConfig } from "@playwright/test"

const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
const reportName = process.env.REPORT_NAME || `run-${timestamp}`

export default defineConfig({
  testDir: "./tests",

  // Auto-run setup if missing:
  // ✅ Setup project run login script before tests
  //globalSetup: './tests/setup/google.setup.ts',
  //globalSetup: './tests/setup/linkedin.setup.ts',
  use: {
    headless: false,
    baseURL: "http://localhost:3000",
    video: "on",
    trace: "on-first-retry",
    screenshot: "on",
    // ✅ MUST HAVE viewport for video
    viewport: { width: 1500, height: 800 },
    launchOptions: {
      slowMo: 800, //300,
      //args: ['--start-maximized'],
    },
    //storageState: "tests/.auth/google.json",  //👉 All tests start are already logged in
    //storageState: "tests/.auth/linkedin.json",  //👉 All tests start are already logged in
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    timeout: 120000,
    reuseExistingServer: true,
  },

  preserveOutput: "always", // 🔥 keep videos even if test passes
  reporter: [
    [
      "html",
      {
        outputFolder: `reports/${reportName}`,
        open: "never",
        outputFile: "TestExecutionReport.html",
      },
    ],
    //['allure-playwright'],
    ["list"],
  ],
  outputDir: `test-results/${reportName}`,
  projects: [
    {
      name: "chrome",
      use: { channel: "chrome" },
    },
    /*  // 🔵 Google Login
      {
        name: "google",
        use: {
          channel: "chrome",
          storageState: "tests/.auth/google.json",
        },
      },

      // 🔷 LinkedIn Login
      {
        name: "linkedin",
        use: {
          channel: "chrome",
          storageState: "tests/.auth/linkedin.json",
        },
      }, 
      */
  ],
})
