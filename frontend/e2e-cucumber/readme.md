#  Cucumber BDD Testing Framework

##  Overview
This directory contains end-to-end Cucumber/BDD tests using Playwright for browser automation. Tests are written in Gherkin syntax to bridge the gap between business requirements and technical implementation.

##  Installation & Setup

### Install Playwright
```bash
npm add -D @playwright/test
npm exec playwright install
```

### Install Cucumber
```bash
npm install --save-dev @cucumber/cucumber @playwright/test
```

### Install TypeScript Support
```bash
npm install --save-dev ts-node
```

### Clean Build Cache (if needed)
```bash
rm -rf .next
npm run dev
```

## Project Structure
```text
marketeq-projects-frontend/
|-- cucumber.js                  # Cucumber profiles/configuration
`-- e2e-cucumber/
    |-- features/                # Gherkin feature files
    |-- stepDefinitions/         # Cucumber step definitions
    |-- hooks/                   # Before/After hooks
    |-- common/                  # Shared steps/helpers
    |-- pages/                   # Page Object Model classes
    |-- fixtures/                # Test assets
    `-- readme.md
```
## Gherkin Syntax
Feature files use Gherkin keywords:

- Feature: High-level description of the functionality
- Background: Steps that run before each scenario
- Scenario: Individual test case
- Given: Initial context/preconditions
- When: Action/event that triggers behavior
- Then: Expected outcome/assertion
- And: Additional steps (same level as previous keyword)

Example:

```gherkin
@publishproject
Feature: Publish Project
  As a user, I want to publish a new project

  Background:
    Given the Auth and User Services are reachable

  Scenario: Complete publish project workflow
    Given I am on the "Sign Up" page
    When I enter a unique email and accept terms
    And I click "Create My Account" button
    Then I should see the "Project Info" heading
```

## Running Tests

### Using npm Scripts (Recommended)
Package.json:

- `"test:datadrivenSignin": "cucumber-js --profile datadrivenSignin"`

```bash
npm run test:datadrivenSignin
```

### Using Cucumber CLI Directly

```bash
# Run specific active profile
npx cucumber-js --profile talentOnboarding
npx cucumber-js --profile googleSignupSignin
npx cucumber-js --profile datadrivenSignin
npx cucumber-js --profile publishProject

# Dry run (validate without executing)
npx cucumber-js --profile datadrivenSignin --dry-run
```

### Advanced Run Options

```bash
# Run all selected profiles from cucumber.js
npx cucumber-js --profile all

# Run in headed mode (PowerShell)
$env:HEADLESS='false'; npx cucumber-js --profile datadrivenSignin
```

### Running by Tags
Add tags to your feature file:

```gherkin
@signup
Scenario: Successfully completing the 5-step talent onboarding
  Given I am on the signup page
  ...
```

Then run:

```bash
npx cucumber-js --tags @signup
```
## Available Test Profiles
Test profiles are configured in cucumber.js.

### talentOnboarding
**Command:** `npx cucumber-js --profile talentOnboarding`
**Report:** `reports/signup-email-setpassword.html`

### googleSignupSignin
**Command:** `npx cucumber-js --profile googleSignupSignin`
**Report:** `reports/google-signup.html`

### datadrivenSignin
**Command:** `npm run test:datadrivenSignin`
**Report:** `reports/signin-datadriven-test.html`

### publishProject
**Command:** `npx cucumber-js --profile publishProject`
**Report:** `reports/publish-project.html`

### all
**Command:** `npx cucumber-js --profile all`
**Report:** `reports/selected-features.html`
Test profiles are configured in cucumber.js and defined in package.json scripts.

### Publish Project Test
**Command:** `npm run test:publishproject`

Tests the complete project publishing workflow:

- User signup with email verification
- Multi-step form (Project Info ? Media ? Project Scope)
- Form validation and field requirements
- Phase and task creation
- Project submission

Headed mode (visible browser):

```bash
$env:HEADLESS='false'; npm run test:publishproject
```

Report: `reports/publish-project.html`

### Google Signup Test
**Command:** `npm run test:googlesignup`

Tests Google OAuth signup flow with password setup.

Report: `reports/google-signup.html`

### Signup Test
**Command:** `npm run test:signup`

Report: `reports/signup-work.html`

### Login Test
**Command:** `npm run test:login`

Report: `reports/login.html`

### Dashboard/Avatar Onboarding Test
**Command:** `npm run test:dashboard`

Report: `reports/talent-onboarding-avatar.html`

### Set Password Test
**Command:** `npm run test:setpassword`

Report: `reports/setpassword.html`

