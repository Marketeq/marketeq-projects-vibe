import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Common Page Object Model for shared functionality across all pages
 * Handles navigation, button clicks, redirects, and common verifications
 */
export class CommonPage {
  readonly page: Page;
  readonly BASE_URL: string;

  constructor(page: Page, baseUrl?: string) {
    this.page = page;
    this.BASE_URL = baseUrl ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  }

  // ========== NAVIGATION METHODS ==========

  /**
   * Navigate to a specific page by name
   * @param pageName - Name of the page (e.g., "Sign Up", "Sign In")
   */
  async navigateToPage(pageName: string) {
    let path = '/';
    
    const pageNameLower = pageName.toLowerCase();
    if (pageNameLower.includes('sign up')) path = '/sign-up';
    if (pageNameLower.includes('sign in')) path = '/sign-in';
    
    await this.page.goto(`${this.BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
    console.log(`✅ Navigated to: ${this.BASE_URL}${path}`);
  }

  // ========== BUTTON ACTION METHODS ==========

  /**
   * Click a button by text with smart fallback patterns
   * @param buttonText - Text of the button to click
   */
  async clickButton(buttonText: string) {
    console.log(`🔍 Looking for button: "${buttonText}"`);

    // Try exact match first
    let button = this.page.getByRole("button", { name: new RegExp(`^${buttonText}$`, "i") }).last();
    let isVisible = await button.isVisible().catch(() => false);

    // If exact match not found, try partial match for specific buttons
    if (!isVisible && buttonText.toLowerCase().includes("go to dashboard")) {
      console.log(`⚠️ Exact match not found, trying variations...`);
      
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

    // Wait for button to be ready
    await expect(button).toBeVisible({ timeout: 15000 });
    await expect(button).toBeEnabled();
    console.log(`✅ Button found and enabled: "${buttonText}"`);

    // Handle potential overlays for "Continue" button
    if (buttonText.toLowerCase() === 'continue') {
      await this.page.keyboard.press("Escape").catch(() => {});
    }

    await button.click({ force: true });
    console.log(`✅ Clicked button: "${buttonText}"`);
  }

  // ========== REDIRECT VERIFICATION METHODS ==========

  /**
   * Verify that the page has been redirected to the expected path
   * @param expectedPath - Expected URL path or pattern
   */
  async verifyRedirect(expectedPath: string) {
    await expect(this.page).toHaveURL(new RegExp(expectedPath), { timeout: 15000 });
    console.log(`✅ Verified redirect to: ${expectedPath}`);
  }

  // ========== STATE VERIFICATION METHODS ==========

  /**
   * Verify that a success screen with a specific message is displayed
   * @param message - Message text to verify
   */
  async verifySuccessScreen(message: string) {
    const messageElement = this.page.getByText(message);
    await expect(messageElement).toBeVisible({ timeout: 15000 });
    console.log(`✅ Verified success screen with message: "${message}"`);
  }

  /**
   * Verify that a specific text is visible on the page
   * @param text - Text to verify
   */
  async verifyTextVisible(text: string) {
    const textElement = this.page.getByText(text, { exact: false });
    await expect(textElement).toBeVisible({ timeout: 15000 });
    console.log(`✅ Verified text visible: "${text}"`);
  }

  /**
   * Verify that a heading with specific text is visible
   * @param headingText - Heading text to verify
   */
  async verifyHeading(headingText: string) {
    const heading = this.page.getByRole('heading', { name: new RegExp(headingText, 'i') });
    await expect(heading).toBeVisible({ timeout: 15000 });
    console.log(`✅ Verified heading: "${headingText}"`);
  }

  // ========== UTILITY METHODS ==========

  /**
   * Wait for page to load completely
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  /**
   * Get current page URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Wait for a specific amount of time
   * @param milliseconds - Time to wait in milliseconds
   */
  async wait(milliseconds: number) {
    await this.page.waitForTimeout(milliseconds);
  }

  /**
   * Press a keyboard key
   * @param key - Key to press (e.g., "Escape", "Enter")
   */
  async pressKey(key: string) {
    await this.page.keyboard.press(key);
  }

  /**
   * Clear browser cookies
   */
  async clearCookies() {
    await this.page.context().clearCookies();
    console.log(`✅ Cleared browser cookies`);
  }
}

export default CommonPage;
