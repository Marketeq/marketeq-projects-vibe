# **DOCUMENT 13 -- GOOGLE OAUTH CREDENTIALS SETUP**

## **PURPOSE**

Guide you through creating a Google OAuth 2.0 Client ID and Secret for
NextAuth, and configuring your local .env so the sign-in flow works
without client_id errors.

## **PREREQUISITES**

• A Google account\
• Access to Google Cloud Console
([[https://console.cloud.google.com]{.underline}](https://console.cloud.google.com/))\
• A Next.js project with NextAuth configured

## **------------------------------------------------------------------------------------------------------------------------------------**

## **STEP 1 -- Open Google Cloud Console**

1.  Go to [[https://console.cloud.google.com\]{.underline}
    ](https://console.cloud.google.com/)

2.  Sign in with your Google account

## **------------------------------------------------------------------------------------------------------------------------------------**

## **STEP 2 -- Select or Create a Project**

1.  Click the project dropdown (top bar) → **New Project\**

2.  Enter **Project Name** (e.g. marketeq-nextauth)

3.  (Optional) Select your Organization

4.  Click **Create** and wait for provisioning

## **------------------------------------------------------------------------------------------------------------------------------------**

## **STEP 3 -- Configure OAuth Consent Screen**

1.  In the left nav, go to **APIs & Services** → **OAuth consent
    screen\**

2.  Choose **External** (public users) or **Internal** (G Suite only) →
    **Create\**

3.  Fill in:

    - **App name**: Marketeq NextAuth

    - **User support email**: your email

    - **Developer contact email**: your email

4.  Under **Authorized domains**, click **+ ADD DOMAIN** → enter
    localhost → **Save and Continue\**

5.  Skip Scopes and Test Users for now → **Save and Continue** → **Back
    to Dashboard\**

## **------------------------------------------------------------------------------------------------------------------------------------**

## **STEP 4 -- Create OAuth 2.0 Credentials**

1.  Go to **APIs & Services** → **Credentials** in the left nav

2.  Click **+ CREATE CREDENTIALS** → **OAuth client ID\**

3.  Select **Application type**: **Web application\**

4.  **Name**: NextAuth Google

5.  **Authorized JavaScript origins**:

    - Click **ADD URI** → http://localhost:3000

6.  **Authorized redirect URIs**:

    - Click **ADD URI** → http://localhost:3000/api/auth/callback/google

7.  Click **Create\**

## **------------------------------------------------------------------------------------------------------------------------------------**

## **STEP 5 -- Copy Client ID & Secret**

1.  After creation, a dialog shows your **Client ID** and **Client
    secret\**

2.  Click the copy icon for each value

## **------------------------------------------------------------------------------------------------------------------------------------**

## **STEP 6 -- Update Next.js .env**

In your Next.js project root, open or create .env.local (or .env if you
prefer) and add:

NEXTAUTH_URL=http://localhost:3000

NEXT_PUBLIC_GOOGLE_CLIENT_ID=\<Your Client ID here\>

NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=\<Your Client Secret here\>

• NEXTAUTH_URL must match your app's base URL.\
• Use NEXT_PUBLIC\_ prefix so the client library can access them.

## **------------------------------------------------------------------------------------------------------------------------------------**

## **STEP 7 -- Restart & Verify**

1.  Stop your Next.js dev server (Ctrl+C)

2.  Start it again:

npm run dev

3.  \
    Navigate to [[http://localhost:3000/sign-in\]{.underline}
    ](http://localhost:3000/sign-in)

4.  Click **Sign in with Google** → you should see Google's consent
    screen and be able to log in

## **------------------------------------------------------------------------------------------------------------------------------------**

## **TROUBLESHOOTING**

- **Redirect mismatch**:\
  • If Google complains about an invalid redirect URI, verify the URL
  exactly matches (/api/auth/callback/google).

- **Unauthorized_client**:\
  • Ensure your OAuth consent screen is published (at least in testing
  mode).

- **Values not loading**:\
  • Confirm you restarted the server after editing .env.local.\
  • Console-log process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID in
  next.config.js or a page to verify.

With these steps, your Google OAuth credentials will be correctly set up
and your /sign-in and /favorites pages should work without 401 or
missing-parameter errors.
