# **Frontend Readiness Checklist (Pre-Launch Validation SOP)**

**Audience:** Frontend Leads / QA / Project Managers\
**Goal:** Confirm the frontend application is 100 % functional, stable,
and ready for production before deployment to the **live Vercel
project**.

## **1️⃣ Environment & Configuration**

**Explanation\**
Incorrect environment variables are one of the top causes of build
failures and broken API calls.\
Confirm the setup is consistent across local → testing → production.

**Checklist**

- .env.local and .env.production exist and match required keys.

  - NEXT_PUBLIC_API_BASE_URL

  - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (if payments)

  - NEXT_PUBLIC_SENTRY_DSN (if monitoring)

- Environment variables added in **Vercel → Settings → Environment
  Variables** for both testing and live.

- API Gateway and frontend use the same versioned base path (/v1).

- No hard-coded URLs in the codebase.

## **2️⃣ Authentication & Session Flow**

**Explanation\**
Auth issues usually surface right after launch. Validate all login and
token flows end-to-end.

**Checklist**

- Login and logout flows work on both testing and live.

- Tokens are stored securely (prefer httpOnly cookies).

- Session refresh works without manual reloads.

- Protected routes redirect unauthenticated users correctly.

- "Forgot password" or OAuth login screens function as expected.

## **3️⃣ API Integration**

**Explanation\**
Every page or epic must call the correct endpoints defined in the
generated frontend API docs.

**Checklist**

- Each epic/page has its API endpoints connected per the AI-generated
  docs.

- API client wrapper (/lib/apiClient.ts) handles:

  - Auth headers

  - JSON parsing

  - Error handling

  - Retry logic (if applicable)

- Network requests hit \${NEXT_PUBLIC_API_BASE_URL}/v1, not local mocks.

- 4xx / 5xx responses show friendly user messages (no raw JSON).

- All endpoints respond successfully with real data in testing mode.

## **4️⃣ UI & Design Consistency**

**Explanation\**
Visual mismatches or missing states hurt credibility. Verify layouts
against the final Figma files.

**Checklist**

- All screens match design specs (spacing, colors, typography).

- Responsive at all breakpoints (mobile, tablet, desktop).

- Shared components (Buttons, Inputs, Modals) render correctly.

- Global navigation, header, and footer behave consistently.

- Accessibility: keyboard navigation + aria-labels verified via
  Lighthouse or axe.

## **5️⃣ State Management**

**Explanation\**
Uncontrolled or missing global state causes inconsistent data between
pages.

**Checklist**

- Global store (Zustand/Redux/Context) correctly holds user/session
  data.

- State persists only where intended (temporary data clears on logout).

- Derived state (e.g., totals, filters) updates instantly when
  dependencies change.

- No unnecessary re-renders or lag during state updates.

## **6️⃣ Error Boundaries & Fallbacks**

**Explanation\**
The user should never see a blank screen.

**Checklist**

- Global \<ErrorBoundary\> in \_app.tsx catches runtime errors.

- API errors trigger visual feedback (toast, modal, or inline alert).

- Network-down scenario tested (offline simulation).

- "Page not found" and "Something went wrong" pages render properly.

## **7️⃣ Testing & QA Verification**

**Explanation\**
Automation ensures long-term stability; QA ensures accuracy.

**Checklist**

- Unit tests cover key components and hooks.

- Integration tests run without failures (e.g., checkout flow
  completes).

- E2E tests (Cypress/Playwright) run successfully in CI.

- Manual QA sign-off received for every new epic/page.

- Linting passes (pnpm lint) with no warnings.

- TypeScript strict mode passes (pnpm tsc \--noEmit).

## **8️⃣ Performance & Analytics**

**Explanation\**
Fast, trackable experiences improve UX and business metrics.

**Checklist**

- Core Web Vitals pass in Lighthouse (90+ scores).

- Lazy loading implemented for large assets and images.

- Code splitting verified (no single JS \> 250 KB).

- Analytics/tracking scripts fire once (no duplicates).

- Console free of warnings/errors in production build.

## **9️⃣ Deployment Validation**

**Explanation\**
The last pre-launch step ensures the exact build that passed QA is what
goes live.

**Checklist**

- QA-approved branch merged into main.

- Vercel build passes without errors or warnings.

- Environment variables verified again on Vercel live project.

- Smoke test on marketeq-projects-live.vercel.app passes (login → core
  flow → logout).

- Rollback plan tested (previous deployment restorable).

## **🔟 Documentation & Communication**

**Explanation\**
Launches fail when teams are misaligned. Keep docs visible and status
transparent.

**Checklist**

- AI-generated frontend API docs committed under /docs/api/frontend/.

- README includes setup and run instructions.

- Deployment SOPs (Testing → Live) followed exactly.

- QA confirmation logged in Jira or Pumble DM to team lead.

- Team notified once live build verified.

## **✅ Final Go-Live Confirmation**

  -------------------------------------------------------------------------
  **Role**          **Responsibility**                         **Status**
  ----------------- ------------------------------------------ ------------
  **Frontend Lead** Confirms build stability, API wiring, and  ☐
                    UI consistency                             

  **QA Tester**     Confirms manual & automated test pass      ☐

  **PM / Product    Confirms feature completeness & readiness  ☐
  Owner**                                                      

  **Tech Lead**     Confirms backend & environment parity      ☐

  **Deployment      Promotes to live on Vercel                 ☐
  Owner**                                                      
  -------------------------------------------------------------------------

### **⚡ Result**

When all boxes are checked and all roles sign off, the frontend is
considered **production-ready** and safe to deploy.
