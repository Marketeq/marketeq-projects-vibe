**DOCUMENT 18 -- FRONTEND INTEGRATION: NEXTAUTH /me + JWT → /favorites**

**PURPOSE**\
Tie the logged-in user from NextAuth to backend favorites so the UI
shows the correct user's groups/items instead of an empty state. This
doc wires:

1.  NextAuth to issue a JWT access token to the browser

2.  A /me fetch that verifies the session and user id

3.  An API client that injects Authorization: Bearer

4.  Favorites pages and "star" buttons that always call the backend with
    the token

5.  Proper handling of 401/404 (redirect to sign-in)

**ASSUMPTIONS**\
• Next.js 13/14 app already running\
• NextAuth installed and Google OAuth configured\
• favorites-service is running on [[http://localhost:4003\]{.underline}
](http://localhost:4003/) • Your API gateway or direct calls to
favorites-service are allowed by CORS

REQUIRED ENVIRONMENT VARIABLES (frontend .env.local)\
NEXTAUTH_URL=[[http://localhost:3000\]{.underline}
](http://localhost:3000/) NEXTAUTH_SECRET=\
NEXT_PUBLIC_FAVORITES_API_URL=[[http://localhost:4003\]{.underline}
](http://localhost:4003/) GOOGLE_CLIENT_ID=\
GOOGLE_CLIENT_SECRET=

**STEP 1 --- NEXTAUTH CONFIG: EXPOSE accessToken ON THE CLIENT**\
File: src/pages/api/auth/\[\...nextauth\].ts (or
src/app/api/auth/\[\...nextauth\]/route.ts if using app router)

Add the jwt and session callbacks so the browser session contains an
accessToken we can send to the backend.

TypeScript example for pages router:\
import NextAuth from \"next-auth\";\
import GoogleProvider from \"next-auth/providers/google\";

export default NextAuth({\
providers: \[\
GoogleProvider({\
clientId: process.env.GOOGLE_CLIENT_ID!,\
clientSecret: process.env.GOOGLE_CLIENT_SECRET!,\
}),\
\],\
secret: process.env.NEXTAUTH_SECRET,\
session: { strategy: \"jwt\" },\
callbacks: {\
async jwt({ token, account, user }) {\
// When user logs in the first time, persist provider access_token; or
mint your own if you run a custom auth-service\
if (account?.access_token) {\
token.accessToken = account.access_token;\
}\
// If you have your own auth-service issuing a first-party JWT, set
token.accessToken to that value instead.\
// token.accessToken = await
exchangeGoogleForFirstPartyJWT(account.access_token)\
return token;\
},\
async session({ session, token }) {\
// expose the accessToken to the client\
(session as any).accessToken = token.accessToken;\
// also surface a stable user id if present on token\
if (token.sub) (session.user as any).id = token.sub;\
return session;\
},\
},\
});

If you use the app router, replicate the same callbacks in the NextAuth
handler for the route. The critical output is session.accessToken on the
client.

**STEP 2 --- API CLIENT THAT ALWAYS SENDS THE JWT**\
File: src/lib/api.ts

import axios from \"axios\";\
import { getSession } from \"next-auth/react\";

const API_BASE = process.env.NEXT_PUBLIC_FAVORITES_API_URL;

export async function createApiClient() {\
const session = await getSession();\
const token = (session as any)?.accessToken;\
return axios.create({\
baseURL: API_BASE,\
headers: {\
Authorization: token ? Bearer \${token} : \"\",\
\"Content-Type\": \"application/json\",\
},\
withCredentials: false,\
});\
}

STEP 3 --- /me FETCHER (OPTIONAL BUT HELPFUL)\
If your frontend expects to call /me for UI state, add a thin wrapper
that calls your auth-service /me. If you do not have an auth-service,
you can derive the user id from session directly and skip this step.

File: src/lib/authApi.ts

import axios from \"axios\";\
import { getSession } from \"next-auth/react\";

const AUTH_BASE = process.env.NEXT_PUBLIC_AUTH_API_URL \|\|
\"[[http://localhost:4001]{.underline}](http://localhost:4001/)\"; //
adjust if you have an auth-service

export async function fetchMe() {\
const session = await getSession();\
const token = (session as any)?.accessToken;\
const client = axios.create({\
baseURL: AUTH_BASE,\
headers: { Authorization: token ? Bearer \${token} : \"\" },\
});\
const { data } = await client.get(\"/me\");\
return data; // expected { id, email, \... }\
}

If you are not running an auth-service and don't expose /me, skip this
and rely on session.user.id (from NextAuth callbacks) as the user
identifier used by the backend JWT.

**STEP 4 --- FAVORITES API WRAPPERS**\
File: src/lib/favoritesApi.ts

import { createApiClient } from \"./api\";

export async function getFavoriteGroups() {\
const api = await createApiClient();\
const { data } = await api.get(\"/favorites\");\
return data; // array of groups\
}

export async function addFavorite(payload: { type: string; itemId:
string; groupId?: string }) {\
const api = await createApiClient();\
const { data } = await api.post(\"/favorites\", payload);\
return data;\
}

export async function moveFavorite(favoriteId: string, groupId: string)
{\
const api = await createApiClient();\
const { data } = await api.patch(/favorites/\${favoriteId}, { groupId
});\
return data;\
}

export async function removeFavorite(favoriteId: string) {\
const api = await createApiClient();\
await api.delete(/favorites/\${favoriteId});\
}

export async function createGroup(name: string, type?: string) {\
const api = await createApiClient();\
const { data } = await api.post(\"/favorites/groups\", { name, type });\
return data;\
}

export async function renameGroup(groupId: string, name: string) {\
const api = await createApiClient();\
const { data } = await api.patch(/favorites/groups/\${groupId}, { name
});\
return data;\
}

export async function deleteGroup(groupId: string) {\
const api = await createApiClient();\
await api.delete(/favorites/groups/\${groupId});\
}

**STEP 5 --- PROTECT FAVORITES PAGES (SSR OR CLIENT GUARD)**\
A. pages router with getServerSideProps\
File: src/pages/favorite-projects.tsx

import { getSession } from \"next-auth/react\";\
import FavoriteProjects from \"../modules/favorites/FavoriteProjects\";

export async function getServerSideProps(ctx: any) {\
const session = await getSession(ctx);\
if (!session?.accessToken) {\
return { redirect: { destination: \"/api/auth/signin\", permanent: false
} };\
}\
return { props: {} };\
}

export default function Page() {\
return ;\
}

B. app router guard (client component example)\
File: src/components/RequireAuth.tsx

\"use client\";\
import { useSession, signIn } from \"next-auth/react\";\
import { useEffect } from \"react\";

export default function RequireAuth({ children }: { children:
React.ReactNode }) {\
const { status } = useSession();\
useEffect(() =\> {\
if (status === \"unauthenticated\") signIn(); // redirect to NextAuth\
}, \[status\]);\
if (status !== \"authenticated\") return null;\
return \<\>{children}\</\>;\
}

**STEP 6 --- HOOK FOR FAVORITES DATA IN EXISTING UI**\
File: src/hooks/useFavorites.ts

import { useEffect, useState, useCallback } from \"react\";\
import {\
getFavoriteGroups,\
addFavorite,\
moveFavorite,\
removeFavorite,\
createGroup,\
renameGroup,\
deleteGroup,\
} from \"../lib/favoritesApi\";

export function useFavorites() {\
const \[groups, setGroups\] = useState\<any\[\]\>(\[\]);\
const \[loading, setLoading\] = useState(false);\
const \[error, setError\] = useState\<string \| null\>(null);

const refresh = useCallback(async () =\> {\
try {\
setLoading(true);\
setError(null);\
const g = await getFavoriteGroups();\
setGroups(g);\
} catch (e: any) {\
setError(e?.response?.status === 401 ? \"unauthorized\" :
\"fetch_failed\");\
} finally {\
setLoading(false);\
}\
}, \[\]);

useEffect(() =\> { refresh(); }, \[refresh\]);

return {\
groups, loading, error, refresh,\
add: async (type: string, itemId: string, groupId?: string) =\> { await
addFavorite({ type, itemId, groupId }); await refresh(); },\
move: async (favoriteId: string, groupId: string) =\> { await
moveFavorite(favoriteId, groupId); await refresh(); },\
remove: async (favoriteId: string) =\> { await
removeFavorite(favoriteId); await refresh(); },\
createGroup: async (name: string, type?: string) =\> { await
createGroup(name, type); await refresh(); },\
renameGroup: async (groupId: string, name: string) =\> { await
renameGroup(groupId, name); await refresh(); },\
deleteGroup: async (groupId: string) =\> { await deleteGroup(groupId);
await refresh(); },\
};\
}

**STEP 7 --- WIRE THE STAR BUTTON TO CALL addFavorite WITH JWT**\
Your UI already has a star/favorite button. Replace the onClick handler
with a call to addFavorite. Example:

File: src/components/AddFavoriteButton.tsx

import { useState } from \"react\";\
import { useFavorites } from \"../../hooks/useFavorites\";

export default function AddFavoriteButton({ type, itemId }: { type:
string; itemId: string }) {\
const { add } = useFavorites();\
const \[busy, setBusy\] = useState(false);

return (\
\<button\
disabled={busy}\
onClick={async () =\> {\
setBusy(true);\
try {\
await add(type, itemId); // omit groupId → backend assigns/creates\
} finally {\
setBusy(false);\
}\
}}\
aria-label=\"Save to favorites\"\
\>\
★\
\
);\
}

**STEP 8 --- ERROR HANDLING AND REDIRECTS**\
At a single place (e.g., in createApiClient response interceptors),
handle auth failures:

File: src/lib/api.ts (append after create)

export async function createApiClient() {\
const session = await getSession();\
const token = (session as any)?.accessToken;\
const instance = axios.create({\
baseURL: API_BASE,\
headers: { Authorization: token ? Bearer \${token} : \"\" },\
});

instance.interceptors.response.use(\
(r) =\> r,\
async (error) =\> {\
if (error?.response?.status === 401) {\
// Option 1: redirect to NextAuth sign-in\
// window.location.href = \"/api/auth/signin\";\
// Option 2: throw and let calling code show a banner\
}\
return Promise.reject(error);\
}\
);\
return instance;\
}

**STEP 9 --- BACKEND HEADERS AND CORS (VERIFY)**\
favorites-service must accept the Authorization header from the frontend
origin.

On favorites-service:\
• Ensure CORS enabled to
[[http://localhost:3000]{.underline}](http://localhost:3000/) with
credentials false (since we use Bearer headers).\
• Ensure your JWT guard reads Authorization: Bearer from headers and
sets req.user.sub.

If you use a gateway, either proxy /favorites transparently or set
NEXT_PUBLIC_FAVORITES_API_URL to the gateway's URL and permit the header
through.

**STEP 10 --- TEST PLAN**

1.  Sign out completely, then hit /favorite-projects → you should be
    redirected to NextAuth sign-in.

2.  Sign in with Google → confirm session.accessToken exists in the
    browser (check application tab or console via getSession()).

3.  Load /favorite-projects → Network tab should show:\
    a) GET /favorites with Authorization: Bearer\
    b) 200 response containing your groups or an empty array

4.  Click the star on any listing → POST /favorites with Authorization
    header; response 200; refresh groups; item appears under its
    assigned/created group.

5.  Refresh the page → groups and items persist (stored server-side by
    user id in JWT).

6.  Negative test: manually clear the Authorization header (e.g., edit
    code temporarily) → verify 401 is handled and you see either a
    sign-in prompt or an error banner.

**TROUBLESHOOTING**\
• 401 Unauthorized on /favorites:\
-- Session has no accessToken. Confirm callbacks in NextAuth are setting
session.accessToken.\
-- Your backend expects a first-party JWT signed with JWT_SECRET. If
you're sending the Google access_token directly, you must either
exchange it for your own JWT or make the backend accept Google tokens
and verify them with Google's JWKs. Easiest path: configure auth-service
to mint your own JWT at sign-in and store that as token.accessToken.\
• 404 on /me:\
-- Your frontend is calling an auth-service you haven't started. Either
run auth-service, change AUTH_BASE, or stop calling /me and read
session.user.id from NextAuth callbacks.\
• Empty state after successful POST:\
-- Ensure GET /favorites is called after addFavorite (refresh hook).\
-- Ensure Authorization header is present on GET as well as POST;
otherwise you're writing favorites for a user but reading as anonymous.\
• CORS errors:\
-- In favorites-service main.ts, enable CORS with origin:
[[http://localhost:3000]{.underline}](http://localhost:3000/) and
allowedHeaders including Authorization.

That's it. With these steps, the frontend will always pass a valid JWT,
the backend will scope favorites to the authenticated user, and your
/favorite-projects page will render the real saved items rather than the
empty state.
