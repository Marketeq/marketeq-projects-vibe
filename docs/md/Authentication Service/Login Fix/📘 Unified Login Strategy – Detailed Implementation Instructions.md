**📘 Unified Login Strategy -- Detailed Implementation Instructions**

This guide outlines exactly what needs to be done to implement a
seamless login experience supporting:

- Email/password login

- Google login

- LinkedIn login

- Seamless account unification (based on email match)

- Secure token-based session via cookies

- Optional password creation after login (via frontend prompt)

### **✅ GOAL**

Allow users to:

- Sign in using **email/password** or **social login (Google,
  LinkedIn)\**

- Automatically associate all login methods to the **same user
  account**, if the email matches

- Let users **create a password later** if their account was created via
  social login

- Use the password login in future, **regardless of how the account was
  created\**

### **🔁 UNIFIED FLOW OVERVIEW**

  --------------------------------------------------------
  **Action**          **Result**
  ------------------- ------------------------------------
  Email login         Creates or logs into account (if
                      password exists)

  Google login        Logs into existing account if email
                      matches

  LinkedIn login      Logs into existing account if email
                      matches

  Create password     Enables email/password login for
                      that account

  Login from any      ✅ Same account, as long as email
  method              matches
  --------------------------------------------------------

### **🔐 STEP 1: CORS & Cookie Config (Backend)**

1.  Enable **CORS** in your backend and allow the frontend origin
    (marketeq-projects.vercel.app)

2.  Set credentials: true so cookies are accepted from cross-origin
    requests

3.  Configure your cookie with:

    - httpOnly: true

    - secure: true

    - sameSite: \'None\'

    - Set domain only in production (e.g., marketeq-projects.vercel.app)

4.  Always use res.cookie(\...) to manually set the token after login

### **📦 STEP 2: Email/Password Login**

1.  Accept email and password from the frontend

2.  Look up the user in the database using the email

3.  Verify the password using bcrypt

4.  If valid, sign a JWT token and send it in a cookie

5.  If invalid, throw a 401 Unauthorized error

### **🌐 STEP 3: Social Login (Google or LinkedIn)**

1.  Frontend obtains an access token from Google or LinkedIn

2.  Send that token to the backend's /auth/google or /auth/linkedin
    endpoint

3.  Backend fetches the user profile using the token (name, email,
    picture, etc.)

4.  Match the profile email to an existing user

    - If found: log in the user and issue token

    - If not found: create a new user account using the profile data

5.  Return token in cookie like email login

### **🧠 STEP 4: Unified Account Logic**

If a user logs in with any method and the **email matches an existing
account**:

- Always connect the session to the **existing account\**

- Don't create a new user if one already exists for the email

This ensures one account per email across all login methods.

### **🔒 STEP 5: Prompt to Create Password (Frontend Flow)**

1.  After login (especially via social login), check:

    - user.hasPassword --- false if they've never created one

    - user.twoFactorVerified --- false if 2FA isn't complete

2.  If either is missing, show a modal prompting them to:

    - Create a password (if missing)

    - Enable 2FA (optional)

3.  This lets the user convert their social-only account into a full
    email/password account

### **📨 STEP 6: Notification Service (for Emails)**

- Send verification or magic link emails using your existing
  Notification Service (built with SendGrid)

- This service should:

  - Accept a recipient email and template name or content

  - Use SendGrid API keys and templates to send emails

  - Be called from the AuthService when sending login links or
    confirmations

### **✅ STEP 7: Logout**

- Clear the session cookie with res.clearCookie(\'accessToken\')

- Redirect or respond with a confirmation

### **🔍 STEP 8: Testing & Validation (Postman + Frontend)**

Use Postman to test:

- Email/password login

- Google/LinkedIn login

- Token returned as a Set-Cookie header

- Logout clears the cookie

Use browser DevTools to:

- Check if the accessToken cookie is saved and sent

- Validate cookie behavior across refreshes and routes
