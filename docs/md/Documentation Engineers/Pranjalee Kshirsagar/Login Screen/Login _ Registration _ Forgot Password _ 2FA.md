# **Login / Registration / Forgot Password / 2FA**

## **0) Shared Rules**

### **0.1 Desktop vs Mobile layout**

- **Desktop**: 2-column layout

  - Left: brand/marketing panel with CTA

  - Right: auth form panel

- **Mobile**: form panel only (left panel hidden)

### **0.2 Global UI components used across screens**

- Social buttons (Google, LinkedIn)

- Divider "Or use your email"

- Form fields with inline validation

- Primary CTA button

- Footer navigation links (Sign in / Sign up)

- Terms / Privacy links where shown (Sign Up)

## **0.3 Shared route constants**

  -----------------------------------------------------------------------
  // src/auth/routes.ts\
  export const AUTH_ROUTES = {\
  login: \"/auth/login\",\
  signup: \"/auth/signup\",\
  forgotPassword: \"/auth/forgot-password\",\
  magicLinkSent: \"/auth/magic-link-sent\",\
  accountNotFound: \"/auth/account-not-found\",\
  updatePassword: \"/auth/update-password\", // expects ?token=\
  passwordUpdated: \"/auth/password-updated\",\
  accountRecovery: \"/auth/account-recovery\",\
  dashboard: \"/dashboard\",\
  } as const;
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **0.4 Shared auth client wrapper (wire later)**

  -----------------------------------------------------------------------
  // src/auth/authClient.ts\
  export type LoginPayload = { email: string; password: string;
  rememberMe?: boolean };\
  export type SignupPayload = { email: string; acceptTerms: boolean };\
  export type ResetRequestPayload = { emailOrPhone: string };\
  export type UpdatePasswordPayload = { token: string; password: string;
  confirmPassword: string };\
  \
  export const authClient = {\
  async login(payload: LoginPayload) {\
  // TODO: wire to your real auth mechanism\
  return { ok: true };\
  },\
  async signup(payload: SignupPayload) {\
  // TODO: wire to your real auth mechanism\
  return { ok: true };\
  },\
  async requestPasswordReset(payload: ResetRequestPayload) {\
  // TODO: wire to your real auth mechanism\
  // If account doesn\'t exist, return { ok:false }\
  return { ok: true, sentTo: payload.emailOrPhone };\
  },\
  async updatePassword(payload: UpdatePasswordPayload) {\
  // TODO: wire to your real auth mechanism\
  if (payload.password !== payload.confirmPassword) {\
  return { ok: false, error: \"Passwords do not match.\" };\
  }\
  return { ok: true };\
  },\
  \
  // OAuth hooks (wire to NextAuth or custom OAuth)\
  async signInWithGoogle() { return { ok: true }; },\
  async signInWithLinkedIn() { return { ok: true }; },\
  async signUpWithGoogle() { return { ok: true }; },\
  async signUpWithLinkedIn() { return { ok: true }; },\
  };
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **0.5 Shared AuthLayout (left panel + form panel)**

> This matches the **order/layout structure** of the design: left
> branding panel + right form area.\
> Replace the left panel text with exact design marketing copy if
> needed.

  -----------------------------------------------------------------------
  // src/auth/components/AuthLayout.tsx\
  import React from \"react\";\
  \
  type Props = {\
  leftVariant: \"login\" \| \"signup\";\
  title: string;\
  subtitle?: string;\
  children: React.ReactNode;\
  };\
  \
  export function AuthLayout({ leftVariant, title, subtitle, children }:
  Props) {\
  return (\
  \<div style={{ display: \"grid\", gridTemplateColumns: \"380px 1fr\",
  minHeight: \"100vh\" }}\>\
  {/\* Left Panel (hidden on mobile by your CSS framework if needed)
  \*/}\
  \<aside style={{ background: \"#0b1b3a\", color: \"white\", padding: 32
  }}\>\
  \<div style={{ fontWeight: 700, letterSpacing: 0.2
  }}\>Marketeq\</div\>\
  \
  {leftVariant === \"login\" ? (\
  \<\>\
  {/\* LOGIN left panel (design shows \"You control the agency\...\" and
  CTA to sign in/join) \*/}\
  \<h2 style={{ fontSize: 22, margin: \"24px 0 12px\" }}\>\
  Welcome to the Marketeq Talent Network, Where tech projects come to
  life!\
  \</h2\>\
  \<p style={{ opacity: 0.9, marginBottom: 24 }}\>You control the
  agency\...\</p\>\
  \
  \<div style={{ marginTop: 24 }}\>\
  \<div style={{ opacity: 0.85, fontSize: 12 }}\>Already have an
  account?\</div\>\
  \<a href=\"/auth/login\" style={{ color: \"white\", textDecoration:
  \"underline\" }}\>\
  Sign in\
  \</a\>\
  \</div\>\
  \</\>\
  ) : (\
  \<\>\
  {/\* SIGNUP left panel (design shows \"You control the agency\" +
  bullet list + join CTA) \*/}\
  \<h2 style={{ fontSize: 22, margin: \"24px 0 12px\" }}\>You control the
  agency\</h2\>\
  \<ul style={{ opacity: 0.9, lineHeight: 1.6 }}\>\
  \<li\>Work with the best tech projects in the country\</li\>\
  \<li\>Manage all your digital projects and assets\</li\>\
  \<li\>Invite team members and collaborate on projects\</li\>\
  \<li\>Access curated tech teams from top talent\</li\>\
  \</ul\>\
  \
  \<div style={{ marginTop: 24 }}\>\
  \<div style={{ opacity: 0.85, fontSize: 12 }}\>Don\'t have an
  account?\</div\>\
  \<a href=\"/auth/signup\" style={{ color: \"white\", textDecoration:
  \"underline\" }}\>\
  Join Us For Free\
  \</a\>\
  \</div\>\
  \</\>\
  )}\
  \</aside\>\
  \
  {/\* Right Form Panel \*/}\
  \<main style={{ display: \"flex\", justifyContent: \"center\",
  alignItems: \"center\", padding: 24 }}\>\
  \<div style={{ width: 420 }}\>\
  \<div style={{ marginBottom: 16 }}\>\
  \<h1 style={{ margin: 0, fontSize: 22 }}\>{title}\</h1\>\
  {subtitle && \<p style={{ marginTop: 6, color: \"#4b5563\"
  }}\>{subtitle}\</p\>}\
  \</div\>\
  \
  {children}\
  \
  {/\* Global footer links (design shows terms/privacy where applicable)
  \*/}\
  \<div style={{ marginTop: 24, fontSize: 12, color: \"#6b7280\" }}\>\
  \<a href=\"/terms\" style={{ color: \"#6b7280\" }}\>Terms &
  Conditions\</a\>\
  {\" • \"}\
  \<a href=\"/privacy\" style={{ color: \"#6b7280\" }}\>Privacy
  Policy\</a\>\
  \</div\>\
  \</div\>\
  \</main\>\
  \</div\>\
  );\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **1) Login Screen**

## **1.1 Screen intent** 

Login allows existing users to sign in using **Google**, **LinkedIn**,
or **Email + Password**. It includes **Remember me** for session
persistence and a **Forgot password** link that starts password
recovery.

## **1.2 UI elements (as per design)**

- Title: "Welcome Changemakers!"

- Subtitle: "Login to your account below"

- Buttons:

  - "Sign in with Google"

  - "Sign in with Linkedin"

- Divider: "Or use your email"

- Fields:

  - Email (placeholder you@email.com)

  - Password (placeholder enter your password, show/hide icon)

- Options:

  - Remember me checkbox

  - Forgot password link

- CTA: "Login to my account"

- Footer: "Don't have an account? Sign up"

## **1.3 Validation rules**

- Email required + valid email format

- Password required

- On auth failure: show an error message and keep user on screen

## **1.4 Screen code**

  -----------------------------------------------------------------------
  // app/auth/login/page.tsx\
  \"use client\";\
  import React, { useState } from \"react\";\
  import { AuthLayout } from \"@/src/auth/components/AuthLayout\";\
  import { authClient } from \"@/src/auth/authClient\";\
  import { AUTH_ROUTES } from \"@/src/auth/routes\";\
  \
  export default function LoginPage() {\
  const \[email, setEmail\] = useState(\"\");\
  const \[password, setPassword\] = useState(\"\");\
  const \[rememberMe, setRememberMe\] = useState(false);\
  const \[loading, setLoading\] = useState(false);\
  const \[error, setError\] = useState\<string \| null\>(null);\
  \
  async function onSubmit(e: React.FormEvent) {\
  e.preventDefault();\
  setError(null);\
  setLoading(true);\
  try {\
  const res = await authClient.login({ email, password, rememberMe });\
  if (!res.ok) setError(\"Invalid email or password.\");\
  else window.location.href = AUTH_ROUTES.dashboard;\
  } finally {\
  setLoading(false);\
  }\
  }\
  \
  return (\
  \<AuthLayout\
  leftVariant=\"login\"\
  title=\"Welcome Changemakers!\"\
  subtitle=\"Login to your account below\"\
  \>\
  \<div style={{ display: \"grid\", gap: 10 }}\>\
  \<button type=\"button\" onClick={() =\>
  authClient.signInWithGoogle()}\>\
  Sign in with Google\
  \</button\>\
  \<button type=\"button\" onClick={() =\>
  authClient.signInWithLinkedIn()}\>\
  Sign in with Linkedin\
  \</button\>\
  \
  \<div style={{ display: \"flex\", alignItems: \"center\", gap: 8,
  margin: \"8px 0\" }}\>\
  \<div style={{ height: 1, background: \"#e5e7eb\", flex: 1 }} /\>\
  \<span style={{ fontSize: 12, color: \"#6b7280\" }}\>Or use your
  email\</span\>\
  \<div style={{ height: 1, background: \"#e5e7eb\", flex: 1 }} /\>\
  \</div\>\
  \
  \<form onSubmit={onSubmit} style={{ display: \"grid\", gap: 10 }}\>\
  \<label\>\
  \<div style={{ fontSize: 12, color: \"#374151\" }}\>Email\</div\>\
  \<input\
  type=\"email\"\
  placeholder=\"you@email.com\"\
  value={email}\
  onChange={(e) =\> setEmail(e.target.value)}\
  required\
  style={{ width: \"100%\", padding: 10 }}\
  /\>\
  \</label\>\
  \
  \<label\>\
  \<div style={{ fontSize: 12, color: \"#374151\" }}\>Password\</div\>\
  \<input\
  type=\"password\"\
  placeholder=\"enter your password\"\
  value={password}\
  onChange={(e) =\> setPassword(e.target.value)}\
  required\
  style={{ width: \"100%\", padding: 10 }}\
  /\>\
  \</label\>\
  \
  \<div style={{ display: \"flex\", justifyContent: \"space-between\",
  alignItems: \"center\" }}\>\
  \<label style={{ display: \"flex\", alignItems: \"center\", gap: 8,
  fontSize: 12 }}\>\
  \<input\
  type=\"checkbox\"\
  checked={rememberMe}\
  onChange={(e) =\> setRememberMe(e.target.checked)}\
  /\>\
  Remember me\
  \</label\>\
  \
  \<a href={AUTH_ROUTES.forgotPassword} style={{ fontSize: 12 }}\>\
  Forgot password\
  \</a\>\
  \</div\>\
  \
  {error && \<div style={{ color: \"#b91c1c\", fontSize: 12
  }}\>{error}\</div\>}\
  \
  \<button disabled={loading} type=\"submit\" style={{ padding: 12 }}\>\
  {loading ? \"Logging in\...\" : \"Login to my account\"}\
  \</button\>\
  \</form\>\
  \
  \<div style={{ fontSize: 12, marginTop: 8 }}\>\
  Don\'t have an account? \<a href={AUTH_ROUTES.signup}\>Sign up\</a\>\
  \</div\>\
  \</div\>\
  \</AuthLayout\>\
  );\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **2) Registration Screen (Sign Up)**

## **2.1 Screen intent** 

Sign Up allows new users to create an account using **Google**,
**LinkedIn**, or **Email**. For email signup, the user must accept
**Terms of Use** and **Privacy Policy** before creating the account.

## **2.2 UI elements (as per design)**

- Title: "Welcome Changemakers!"

- Subtitle: "Create your account below"

- Buttons:

  - "Sign up with Google"

  - "Sign up with Linkedin"

- Divider: "Or use your email"

- Email field (you@email.com)

- Checkbox: "I agree to Marketeq's Terms of Use and Privacy Policy"

- CTA: "Create my account"

- Footer: "Already have an account? Sign in"

## **2.3 Validation rules**

- Email required + valid format

- Terms checkbox required (block submit if unchecked)

## **2.4 Screen code**

  -----------------------------------------------------------------------
  // app/auth/signup/page.tsx\
  \"use client\";\
  import React, { useState } from \"react\";\
  import { AuthLayout } from \"@/src/auth/components/AuthLayout\";\
  import { authClient } from \"@/src/auth/authClient\";\
  import { AUTH_ROUTES } from \"@/src/auth/routes\";\
  \
  export default function SignupPage() {\
  const \[email, setEmail\] = useState(\"\");\
  const \[acceptTerms, setAcceptTerms\] = useState(false);\
  const \[loading, setLoading\] = useState(false);\
  const \[error, setError\] = useState\<string \| null\>(null);\
  \
  async function onSubmit(e: React.FormEvent) {\
  e.preventDefault();\
  setError(null);\
  if (!acceptTerms) {\
  setError(\"You must agree to the Terms of Use and Privacy Policy.\");\
  return;\
  }\
  setLoading(true);\
  try {\
  const res = await authClient.signup({ email, acceptTerms });\
  if (!res.ok) setError(\"Unable to create account. Please try
  again.\");\
  else window.location.href = \"/onboarding\";\
  } finally {\
  setLoading(false);\
  }\
  }\
  \
  return (\
  \<AuthLayout\
  leftVariant=\"signup\"\
  title=\"Welcome Changemakers!\"\
  subtitle=\"Create your account below\"\
  \>\
  \<div style={{ display: \"grid\", gap: 10 }}\>\
  \<button type=\"button\" onClick={() =\>
  authClient.signUpWithGoogle()}\>\
  Sign up with Google\
  \</button\>\
  \<button type=\"button\" onClick={() =\>
  authClient.signUpWithLinkedIn()}\>\
  Sign up with Linkedin\
  \</button\>\
  \
  \<div style={{ display: \"flex\", alignItems: \"center\", gap: 8,
  margin: \"8px 0\" }}\>\
  \<div style={{ height: 1, background: \"#e5e7eb\", flex: 1 }} /\>\
  \<span style={{ fontSize: 12, color: \"#6b7280\" }}\>Or use your
  email\</span\>\
  \<div style={{ height: 1, background: \"#e5e7eb\", flex: 1 }} /\>\
  \</div\>\
  \
  \<form onSubmit={onSubmit} style={{ display: \"grid\", gap: 10 }}\>\
  \<label\>\
  \<div style={{ fontSize: 12, color: \"#374151\" }}\>Email\</div\>\
  \<input\
  type=\"email\"\
  placeholder=\"you@email.com\"\
  value={email}\
  onChange={(e) =\> setEmail(e.target.value)}\
  required\
  style={{ width: \"100%\", padding: 10 }}\
  /\>\
  \</label\>\
  \
  \<label style={{ display: \"flex\", gap: 8, fontSize: 12, alignItems:
  \"flex-start\" }}\>\
  \<input\
  type=\"checkbox\"\
  checked={acceptTerms}\
  onChange={(e) =\> setAcceptTerms(e.target.checked)}\
  style={{ marginTop: 2 }}\
  /\>\
  \<span\>\
  I agree to Marketeq\'s \<a href=\"/terms\"\>Terms of Use\</a\> and{\"
  \"}\
  \<a href=\"/privacy\"\>Privacy Policy\</a\>\
  \</span\>\
  \</label\>\
  \
  {error && \<div style={{ color: \"#b91c1c\", fontSize: 12
  }}\>{error}\</div\>}\
  \
  \<button disabled={loading} type=\"submit\" style={{ padding: 12 }}\>\
  {loading ? \"Creating\...\" : \"Create my account\"}\
  \</button\>\
  \</form\>\
  \
  \<div style={{ fontSize: 12, marginTop: 8 }}\>\
  Already have an account? \<a href={AUTH_ROUTES.login}\>Sign in\</a\>\
  \</div\>\
  \</div\>\
  \</AuthLayout\>\
  );\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **3) Forgot Password (Reset Request)**

## **3.1 Screen intent** 

This screen lets the user request a password reset by entering the
**email or phone number** tied to their account. If the account exists,
show "Magic link sent" and state that the link expires in **24 hours**.

## **3.2 UI elements (as per design)**

- Title: "Reset your password"

- Instruction text

- Field: "Email or Phone"

- Buttons: "Continue", "Back"

- Link: "Still having trouble? Start account recovery"

- Security Tip panel (placeholder text shown in design)

## **3.3 Screen code**

  --------------------------------------------------------------------------------
  // app/auth/forgot-password/page.tsx\
  \"use client\";\
  import React, { useState } from \"react\";\
  import { AuthLayout } from \"@/src/auth/components/AuthLayout\";\
  import { authClient } from \"@/src/auth/authClient\";\
  import { AUTH_ROUTES } from \"@/src/auth/routes\";\
  \
  export default function ForgotPasswordPage() {\
  const \[emailOrPhone, setEmailOrPhone\] = useState(\"\");\
  const \[loading, setLoading\] = useState(false);\
  \
  async function onContinue(e: React.FormEvent) {\
  e.preventDefault();\
  setLoading(true);\
  try {\
  const res = await authClient.requestPasswordReset({ emailOrPhone });\
  if (!res.ok) {\
  window.location.href =
  \`\${AUTH_ROUTES.accountNotFound}?q=\${encodeURIComponent(emailOrPhone)}\`;\
  return;\
  }\
  window.location.href =
  \`\${AUTH_ROUTES.magicLinkSent}?email=\${encodeURIComponent(emailOrPhone)}\`;\
  } finally {\
  setLoading(false);\
  }\
  }\
  \
  return (\
  \<AuthLayout leftVariant=\"login\" title=\"Reset your password\"\>\
  \<p style={{ color: \"#4b5563\", marginTop: 0 }}\>\
  Enter your email address or phone number below in order to reset your password.\
  \</p\>\
  \
  \<form onSubmit={onContinue} style={{ display: \"grid\", gap: 10 }}\>\
  \<label\>\
  \<div style={{ fontSize: 12, color: \"#374151\" }}\>Email or Phone\</div\>\
  \<input\
  type=\"text\"\
  placeholder=\"Email address or phone number\"\
  value={emailOrPhone}\
  onChange={(e) =\> setEmailOrPhone(e.target.value)}\
  required\
  style={{ width: \"100%\", padding: 10 }}\
  /\>\
  \</label\>\
  \
  \<div style={{ display: \"flex\", gap: 10 }}\>\
  \<button disabled={loading} type=\"submit\" style={{ padding: 12, flex: 1 }}\>\
  {loading ? \"Sending\...\" : \"Continue\"}\
  \</button\>\
  \<a href={AUTH_ROUTES.login} style={{ padding: 12, display: \"inline-flex\",
  alignItems: \"center\" }}\>\
  Back\
  \</a\>\
  \</div\>\
  \
  \<div style={{ fontSize: 12 }}\>\
  Still having trouble? \<a href={AUTH_ROUTES.accountRecovery}\>Start account
  recovery\</a\>\
  \</div\>\
  \
  \<div style={{ marginTop: 8, padding: 12, background: \"#f3f4f6\", borderRadius:
  8 }}\>\
  \<div style={{ fontWeight: 600, fontSize: 12 }}\>Security Tip\</div\>\
  \<div style={{ fontSize: 12, color: \"#4b5563\" }}\>\
  {/\* Keep exact design placeholder if it\'s lorem in the design \*/}\
  Rorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero
  et velit interdum.\
  \</div\>\
  \</div\>\
  \</form\>\
  \</AuthLayout\>\
  );\
  }
  --------------------------------------------------------------------------------

  --------------------------------------------------------------------------------

# **4) Magic Link Sent**

## **4.1 Screen intent** 

Confirms a reset link was emailed and tells the user the link expires in
**24 hours**. User can **resend** the link, go **back**, or use
**account recovery** if they no longer have access to the email.

## **4.2 Screen code**

  -----------------------------------------------------------------------
  // app/auth/magic-link-sent/page.tsx\
  \"use client\";\
  import React from \"react\";\
  import { AuthLayout } from \"@/src/auth/components/AuthLayout\";\
  import { AUTH_ROUTES } from \"@/src/auth/routes\";\
  \
  export default function MagicLinkSentPage({ searchParams }: {
  searchParams: { email?: string } }) {\
  const email = searchParams.email ?? \"your email\";\
  return (\
  \<AuthLayout leftVariant=\"login\" title=\"Magic link sent!\"\>\
  \<p style={{ color: \"#4b5563\", marginTop: 0 }}\>\
  We sent a magic link to the email \<b\>{email}\</b\>. The link will
  expire in 24 hours.\
  \</p\>\
  \
  \<div style={{ display: \"flex\", gap: 10, marginTop: 12 }}\>\
  \<button type=\"button\" style={{ padding: 12, flex: 1 }}\>\
  Resend Link\
  \</button\>\
  \<a href={AUTH_ROUTES.forgotPassword} style={{ padding: 12, display:
  \"inline-flex\", alignItems: \"center\" }}\>\
  Back\
  \</a\>\
  \</div\>\
  \
  \<div style={{ fontSize: 12, marginTop: 12 }}\>\
  No longer have access to this email? \<a
  href={AUTH_ROUTES.accountRecovery}\>Start account recovery\</a\>\
  \<div style={{ color: \"#6b7280\", marginTop: 6 }}\>\
  Helpful Tip: Be sure to check your spam folder if you don\'t see the
  email in your inbox.\
  \</div\>\
  \</div\>\
  \</AuthLayout\>\
  );\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **5) Account Not Found (Email / Phone variants)**

## **5.1 Screen intent** 

If no account exists for the provided email/phone, show "Account not
found" and let the user retry with a different value or go back. Keep
the account recovery link visible for users who lost access.

## **5.2 Screen code**

  -----------------------------------------------------------------------
  // app/auth/account-not-found/page.tsx\
  \"use client\";\
  import React from \"react\";\
  import { AuthLayout } from \"@/src/auth/components/AuthLayout\";\
  import { AUTH_ROUTES } from \"@/src/auth/routes\";\
  \
  export default function AccountNotFoundPage({ searchParams }: {
  searchParams: { q?: string } }) {\
  const q = searchParams.q ?? \"\";\
  const looksLikePhone = q.includes(\"+\") && /\\d{3}/.test(q);\
  \
  const message = looksLikePhone\
  ? \`We couldn\'t find an account associated with your phone number
  \${q}.\`\
  : \`We couldn\'t find an account associated with your email \${q}.\`;\
  \
  const tryAgainLabel = looksLikePhone ? \"Try a different number\" :
  \"Try a different email\";\
  \
  return (\
  \<AuthLayout leftVariant=\"login\" title=\"Account not found\"\>\
  \<p style={{ color: \"#4b5563\", marginTop: 0 }}\>{message}\</p\>\
  \
  \<div style={{ display: \"flex\", gap: 10, marginTop: 12 }}\>\
  \<a\
  href={AUTH_ROUTES.forgotPassword}\
  style={{ padding: 12, flex: 1, display: \"inline-flex\",
  justifyContent: \"center\" }}\
  \>\
  {tryAgainLabel}\
  \</a\>\
  \<a href={AUTH_ROUTES.forgotPassword} style={{ padding: 12, display:
  \"inline-flex\", alignItems: \"center\" }}\>\
  Back\
  \</a\>\
  \</div\>\
  \
  \<div style={{ fontSize: 12, marginTop: 12 }}\>\
  No longer have access to this email? \<a
  href={AUTH_ROUTES.accountRecovery}\>Start account recovery\</a\>\
  \<div style={{ color: \"#6b7280\", marginTop: 6 }}\>\
  Helpful Tip: Be sure to check your spam folder if you don\'t see the
  email in your inbox.\
  \</div\>\
  \</div\>\
  \</AuthLayout\>\
  );\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **6) Update Password**

## **6.1 Screen intent** 

Reached via the magic link, this screen sets a new password and enforces
the password rules shown in the design: minimum length and required
character types. User must confirm the password exactly before saving.

## **6.2 Password rules (as per design)**

- At least 8 characters

- One lowercase letter

- One uppercase letter

- One number

- One symbol

## **6.3 Screen code**

  -----------------------------------------------------------------------
  // app/auth/update-password/page.tsx\
  \"use client\";\
  import React, { useMemo, useState } from \"react\";\
  import { AuthLayout } from \"@/src/auth/components/AuthLayout\";\
  import { authClient } from \"@/src/auth/authClient\";\
  import { AUTH_ROUTES } from \"@/src/auth/routes\";\
  \
  function meetsPasswordRules(pw: string) {\
  return (\
  pw.length \>= 8 &&\
  /\[a-z\]/.test(pw) &&\
  /\[A-Z\]/.test(pw) &&\
  /\\d/.test(pw) &&\
  /\[\^A-Za-z0-9\]/.test(pw)\
  );\
  }\
  \
  export default function UpdatePasswordPage({ searchParams }: {
  searchParams: { token?: string } }) {\
  const token = searchParams.token ?? \"\";\
  const \[password, setPassword\] = useState(\"\");\
  const \[confirmPassword, setConfirmPassword\] = useState(\"\");\
  const \[loading, setLoading\] = useState(false);\
  const \[error, setError\] = useState\<string \| null\>(null);\
  \
  const canSubmit = useMemo(() =\> {\
  return Boolean(token) && password && confirmPassword && password ===
  confirmPassword && meetsPasswordRules(password);\
  }, \[token, password, confirmPassword\]);\
  \
  async function onSave(e: React.FormEvent) {\
  e.preventDefault();\
  setError(null);\
  \
  if (!canSubmit) {\
  setError(\"Please meet all password requirements and ensure both fields
  match.\");\
  return;\
  }\
  \
  setLoading(true);\
  try {\
  const res = await authClient.updatePassword({ token, password,
  confirmPassword });\
  if (!res.ok) setError(res.error ?? \"Unable to update password.\");\
  else window.location.href = AUTH_ROUTES.passwordUpdated;\
  } finally {\
  setLoading(false);\
  }\
  }\
  \
  return (\
  \<AuthLayout leftVariant=\"login\" title=\"Update Password\"\>\
  \<p style={{ color: \"#4b5563\", marginTop: 0 }}\>\
  Marketeq recommends avoiding using personal information in passwords
  and using a unique password for each\
  account. \<a href=\"/help/passwords\"\>Learn more\</a\>\
  \</p\>\
  \
  \<form onSubmit={onSave} style={{ display: \"grid\", gap: 10 }}\>\
  \<label\>\
  \<div style={{ fontSize: 12, color: \"#374151\" }}\>Create
  Password\</div\>\
  \<input\
  type=\"password\"\
  placeholder=\"Type your password\"\
  value={password}\
  onChange={(e) =\> setPassword(e.target.value)}\
  required\
  style={{ width: \"100%\", padding: 10 }}\
  /\>\
  \</label\>\
  \
  \<label\>\
  \<div style={{ fontSize: 12, color: \"#374151\" }}\>Confirm
  Password\</div\>\
  \<input\
  type=\"password\"\
  placeholder=\"Type your password again\"\
  value={confirmPassword}\
  onChange={(e) =\> setConfirmPassword(e.target.value)}\
  required\
  style={{ width: \"100%\", padding: 10 }}\
  /\>\
  \</label\>\
  \
  \<div style={{ padding: 12, background: \"#f3f4f6\", borderRadius: 8,
  fontSize: 12 }}\>\
  \<div style={{ fontWeight: 600 }}\>Password Requirements\</div\>\
  \<ul style={{ margin: \"6px 0 0 18px\", color: \"#4b5563\" }}\>\
  \<li\>At least 8 characters\</li\>\
  \<li\>One lowercase letter\</li\>\
  \<li\>One uppercase letter\</li\>\
  \<li\>One number\</li\>\
  \<li\>One symbol\</li\>\
  \</ul\>\
  \</div\>\
  \
  {error && \<div style={{ color: \"#b91c1c\", fontSize: 12
  }}\>{error}\</div\>}\
  \
  \<button disabled={loading \|\| !canSubmit} type=\"submit\" style={{
  padding: 12 }}\>\
  {loading ? \"Saving\...\" : \"Save Password\"}\
  \</button\>\
  \</form\>\
  \</AuthLayout\>\
  );\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **7) Password Updated (Success)**

## **7.1 Screen intent** 

Confirms password update and provides device/session options (stay
logged in, sign out others). The primary CTA continues to the dashboard.

## **7.2 Screen code**

  -----------------------------------------------------------------------
  // app/auth/password-updated/page.tsx\
  \"use client\";\
  import React, { useState } from \"react\";\
  import { AuthLayout } from \"@/src/auth/components/AuthLayout\";\
  import { AUTH_ROUTES } from \"@/src/auth/routes\";\
  \
  export default function PasswordUpdatedPage() {\
  const \[stayLoggedIn, setStayLoggedIn\] = useState(true);\
  const \[signOutOthers, setSignOutOthers\] = useState(false);\
  \
  function onContinue() {\
  // TODO: if signOutOthers, call your auth/session revoke endpoint.\
  window.location.href = AUTH_ROUTES.dashboard;\
  }\
  \
  return (\
  \<AuthLayout leftVariant=\"login\" title=\"Your password has been
  successfully updated!\"\>\
  \<p style={{ color: \"#4b5563\", marginTop: 0 }}\>\
  {/\* Design shows placeholder/lorem here \*/}\
  Porem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate
  libero et velit interdum.\
  \</p\>\
  \
  \<div style={{ display: \"grid\", gap: 10 }}\>\
  \<label style={{ display: \"flex\", gap: 10, alignItems:
  \"flex-start\", fontSize: 12 }}\>\
  \<input type=\"checkbox\" checked={stayLoggedIn} onChange={(e) =\>
  setStayLoggedIn(e.target.checked)} /\>\
  \<div\>\
  \<div style={{ fontWeight: 600 }}\>Stay logged in to my
  devices\</div\>\
  \<div style={{ color: \"#6b7280\" }}\>Short description here\</div\>\
  \</div\>\
  \</label\>\
  \
  \<label style={{ display: \"flex\", gap: 10, alignItems:
  \"flex-start\", fontSize: 12 }}\>\
  \<input type=\"checkbox\" checked={signOutOthers} onChange={(e) =\>
  setSignOutOthers(e.target.checked)} /\>\
  \<div\>\
  \<div style={{ fontWeight: 600 }}\>Sign out of all other
  devices\</div\>\
  \<div style={{ color: \"#6b7280\" }}\>Short description here\</div\>\
  \</div\>\
  \</label\>\
  \
  \<button onClick={onContinue} style={{ padding: 12, marginTop: 6 }}\>\
  Continue to Dashboard\
  \</button\>\
  \</div\>\
  \</AuthLayout\>\
  );\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **8) 2-Factor Authentication (2FA)**

## **8.1 What the design implies** 

The design includes a **phone number verification** concept tied to 2FA,
where the user receives an email containing a secure verification link.
The user is instructed not to share the link and can ignore it if they
didn't request it.

## **8.2 Verification email HTML (2FA)**

  ---------------------------------------------------------------------------------
  // templates/email/verify-phone-2fa.ts\
  export function verifyPhone2FAEmail(params: { firstName: string; verifyUrl:
  string }) {\
  const { firstName, verifyUrl } = params;\
  \
  return \`\
  \<div style=\"font-family: Arial, sans-serif; line-height:1.5;
  color:#111827;\"\>\
  \<p\>Dear \${firstName},\</p\>\
  \
  \<p\>\
  Tap the link below to verify your phone number for 2-factor authentication with
  Marketeq Projects:\
  \</p\>\
  \
  \<p\>\
  \<a href=\"\${verifyUrl}\" style=\"display:inline-block;padding:12px
  16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;\"\>\
  Verify Your Number\
  \</a\>\
  \</p\>\
  \
  \<p style=\"color:#6b7280;\"\>\
  If you didn\'t request this, please ignore this message. For your security, do
  not share this link with anyone.\
  \</p\>\
  \</div\>\
  \`;\
  }
  ---------------------------------------------------------------------------------

  ---------------------------------------------------------------------------------

# **9) Email Templates (ALL)**

# **9.1 Reset Password Email (Magic Link)**

  ---------------------------------------------------------------------------------
  // templates/email/reset-password.ts\
  export function resetPasswordEmail(params: { firstName: string; resetUrl: string;
  expiresHours?: number }) {\
  const { firstName, resetUrl, expiresHours = 24 } = params;\
  \
  return \`\
  \<div style=\"font-family: Arial, sans-serif; line-height:1.5;
  color:#111827;\"\>\
  \<p\>Dear \${firstName},\</p\>\
  \
  \<p\>\
  You have requested a password reset for your Marketeq Projects account.\
  Please click the button below to reset your password.\
  \</p\>\
  \
  \<p\>\
  \<a href=\"\${resetUrl}\" style=\"display:inline-block;padding:12px
  16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;\"\>\
  Reset Password\
  \</a\>\
  \</p\>\
  \
  \<p style=\"color:#6b7280;\"\>\
  This link will expire after \${expiresHours} hours. If you did not request a
  reset, please ignore this message.\
  \</p\>\
  \</div\>\
  \`;\
  }
  ---------------------------------------------------------------------------------

  ---------------------------------------------------------------------------------

## **9.2 Verify Your Account (Account Recovery Email)**

  ---------------------------------------------------------------------------------
  // templates/email/verify-account-recovery.ts\
  export function verifyAccountRecoveryEmail(params: { firstName: string;
  verifyUrl: string }) {\
  const { firstName, verifyUrl } = params;\
  \
  return \`\
  \<div style=\"font-family: Arial, sans-serif; line-height:1.5;
  color:#111827;\"\>\
  \<p\>Dear \${firstName},\</p\>\
  \
  \<p\>\
  Tap the link below to verify your phone number and recover your account with
  Marketeq Projects:\
  \</p\>\
  \
  \<p\>\
  \<a href=\"\${verifyUrl}\" style=\"display:inline-block;padding:12px
  16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;\"\>\
  Verify Your Account\
  \</a\>\
  \</p\>\
  \
  \<p style=\"color:#6b7280;\"\>\
  If you didn\'t request this, please ignore this message. For your security, do
  not share this link with anyone.\
  \</p\>\
  \</div\>\
  \`;\
  }
  ---------------------------------------------------------------------------------

  ---------------------------------------------------------------------------------

## **9.3 Verify Your Number (2FA Email)**

*(same template as Section 8.2, included here for completeness)*

  ---------------------------------------------------------------------------------
  // templates/email/verify-phone-2fa.ts\
  export function verifyPhone2FAEmail(params: { firstName: string; verifyUrl:
  string }) {\
  const { firstName, verifyUrl } = params;\
  \
  return \`\
  \<div style=\"font-family: Arial, sans-serif; line-height:1.5;
  color:#111827;\"\>\
  \<p\>Dear \${firstName},\</p\>\
  \
  \<p\>\
  Tap the link below to verify your phone number for 2-factor authentication with
  Marketeq Projects:\
  \</p\>\
  \
  \<p\>\
  \<a href=\"\${verifyUrl}\" style=\"display:inline-block;padding:12px
  16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;\"\>\
  Verify Your Number\
  \</a\>\
  \</p\>\
  \
  \<p style=\"color:#6b7280;\"\>\
  If you didn\'t request this, please ignore this message. For your security, do
  not share this link with anyone.\
  \</p\>\
  \</div\>\
  \`;\
  }
  ---------------------------------------------------------------------------------

  ---------------------------------------------------------------------------------

## **9.4 Password Created / Password Successfully Created Email**

  ---------------------------------------------------------------------------------
  // templates/email/password-created.ts\
  export function passwordCreatedEmail(params: { firstName: string; loginUrl:
  string; marketplaceUrl?: string }) {\
  const { firstName, loginUrl, marketplaceUrl } = params;\
  \
  return \`\
  \<div style=\"font-family: Arial, sans-serif; line-height:1.5;
  color:#111827;\"\>\
  \<p\>Dear \${firstName},\</p\>\
  \
  \<p\>\
  Your account password has been successfully created!\
  You can now log in to your Marketeq Projects account and start exploring.\
  \</p\>\
  \
  \<p\>\
  \<a href=\"\${loginUrl}\" style=\"display:inline-block;padding:12px
  16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;\"\>\
  Log In\
  \</a\>\
  \</p\>\
  \
  \${\
  marketplaceUrl\
  ? \`\<p style=\"margin-top:12px;\"\>\
  Or browse the Marketplace:\
  \<a href=\"\${marketplaceUrl}\"\>\${marketplaceUrl}\</a\>\
  \</p\>\`\
  : \"\"\
  }\
  \
  \<p style=\"color:#6b7280;\"\>\
  If you didn\'t request this, please contact support.\
  \</p\>\
  \</div\>\
  \`;\
  }
  ---------------------------------------------------------------------------------

  ---------------------------------------------------------------------------------

# **10) "Account Recovery" Screen Stub** 

# **10.1 Intent**

Design shows **"Start account recovery"** links as fallback when the
user can't access their email or doesn't receive reset emails. If you
don't yet have final UI for the recovery page, use a placeholder page so
navigation is consistent.

## **10.2 Placeholder page**

  -----------------------------------------------------------------------
  // app/auth/account-recovery/page.tsx\
  \"use client\";\
  import React from \"react\";\
  import { AuthLayout } from \"@/src/auth/components/AuthLayout\";\
  import { AUTH_ROUTES } from \"@/src/auth/routes\";\
  \
  export default function AccountRecoveryPage() {\
  return (\
  \<AuthLayout leftVariant=\"login\" title=\"Account recovery\"\>\
  \<p style={{ color: \"#4b5563\", marginTop: 0 }}\>\
  {/\* Replace with final recovery flow when available \*/}\
  Account recovery flow is in progress. Please contact support or follow
  the next steps provided by the product team.\
  \</p\>\
  \
  \<a href={AUTH_ROUTES.login} style={{ display: \"inline-flex\",
  padding: 12 }}\>\
  Back to Sign In\
  \</a\>\
  \</AuthLayout\>\
  );\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
