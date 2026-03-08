## **✅ Document: Frontend Testing -- General Setup with Playwright**

### **📌 Purpose**

This document provides a **universal setup guide** for implementing
**frontend end-to-end (E2E) testing** using
[[Playwright]{.underline}](https://playwright.dev/). It is **agnostic of
any frontend feature or framework**, though examples are based on
React/Next.js for reference.

Use this as your base testing framework for **UI validation**, **flow
coverage**, **interaction testing**, and **regression protection** in
any web application.

### **📁 Recommended Directory Structure**

Organize tests inside a tests/ folder at the root of the frontend repo:

project-root/

tests/

auth/

login.spec.ts

signup.spec.ts

navigation/

menu.spec.ts

mobile-nav.spec.ts

ui/

buttons.spec.ts

modal.spec.ts

utils/

testSetup.ts

users.ts

playwright.config.ts



### **🧱 Step 1 -- Install Playwright**

****npm install \--save-dev \@playwright/test

npx playwright install

> This will install the Playwright CLI and necessary browser binaries
> (Chromium, Firefox, WebKit).

### **⚙️ Step 2 -- Configure Playwright**

Create a root-level config file:

// playwright.config.ts

import { defineConfig } from \'@playwright/test\';

export default defineConfig({

testDir: \'./tests\',

timeout: 30000,

retries: 0,

use: {

baseURL: \'http://localhost:3000\',

headless: true,

viewport: { width: 1280, height: 720 },

ignoreHTTPSErrors: true,

screenshot: \'only-on-failure\',

video: \'retain-on-failure\',

},

});

Add this to your package.json:

\"scripts\": {

\"test:ui\": \"playwright test\",

\"test:ui:debug\": \"playwright test \--debug\",

\"test:ui:headed\": \"playwright test \--headed\"

}



### **🧪 Step 3 -- Writing Your First Test**

Example: Test homepage renders and button click works.

// tests/ui/homepage.spec.ts

import { test, expect } from \'@playwright/test\';

test(\'homepage loads and CTA button works\', async ({ page }) =\> {

await page.goto(\'/\');

await expect(page.getByRole(\'heading\', { name: \'Welcome\'
})).toBeVisible();

await page.click(\'button:text(\"Get Started\")\');

await expect(page).toHaveURL(\'/signup\');

});



### **🧰 Step 4 -- Utility Functions (Optional)**

Centralize user actions or data for reuse:

// tests/utils/users.ts

export const testUser = {

username: \'test@example.com\',

password: \'password123\',

};



// tests/utils/testSetup.ts

export async function loginUser(page) {

await page.goto(\'/login\');

await page.fill(\'#email\', \'test@example.com\');

await page.fill(\'#password\', \'password123\');

await page.click(\'button\[type=submit\]\');

}



### **🧪 Step 5 -- Common UI Tests to Start With**

  ---------------------------------------------------------
  **Test Area**    **Example Description**
  ---------------- ----------------------------------------
  Auth             Login, signup, logout flows

  Navigation       Menu links, footer links, mobile nav,
                   back buttons

  Components       Buttons, modals, inputs, dropdowns,
                   loading spinners

  Pages            Home, dashboard, 404, settings

  Interactions     Clicks, form submissions, keyboard
                   navigation

  Responsiveness   Test layout in desktop vs mobile
                   viewport sizes
  ---------------------------------------------------------

Use test.describe() to group related cases.

### **🤖 Step 6 -- CI Integration (GitHub Actions)**

****\# .github/workflows/playwright.yml

name: Playwright Tests

on: \[push, pull_request\]

jobs:

test:

runs-on: ubuntu-latest

steps:

\- uses: actions/checkout@v4

\- uses: actions/setup-node@v4

with:

node-version: \'20\'

\- run: npm ci

\- run: npx playwright install \--with-deps

\- run: npm run test:ui



### **🧼 Optional -- Test Reports**

Enable HTML reporting in playwright.config.ts:

reporter: \[\[\'html\', { open: \'never\' }\]\]

Then view with:

npx playwright show-report



### **🧠 Pro Tips**

- Use .only and .skip for focused testing.

- Add test tags with \@auth, \@ui, etc., using annotations for
  filtering.

- Use page.pause() during test:ui:debug runs for inspection.

### **✅ You're Ready**

This setup gives you:

- ✅ A universal frontend test framework

- ✅ Support for all screen sizes and flows

- ✅ CI-ready configuration

- ✅ Reusable across any React-based (or non-React) projects
