## **Document 1 --- Login (Sign In)**

### **UI components**

- Page header + welcome copy ("Welcome Changemakers! Login to your
  account below").

- **OAuth buttons**:

  - "Sign in with Google"

  - "Sign in with Linkedin"

- **Divider text**: "Or use your email"

- **Email input** (placeholder: you@email.com).

- **Password input** (placeholder: "enter your password").

- **Remember me** checkbox.

- **Forgot password** link.

- Primary CTA button: **"Login to my account"**.

- Footer prompt: "Don't have an account? Sign up".

### **Actions & behaviors**

- OAuth sign-in attempts via Google / LinkedIn.

- Email/password login submits via "Login to my account".

- "Remember me" persists session (implied).

- "Forgot password" navigates to reset flow.

### **Validations (visible/implied)**

- Email required + valid email format (implied by "Email" field).

- Password required (implied by password field + login CTA).

### **Edge cases (implied)**

- OAuth account exists vs new user (sign-in success should route to
  dashboard; new users may be prompted to onboarding).

- Wrong credentials (not shown, but must exist for login).

- Remember-me across devices/browsers (session/token behavior).

## **Document 2 --- Registration (Create Account)**

### **UI components**

- Entry points:

  - From login: "Don't have an account? Sign up".

  - Dedicated sign-up screen content: "Create your account below".

- OAuth buttons:

  - "Sign up with Google"

  - "Sign up with Linkedin"

- Divider: "Or use your email".

- Email input (placeholder: you@email.com).

- **Terms checkbox**: "I agree to Markerteq's Terms of Use and Privacy
  Policy".

- Primary CTA: **"Create my account"**.

- Footer: "Already have an account? Sign in".

### **Actions & behaviors**

- Sign up via Google/LinkedIn.

- Email-based account creation gated by terms checkbox (implied).

- "Create my account" proceeds to account security setup (Step 1/3).

### **Validations**

- Email required + valid format.

- Must accept Terms/Privacy before enabling "Create my account"
  (implied).

### **Edge cases**

- Email already registered (should route to login or show error).

- OAuth sign-up when email already exists (should link accounts or
  prevent duplicates; implied need for merge policy).

## **Document 3 --- Account Security Setup (STEP 1 / 3)**

### **UI components**

- Wizard step label: **"STEP 1 / 3"**.

- Section title: "Secure your account".

- Password creation fields:

  - "Create Password" + "Type your password"

  - "Confirm Password" + "Type your password again"

- Password requirements list:

  - At least 8 characters

  - One lowercase letter

  - One uppercase letter

  - One number

  - One symbol

- CTA: "Continue".

### **Actions & behaviors**

- Continue advances to Step 2/3 (not fully shown in the PDF, but flow
  implies multi-step).

### **Validations**

- Password meets the listed rules.

- Confirm password must match password (implied).

### **Edge cases**

- Weak password (show which rule failed).

- Password mismatch.

- Continue disabled until valid.

## **Document 4 --- Role Selection ("What brings you here today?")**

### **UI components**

- Prompt: "What brings you here today?"

- Two selectable options (likely cards/radio tiles):

  - "I want to hire" + description

  - "I'm looking for work" + description

### **Actions & behaviors**

- Selecting "hire" routes to **Hire onboarding flow** (Step 1/5:
  Describe Your Team).

- Selecting "work" routes to **Talent onboarding flow** (Step 1/5:
  Introduce yourself).

### **Edge cases**

- If user navigates back into role selection after partially onboarding:
  decide whether to reset progress or keep state (implied).

- If user changes role later (not shown): must clarify impact on
  profile/team fields.

## **Document 5 --- Password Reset & Account Recovery**

### **5A) Reset password request screen**

**UI components**

- Title: "Reset your password".

- Instruction: "Enter your email address or phone number ...".

- Input: "Email or Phone" (placeholder: "Email address or phone
  number").

- Buttons: "Continue" and "Back".

- Link: "Still having trouble? Start account recovery".

- "Security Tip" content block (placeholder text).

**Validations / edge cases**

- Input must be valid email OR valid phone format (implied).

- Rate limit resend / prevent enumeration (implied; see "Account not
  found" screen below).

### **5B) Magic link sent confirmation**

**UI components**

- Title: "Magic link sent!"

- Message includes:

  - Destination email shown (e.g., johndoe@gmail.com)

  - Expiration: "The link will expire in 24 hours."

- Actions: "Resend Link" + "Back".

- Help link: "No longer have access to this email? Start account
  recovery".

- Helpful tip: "check your spam folder..."

**Validations / edge cases**

- Resend link throttling (implied by resend UX).

- Magic link expired after 24h.

- Email access lost → account recovery path.

### **5C) Account not found**

**UI components**

- Title: "Account not found".

- Error text includes either:

  - "We couldn\'t find an account associated with your email ..."

  - "We couldn\'t find an account associated with your phone number ..."

- CTA: "Try a different email/number" + "Back".

- Link persists: "Start account recovery" + helpful tip.

**Edge cases**

- Email/phone enumeration risk: this UI explicitly reveals
  existence/nonexistence, so backend should consider privacy tradeoff
  (implied).

### **5D) Reset password email (external)**

- Email content: "You have requested a password reset..." + "Reset
  Password" button + "link expires after 24 hours".

### **5E) Update password screen (after reset link)**

**UI components**

- Title: "Update Password".

- Copy: password hygiene recommendation + "Learn more".

- Fields: Create Password, Confirm Password.

- Requirements list repeated.

- CTA: "Save Password".

**Validations**

- Same password rules as signup.

- Password confirmation match (implied).

### **5F) Password updated confirmation**

**UI components**

- Success message: "Your password has been successfully updated!"

- Two security options (toggles or selectable rows):

  - "Stay logged in to my devices"

  - "Sign out of all other devices"

- CTA: "Continue to Dashboard".

**Edge cases**

- If user selects "Sign out of all other devices": invalidate all other
  active sessions/tokens (implied).

- If user selects "Stay logged in": preserve current sessions.

### **5G) Phone verification link (account recovery)**

- Message indicates a "Verify Your Account" link to verify phone number
  for recovery.

## **Document 6 --- Onboarding (Hire path: "I want to hire") --- 5 Steps**

### **Step 1 / 5 --- Describe Your Team**

**UI components**

- "STEP 1 / 5" + "Describe Your Team!"

- Inputs:

  - Team/company name

  - Role (job title)

  - Industry (example: Technology, Healthcare, Retail)

- Buttons: Back / Skip / Continue.

**Validations / edge cases**

- Likely required: team name, role, industry (implied).

- Skip path must define what happens (does it create partial profile?).

### **Step 2 / 5 --- Share Your Goals**

**UI components**

- "STEP 2 / 5" + "Share Your Goals!"

- Goal option cards (selectable):

  - Growth & Expansion

  - Brand Building & Awareness

  - Design & Strategy

  - Operational Efficiency & Optimization

  - Product & Service Development

  - Technology & Innovation

**Validations / edge cases**

- Single-select vs multi-select not explicit (needs decision).

- If none selected and user hits Continue: block or allow?

### **Step 3 / 5 --- Who are you looking to work with?**

**UI components**

- Prompt: "Who are you looking to work with?" + helper "Enter job titles
  related to your project".

- Autocomplete suggestions example:

  - React Developer / React.js Developer / React Engineer

- Skills section:

  - "What skills are you looking for?"

  - Autocomplete suggestions: React / React.js / React Native

**Actions**

- Typeahead/autocomplete behaviors for job titles and skills.

- Tag selection (implied by repeated suggestion lists).

**Validations / edge cases**

- Duplicate tags prevented.

- Max tags (not shown).

- Free-text allowed vs enforced from suggestions (not shown).

*(Steps 4/5 and 5/5 for Hire are not fully visible in the text snippets
provided; if they exist visually in the PDF images but not parsed text,
we can screenshot-parse them next.)*

## **Document 7 --- Onboarding (Work path: "I'm looking for work") --- 5 Steps**

### **Step 1 / 5 --- Introduce yourself**

**UI components**

- "STEP 1 / 5" + "Introduce yourself!"

- Profile image controls:

  - Upload Photo / Change Photo / Remove Photo (states shown)

- Inputs:

  - first name

  - last name

- Buttons: Back / Skip / Continue.

**Validations / edge cases**

- File upload validation (size/type), remove photo confirmation
  (implied).

- First/last name required vs optional (not explicit).

### **Step 2 / 5 --- Share your location**

**UI components**

- "STEP 2 / 5" + "Share your location"

- Inputs:

  - Location ("Enter your city or town")

  - Languages ("Enter your languages")

- Buttons: Back / Skip / Continue.

**Edge cases**

- Multi-language entry format (tags vs free text).

- Location autocomplete vs free text.

### **Step 3 / 5 --- Showcase your talent**

**UI components**

- "STEP 3 / 5" + "Showcase your talent"

- Inputs:

  - Most recent job title (example: Software Developer)

  - Industries worked in (example: Banking)

  - Top skills (example: react.js, css)

- Skill tags shown:

  - React.js, Tailwind CSS, React Native (chip/tag UI).

- Checkbox: "I'm currently a student".

- Buttons: Back / Skip / Continue.

**Validations / edge cases**

- Skill tags: duplicate prevention, max count, free-text skills.

- Student toggle impact (e.g., job title optional?) not shown.

### **Step 4 / 5 --- Create your username**

**UI components**

- "STEP 4 / 5" + "Create your username"

- Input: "Enter your username" with example your_username321.

- Availability suggestions UI:

  - Examples like \@esha.design, \@esha.designer + "are available"

  - "More suggestions" link/button

- Note: You can browse without username, but need username to
  connect/post.

- Buttons: Back / Skip / Continue.

**Validations / edge cases**

- Username uniqueness check + live availability.

- Allowed characters (not shown).

- If user skips: restrict certain actions later (explicitly stated).

### **Step 5 / 5 --- Set your preferences**

**UI components**

- "STEP 5 / 5" + "Set your preferences"

- Inputs:

  - Project preferences (example: Data Analysis) with many tag
    suggestions (e.g., Mobile Applications, Cloud Software, Logo Design,
    etc.).

  - Availability dropdown: "Select availability".

- Buttons: Back / Skip / Continue.

**Validations / edge cases**

- Availability required? (not explicit)

- Preferences tag limits + duplicates.

## **Document 8 --- Post-login Dashboard / Marketplace (visible portion)**

### **UI components**

- Header search: "Search by skills or project type".

- Category control: "Category".

- User summary block (example):

  - Price/value shown (\$1,540 USD)

  - User name: "Christopher Torres"

  - Email: chris@marketeqdigital.com

  - "You currently have 10 team members"

- Left/Top navigation items:

  - Research, Design, Development, Testing, Security, Maintenance,
    Digital Marketing

  - My Favorites

  - My Dashboard

- Section: "UX / UI Experts on Demand" + CTA "browse UX / UI experts".

- Project listing sections:

  - "Our Favorite Projects" + "View More"

  - "Newest Additions" + "View More"

  - "Most Popular Projects" + "View More"

- Project card content examples:

  - Title: "The Ultimate Mobile App Experience"

  - Subtitle: "A complete funnel for your customer service needs"

  - Price/timeline: "Starts at \$40k, 12 weeks"

  - Another card type: "SEO Enterprise" + description + "Starts at
    \$40k, 12 weeks"

- "View all" + category quick filters:

  - Top Web projects, Top mobile projects, Top Cloud projects, Top
    digital marketing projects

### **Actions (implied)**

- Search triggers filtered results (likely via Algolia/autocomplete
  service, implied by platform standards but not required for UI list).

- "View More" navigates to full list pages per section.

- Category quick filters switch listing content.

### **Edge cases (implied)**

- Empty states for each section (no favorites / no new additions).

- Pagination / lazy load on project lists.

- Search with no results.
