**In-App Time-Zone Management with Next.js, NextAuth & Prisma**

A zero-cost, all-in-one approach that embeds IANA time-zone detection
and real-time syncing directly into your Next.js/NextAuth user
service---no extra microservices required. Users' zones are updated on
each sign-in (and periodically while "travel mode" is active) using
their IP address and the open-source geoip-lite + geoip-timezone
packages.

## **1. Extend Your Prisma Schema**

In prisma/schema.prisma, add a nullable timeZone field:

model User {

id Int \@id \@default(autoincrement())

email String \@unique

password String

// ...other fields...

timeZone String? // ← new

}

Then run:

npx prisma migrate dev \--name add_user_timezone

npx prisma generate



## **2. Ensure a Prisma Client Singleton**

Create (or update) lib/prisma.ts:

import { PrismaClient } from \"@prisma/client\";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =

globalForPrisma.prisma \|\|

new PrismaClient({ log: \[\"query\", \"error\", \"warn\"\] });

if (process.env.NODE_ENV !== \"production\") globalForPrisma.prisma =
prisma;



## **3. Install Dependencies**

****npm install \@prisma/client prisma

npm install next-auth \@next-auth/prisma-adapter geoip-lite
geoip-timezone



## **4. Configure NextAuth to Detect & Persist Time Zone**

In pages/api/auth/\[\...nextauth\].ts:

import NextAuth from \"next-auth\";

import CredentialsProvider from \"next-auth/providers/credentials\";

import { PrismaAdapter } from \"@next-auth/prisma-adapter\";

import { prisma } from \"../../../lib/prisma\";

import geoip from \"geoip-lite\";

import geoipTz from \"geoip-timezone\";

export default NextAuth({

adapter: PrismaAdapter(prisma),

session: { strategy: \"jwt\" },

providers: \[

CredentialsProvider({

name: \"Email+Password\",

credentials: {

email: { label: \"Email\", type: \"email\" },

password: { label: \"Password\", type: \"password\" },

},

async authorize(credentials, req) {

if (!credentials) return null;

// 1) Verify user & password

const user = await prisma.user.findUnique({ where: { email:
credentials.email } });

if (!user \|\| !verifyHash(credentials.password, user.password)) {

return null;

}

// 2) Lookup IP → geo → IANA time zone

const ip = (req.headers\[\"x-forwarded-for\"\] as
string)?.split(\",\")\[0\]

\|\| req.socket.remoteAddress!;

const geo = geoip.lookup(ip);

let tz = user.timeZone;

if (geo) {

tz = geoipTz.lookup(ip) \|\| tz;

// 3) Persist if changed

if (tz !== user.timeZone) {

await prisma.user.update({ where: { id: user.id }, data: { timeZone: tz
} });

}

}

// 4) Return user payload

return { id: user.id.toString(), email: user.email, timeZone: tz };

},

}),

\],

callbacks: {

async jwt({ token, user }) {

if (user?.timeZone) token.timeZone = user.timeZone;

return token;

},

async session({ session, token }) {

if (token.timeZone) session.user.timeZone = token.timeZone as string;

return session;

},

},

});

> **Note:** Replace verifyHash() with your bcrypt/argon2 verification
> logic.

## **5. Expose a "Refresh-Timezone" Endpoint**

Create pages/api/user/update-timezone.ts:

import { getSession } from \"next-auth/react\";

import type { NextApiHandler } from \"next\";

import { prisma } from \"../../../lib/prisma\";

import geoip from \"geoip-lite\";

import geoipTz from \"geoip-timezone\";

const handler: NextApiHandler = async (req, res) =\> {

if (req.method !== \"PATCH\") return res.status(405).end();

const session = await getSession({ req });

if (!session?.user?.email) return res.status(401).end();

// Detect via IP

const ip = (req.headers\[\"x-forwarded-for\"\] as
string)?.split(\",\")\[0\]

\|\| req.socket.remoteAddress!;

const geo = geoip.lookup(ip);

const newTz = geo ? geoipTz.lookup(ip) : session.user.timeZone;

// Update if changed

if (newTz && newTz !== session.user.timeZone) {

await prisma.user.update({

where: { email: session.user.email },

data: { timeZone: newTz },

});

}

return res.json({ timeZone: newTz });

};

export default handler;



## **6. Auto-Sync in Your Next.js App**

In pages/\_app.tsx (or your main layout):

import { SessionProvider, useSession } from \"next-auth/react\";

import { useEffect } from \"react\";

function TZSync() {

const { data: session, update } = useSession();

useEffect(() =\> {

if (!session) return;

let isActive = true;

const sync = async () =\> {

const res = await fetch(\"/api/user/update-timezone\", { method:
\"PATCH\" });

if (!isActive \|\| !res.ok) return;

const { timeZone } = await res.json();

update({ \...session, user: { \...session.user, timeZone } });

};

// Initial + every 5 minutes

sync();

const id = setInterval(sync, 5 \* 60 \* 1000);

return () =\> { isActive = false; clearInterval(id); };

}, \[session, update\]);

return null;

}

export default function App({ Component, pageProps }) {

return (

\<SessionProvider session={pageProps.session}\>

\<TZSync /\>

\<Component {\...pageProps} /\>

\</SessionProvider\>

);

}



## **Why This Works**

- **All-in-One Service**: Lives entirely in your Next.js/NextAuth
  layer---no extra microservice overhead.

- **Global & Free**: Uses MIT-licensed geoip-lite + geoip-timezone,
  powered by client IP lookups only.

- **Real-Time Travel Mode**: Syncs on sign-in and at configurable
  intervals (e.g., every 5 minutes).

- **Immediate Access**: Available everywhere via session.user.timeZone
  in your app.