### Email Signup with Password
**Command:** `npm run test:emailsignup`

Report: `reports/signup-email-setpassword.html`

### All Tests
**Command:** `npm run test:all`

Runs all configured test features.

Report: `reports/all-features.html`

##  Cucumber Configuration
Test profiles are defined in cucumber.js at project root. Each profile specifies:

- requireModule: TypeScript loader (`ts-node/register`)
- require: Step definitions and hooks to load
- paths: Feature files to execute
- format: Report output formats (progress, HTML, JSON)

Example profile:

```javascript
publishProject: {
  requireModule: ["ts-node/register"],
  require: [
    "e2e-cucumber/common/common.steps.ts",
    "e2e-cucumber/stepDefinitions/publish-project.steps.ts",
    "e2e-cucumber/hooks/hooks.ts"
  ],
  paths: ["e2e-cucumber/features/07-publish-project.feature"],
  format: [
    "progress",
    "html:reports/publish-project.html",
    "json:reports/publish-project.json",
  ]
}
```

##  Test Reports
After test execution, reports are generated in the reports/ directory:

- HTML Reports: Interactive visual reports (`reports/publish-project.html`)
- JSON Reports: Machine-readable format for CI/CD integration
- Screenshots: Captured at each step and on failure (`reports/screenshots/`)

##  Playwright Integration
Tests use Playwright for browser automation:

- Browser: Chromium (headless by default)
- Anti-detection: Custom user agent and args to avoid bot detection
- Page Actions: Click, fill, select, upload, navigation
- Assertions: Visibility checks, text content verification

##  Writing New Tests
### 1. Create Feature File
```gherkin
Feature: New Feature Name
  Description of what this feature does

  Background:
    Given preconditions that apply to all scenarios

  Scenario: Specific test case
    Given initial state
    When user performs action
    Then expected result occurs
```

### 2. Implement Step Definitions
```typescript
import { Given, When, Then } from '@cucumber/cucumber';

Given('initial state', async function (this: any) {
  await this.page.goto('/path');
});

When('user performs action', async function (this: any) {
  await this.page.click('button');
});

Then('expected result occurs', async function (this: any) {
  await expect(this.page.locator('selector')).toBeVisible();
});
```

### 3. Add Profile to cucumber.js
```javascript
newtest: {
  requireModule: ["ts-node/register"],
  require: ["e2e-cucumber/stepDefinitions/**/*.steps.ts"],
  paths: ["e2e-cucumber/features/new-test.feature"],
  format: ["progress", "html:reports/new-test.html"]
}
```

### 4. Add npm Script to package.json
```json
"scripts": {
  "test:newtest": "cucumber-js --profile newtest"
}
```

##  Best Practices
### Feature Files
- Keep scenarios focused and independent
- Use descriptive scenario names
- Follow Given-When-Then structure
- Avoid technical implementation details in Gherkin

### Step Definitions
- Reuse common steps across features
- Use common.steps.ts for shared functionality
- Add proper waits and timeouts
- Use descriptive selectors (role, text > XPath)

### Test Data
- Store fixtures in fixtures/ directory
- Use unique identifiers (timestamps) for test data
- Avoid hardcoding sensitive data

### Debugging
- Run in headed mode: `$env:HEADLESS='false'`
- Add screenshots at key points
- Use console.log() for debugging output
- Check generated HTML reports

##  Troubleshooting
Tests failing to find elements:

- Increase timeout values
- Verify selectors in browser DevTools
- Check if page has fully loaded
- Use page.waitForLoadState('domcontentloaded')

Browser not closing:

- Ensure After hook in hooks.ts is executing
- Check for uncaught errors in tests

Module not found errors:

- Verify paths in cucumber.js match folder structure
- Check tsconfig.json includes test files
- Run npm install to ensure dependencies

##  CI/CD Integration
JSON reports can be consumed by CI/CD pipelines:

```bash
# Generate JSON report only
cucumber-js --profile publishproject --format json:reports/results.json

# Parse results in CI
cat reports/results.json | jq '.[] | select(.elements[].steps[].result.status == "failed")'
```

##  Environment Configuration
Required environment variables in .env file:

```env
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_AUTH_URL=http://localhost:3001
NEXT_PUBLIC_USER_URL=http://localhost:3003
```

Optional test-specific variables:

```bash
# Run tests in visible browser mode
HEADLESS=false

# Google OAuth testing
GOOGLE_TEST_EMAIL=your-test-email@gmail.com
GOOGLE_TEST_PASSWORD=your-password
```

##  Resources
- Cucumber Documentation
- Playwright Documentation
- Gherkin Reference
- BDD Best Practices


