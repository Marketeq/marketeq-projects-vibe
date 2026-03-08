# **🔐 Rebuilding Auth with HTTP-Only Cookies + SSR + Middleware**

## **🗂 File Structure**

****/pages

└─ /sign-in.tsx

└─ /index.tsx \# Protected home page

/api

└─ /login.ts \# Handles login

└─ /logout.ts \# Clears token

/lib

└─ /auth.ts \# JWT encode/decode helpers

/middleware.ts



## **1. 🔑 JWT Auth Helper (/lib/auth.ts)**

****// lib/auth.ts

import jwt from \"jsonwebtoken\"

const SECRET = process.env.JWT_SECRET \|\| \"your_jwt_secret\"

export function signAccessToken(payload: object, expiresIn = \"7d\") {

return jwt.sign(payload, SECRET, { expiresIn })

}

export function verifyAccessToken(token: string) {

return jwt.verify(token, SECRET)

}

✅ Add JWT_SECRET=your_strong_secret_key to your .env (and Vercel env
vars).

## **2. 📥 Login API -- Set Secure Cookie (/pages/api/login.ts)**

****// pages/api/login.ts

import { NextApiRequest, NextApiResponse } from \"next\"

import { signAccessToken } from \"@/lib/auth\"

import { serialize } from \"cookie\"

export default async function handler(req: NextApiRequest, res:
NextApiResponse) {

if (req.method !== \"POST\") return res.status(405).end()

const { email, password } = req.body

// 🔐 Replace this with real auth logic

if (email === \"admin@marketeq.ai\" && password === \"password123\") {

const accessToken = signAccessToken({ email, role: \"client\" })

res.setHeader(

\"Set-Cookie\",

serialize(\"accessToken\", accessToken, {

httpOnly: true,

secure: process.env.NODE_ENV === \"production\",

sameSite: \"strict\",

maxAge: 60 \* 60 \* 24 \* 7, // 7 days

path: \"/\",

})

)

return res.status(200).json({ message: \"Login success\" })

}

return res.status(401).json({ message: \"Invalid credentials\" })

}



## **3. 🔓 Logout API -- Clear Cookie (/pages/api/logout.ts)**

****// pages/api/logout.ts

import { NextApiRequest, NextApiResponse } from \"next\"

import { serialize } from \"cookie\"

export default function handler(req: NextApiRequest, res:
NextApiResponse) {

res.setHeader(

\"Set-Cookie\",

serialize(\"accessToken\", \"\", {

httpOnly: true,

secure: process.env.NODE_ENV === \"production\",

sameSite: \"strict\",

expires: new Date(0),

path: \"/\",

})

)

res.status(200).json({ message: \"Logged out\" })

}



## **4. 🧠 Protected Page via getServerSideProps (/pages/index.tsx)**

****// pages/index.tsx

import { GetServerSideProps } from \"next\"

import { verifyAccessToken } from \"@/lib/auth\"

export const getServerSideProps: GetServerSideProps = async ({ req })
=\> {

const token = req.cookies.accessToken

if (!token) {

return {

redirect: { destination: \"/sign-in\", permanent: false },

}

}

try {

const user = verifyAccessToken(token)

return { props: { user } }

} catch {

return {

redirect: { destination: \"/sign-in\", permanent: false },

}

}

}

export default function Home({ user }: { user: any }) {

return \<div\>Welcome {user.email}\</div\>

}



## **5. 🌐 Global Route Protection (/middleware.ts)**

****// middleware.ts

import { NextRequest, NextResponse } from \"next/server\"

import { verifyAccessToken } from \"@/lib/auth\"

const PUBLIC_PATHS = \[\"/sign-in\", \"/\_next\", \"/api\",
\"/favicon.ico\"\]

export function middleware(req: NextRequest) {

const { pathname } = req.nextUrl

if (PUBLIC_PATHS.some((p) =\> pathname.startsWith(p))) {

return NextResponse.next()

}

const token = req.cookies.get(\"accessToken\")?.value

if (!token) {

return NextResponse.redirect(new URL(\"/sign-in\", req.url))

}

try {

verifyAccessToken(token)

return NextResponse.next()

} catch {

return NextResponse.redirect(new URL(\"/sign-in\", req.url))

}

}



## **6. 🧾 Login Form (/pages/sign-in.tsx)**

****// pages/sign-in.tsx

import { useState } from \"react\"

import { useRouter } from \"next/router\"

export default function SignIn() {

const router = useRouter()

const \[email, setEmail\] = useState(\"\")

const \[password, setPassword\] = useState(\"\")

const \[error, setError\] = useState(\"\")

const handleSubmit = async (e: React.FormEvent) =\> {

e.preventDefault()

setError(\"\")

const res = await fetch(\"/api/login\", {

method: \"POST\",

headers: { \"Content-Type\": \"application/json\" },

body: JSON.stringify({ email, password }),

})

if (res.ok) {

router.push(\"/\")

} else {

const data = await res.json()

setError(data.message)

}

}

return (

\<form onSubmit={handleSubmit}\>

\<h1\>Sign In\</h1\>

{error && \<p style={{ color: \"red\" }}\>{error}\</p\>}

\<input

type=\"email\"

placeholder=\"Email\"

value={email}

onChange={(e) =\> setEmail(e.target.value)}

/\>\<br/\>

\<input

type=\"password\"

placeholder=\"Password\"

value={password}

onChange={(e) =\> setPassword(e.target.value)}

/\>\<br/\>

\<button type=\"submit\"\>Login\</button\>

\</form\>

)

}



## **✅ Final Notes**

  -----------------------------------------------------------
  **Feature**         **Description**
  ------------------- ---------------------------------------
  🧼 Stateless        No global auth context or js-cookie
  frontend            

  🔐 Secure login     All tokens stored server-side in
                      HTTP-only cookies

  🌍 SSR protected    getServerSideProps redirects if not
  pages               logged in

  🚦 Global           middleware.ts protects all pages
  enforcement         

  🧪 Easy to test     All logic lives in predictable,
                      inspectable layers
  -----------------------------------------------------------
