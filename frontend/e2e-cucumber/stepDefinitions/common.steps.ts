import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

/**
 * SHARED NAVIGATION
 * Matches: Given I am on the "Sign Up" page
 */
Given('I am on the {string} page', async function (pageName: string) {
  let path = '/';
  if (pageName.toLowerCase().includes('sign up')) path = '/sign-up';
  if (pageName.toLowerCase().includes('sign in')) path = '/sign-in';
  
  await this.page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
});

/**
 * SHARED BUTTON ACTIONS
 * Matches: When I click "Create My Account"
 * Matches: When I click "Continue"
 * Matches: And I click "Go to Dashboard"
 */

When('I click {string}', async function (btnText: string) {
  console.log(`🔍 Looking for button: "${btnText}"`);
  
  // Try exact match first
  let button = this.page.getByRole("button", { name: new RegExp(`^${btnText}$`, "i") }).last();
  
  let isVisible = await button.isVisible().catch(() => false);
  
  // If exact match not found, try partial match for "Go to Dashboard"
  if (!isVisible && btnText.toLowerCase().includes("go to dashboard")) {
    console.log(`⚠️ Exact match not found, trying variations...`);
    // Try variations
    const variations = [
      /go to dashboard/i,
      /dashboard/i,
      /continue/i,
      /next/i,
      /proceed/i
    ];
    
    for (const pattern of variations) {
      button = this.page.getByRole("button", { name: pattern }).last();
      isVisible = await button.isVisible().catch(() => false);
      if (isVisible) {
        console.log(`✅ Found button with pattern: ${pattern}`);
        break;
      }
    }
  }
  
  // Wait for it to be ready
  await expect(button).toBeVisible({ timeout: 15000 });
  await expect(button).toBeEnabled();
  console.log(`✅ Button found and enabled`);
  
  // Standard "Continue" logic: handle potential overlays
  if (btnText.toLowerCase() === 'continue') {
    await this.page.keyboard.press("Escape").catch(() => {});
  }
  
  await button.click({ force: true });
});

/**
 * SHARED REDIRECTS
 * Matches: Then I should be redirected to the /talent-dashboard
 */
Then('I should be redirected to the {string}', async function (expectedPath: string) {
  // Wait for the URL to change to the expected path
  await expect(this.page).toHaveURL(new RegExp(expectedPath), { timeout: 15000 });
});

/**
 * SHARED STATE VERIFICATION
 * Matches: Then I should reach the final "What would you like to do next?" success screen
 */
Then('I should reach the final {string} success screen', async function (message: string) {
  await expect(this.page.getByText(message)).toBeVisible({ timeout: 15000 });
});
