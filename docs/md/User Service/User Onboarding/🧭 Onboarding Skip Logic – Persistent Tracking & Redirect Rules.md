# **🧭 Onboarding Skip Logic -- Persistent Tracking & Redirect Rules**

## **🎯 Objective**

Ensure that:

- ✅ Users can skip **some**, **all**, or **none** of the onboarding
  steps.

- ✅ Once the user **accesses their dashboard**, onboarding is
  **permanently marked as \"completed/skipped\"**.

- ✅ Users are **never redirected back to onboarding**.

- ✅ Incomplete information can be filled out later via **User
  Settings** or **Profile Editor**.

- ✅ Skipped onboarding is tracked in the **database**, and the flag is
  only set **once**.

## **🗃️ 1. Database Schema**

### **✅ Add new field to users table:**

****ALTER TABLE users ADD COLUMN onboarding_dismissed BOOLEAN DEFAULT
FALSE;

> This field is set to TRUE once the user reaches the dashboard after
> onboarding, regardless of how much they filled in.

## **🔐 2. Backend: Authenticated API Endpoint**

### **/api/users/me/dismiss-onboarding.ts**

****// PATCH /api/users/me/dismiss-onboarding

import { NextApiRequest, NextApiResponse } from \"next\"

import { getUserFromRequest } from \"@/lib/auth\" // your session/token
parser

import { prisma } from \"@/lib/db\" // or your ORM

export default async function handler(req: NextApiRequest, res:
NextApiResponse) {

if (req.method !== \"PATCH\") return res.status(405).end()

const user = await getUserFromRequest(req)

if (!user) return res.status(401).json({ error: \"Unauthorized\" })

await prisma.user.update({

where: { id: user.id },

data: { onboarding_dismissed: true },

})

return res.status(200).json({ success: true })

}



## **🎛️ 3. Frontend Skip Logic (Per-Screen)**

### **🧩 Example from an Onboarding Screen Component**

****const handleSkip = async () =\> {

// Optional: save partial input here

// Call dismiss endpoint (only once)

await fetch(\"/api/users/me/dismiss-onboarding\", {

method: \"PATCH\",

headers: { \"Content-Type\": \"application/json\" },

})

router.push(\"/\") // Go to dashboard or home

}

> You should call this API from **any onboarding screen's Skip button**
> --- even if user skipped only one screen.

## **🧠 4. Final Redirect Logic (Middleware or SSR)**

### **🧰 Use in middleware.ts or getServerSideProps**

****import { verifyAccessToken } from \"@/lib/auth\"

import { getUserFromToken } from \"@/lib/db\"

export async function middleware(req: NextRequest) {

const { pathname } = req.nextUrl

const token = req.cookies.get(\"accessToken\")?.value

if (!token) {

return NextResponse.redirect(new URL(\"/sign-in\", req.url))

}

try {

const user = await getUserFromToken(token)

// Force onboarding only if NOT dismissed AND route is not onboarding

if (!user.onboarding_dismissed && !pathname.startsWith(\"/onboarding\"))
{

return NextResponse.redirect(new URL(\"/onboarding\", req.url))

}

// If user HAS dismissed onboarding but tries to manually revisit it,
redirect away

if (user.onboarding_dismissed && pathname.startsWith(\"/onboarding\")) {

return NextResponse.redirect(new URL(\"/\", req.url))

}

return NextResponse.next()

} catch {

return NextResponse.redirect(new URL(\"/sign-in\", req.url))

}

}

> This ensures onboarding is **only shown to first-time users** and
> **never shown again** after dismissal.

## **🔁 5. Resuming Incomplete Onboarding Later (User Settings)**

Any skipped fields should be editable later in user settings:

// User Settings page

\<Input name=\"location\" defaultValue={user.location \|\| \"\"} /\>

\<Input name=\"jobTitle\" defaultValue={user.jobTitle \|\| \"\"} /\>

Use conditional logic in UI:

{!user.location && (

\<span className=\"text-warning\"\>You haven't added a location
yet\</span\>

)}



## **✅ 6. UX Rules Summary**

  --------------------------------------------------------------------
  **Behavior**                      **Result**
  --------------------------------- ----------------------------------
  Skipped 1+ onboarding screens     Triggers onboarding_dismissed =
                                    true

  Skipped nothing but clicked       Still marks onboarding_dismissed =
  \"skip\"                          true

  Filled out everything manually    Doesn\'t need to skip; onboarding
                                    still dismissed

  Visits /onboarding later manually Redirected to / (blocked from
                                    going back)

  Reaches dashboard                 System marks onboarding as
                                    dismissed if not already

  Can edit skipped fields later     ✅ In Settings or Profile page
  --------------------------------------------------------------------

## **🔒 7. Security Notes**

- Do **not** let users override onboarding_dismissed from the client.

- Ensure the PATCH /dismiss-onboarding route is **authenticated** and
  only callable by the user.

## **🧪 8. Testing Scenarios**

  -------------------------------------------------------------------
  **Test Case**                  **Expected Result**
  ------------------------------ ------------------------------------
  User fills in 1 screen, skips  Accesses dashboard normally
  the rest                       

  User skips everything from the Never sees onboarding again
  start                          

  User completes all onboarding  Goes to dashboard, never sees
                                 onboarding again

  User manually visits           Redirected to /
  /onboarding later              

  User visits dashboard after    No onboarding redirection
  skip                           

  User reloads dashboard after   No onboarding redirection
  skip                           
  -------------------------------------------------------------------
