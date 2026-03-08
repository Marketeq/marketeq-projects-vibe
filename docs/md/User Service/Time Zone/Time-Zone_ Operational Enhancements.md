**Time-Zone: Operational Enhancements**

## **1. Trust-Proxy Setup (Custom Next.js Server)**

## Make sure your Next.js app (and any custom server or proxy like Render) is set to trust the X-Forwarded-For header so you're not getting the internal proxy IP. 

## In a custom Express/Nest harness you'd do something like app.set(\'trust proxy\', true). In Vercel/Render it's usually already handled, but double-check in staging. 

****// server.js

const express = require(\'express\');

const next = require(\'next\');

const dev = process.env.NODE_ENV !== \'production\';

const port = process.env.PORT \|\| 3000;

const app = next({ dev });

const handle = app.getRequestHandler();

app.prepare().then(() =\> {

const server = express();

// Trust X-Forwarded-For so req.ip is the user's IP

server.set(\'trust proxy\', true);

server.all(\'\*\', (req, res) =\> handle(req, res));

server.listen(port, (err) =\> {

if (err) throw err;

console.log(\`\> Ready on http://localhost:\${port}\`);

});

});



## **2. TypeScript Types for NextAuth** Extend NextAuth's Session and JWT types so session.user.timeZone is strongly typed:

****// types/next-auth.d.ts

import NextAuth from \"next-auth\";

declare module \"next-auth\" {

interface Session {

user: {

name?: string;

email: string;

timeZone: string;

// ...other custom fields

};

}

interface JWT {

timeZone?: string;

}

}



## **3. Env & Deployment Configuration**

## Add NEXTAUTH_URL in your production env to match your domain (needed by NextAuth). 

## For Prisma: ensure you run your migrations in CI/CD (npx prisma migrate deploy) so that the timeZone column exists in prod before you rollout. 

****\# .env.local

NEXTAUTH_URL=https://yourdomain.com

DATABASE_URL=postgresql://user:pass@host:5432/dbname

LOG_LEVEL=info



// package.json (scripts section)

{

\"scripts\": {

\"migrate:dev\": \"prisma migrate dev \--name add_user_timezone\",

\"migrate:prod\": \"prisma migrate deploy\",

\"start:server\": \"node server.js\"

}

}



## **4. Fallback & Overrides Utility**

If the geo lookup ever fails (private IP, missing data), fall back to
the browser's Intl.DateTimeFormat().resolvedOptions().timeZone or let
the user correct it once in their profile.

Exposing an editable "Time Zone" field in user settings gives end users
a safety valve.

****// utils/detectTimeZone.ts

export function detectTimeZone(): string {

if (typeof Intl !== \"undefined\") {

return Intl.DateTimeFormat().resolvedOptions().timeZone;

}

return \"UTC\";

}



## **5. Automated Testing Examples**

**Unit tests** for your /api/user/update-timezone endpoint (mocking
geoip.lookup).

**Integration tests** for the NextAuth authorize flow (e.g. with
supertest) to verify that logging in from different IPs updates the DB
as expected.

****// tests/update-timezone.test.ts

import request from \"supertest\";

import handler from \"../pages/api/user/update-timezone\";

describe(\"PATCH /api/user/update-timezone\", () =\> {

it(\"returns 401 when unauthenticated\", async () =\> {

const res = await request(handler).patch(\"/\");

expect(res.statusCode).toBe(401);

});

// You can mock getSession and geoip.lookup here for authenticated tests

});



## **6. Monitoring & Logging**

Log lookup successes/failures and DB-update errors to your
logging/monitoring system (Sentry, Datadog, etc.) to catch any
geo-lookup bottlenecks or spikes.

Consider caching lookups for hot IPs in-memory or via Redis if you see
repeated calls.

****// lib/logger.ts

import pino from \"pino\";

export const logger = pino({

level: process.env.LOG_LEVEL \|\| \"info\",

});



// pages/api/user/update-timezone.ts (excerpt)

import { logger } from \"../../../lib/logger\";

// ...

if (newTz && newTz !== session.user.timeZone) {

logger.info(\`Updating TZ for \${session.user.email} → \${newTz}\`);

await prisma.user.update({ /\* ... \*/ });

}

// On error:

// logger.error(\`Failed TZ update for \${session.user.email}\`, error);



## **7. Date/Time Formatting Utility**

If you have global formatting utilities, inject timeZone into a single
formatDate() helper (as shown) so you don't accidentally format
somewhere without the zone.

****// utils/formatDate.ts

import { format, utcToZonedTime } from \"date-fns-tz\";

export function formatForUser(

date: Date \| string,

timeZone: string,

fmt = \"yyyy-MM-dd HH:mm zzz\"

): string {

const d = typeof date === \"string\" ? new Date(date) : date;

const zoned = utcToZonedTime(d, timeZone);

return format(zoned, fmt, { timeZone });

}



## **8. Documentation & Onboarding Snippet**

Update your internal README or docs site with a short "Time-Zone
Support" section so future devs know about the TZSync hook, the new API
routes, and the Prisma field.

****\### Time-Zone Support

\- \*\*DB Schema\*\*

\- \`User.timeZone: String?\`

\- \*\*API Routes\*\*

\- \`POST /api/auth/register\` → sets initial \`timeZone\`

\- \`.../api/auth/\[\...nextauth\]\` authorize callback → updates on
login

\- \`PATCH /api/user/update-timezone\` → background "travel-mode" sync

\- \*\*Client\*\*

\- \`TZSync\` component in \`\_app.tsx\`

\- \`detectTimeZone()\` & \`formatForUser()\` utils

\- \*\*Testing & Monitoring\*\*

\- Jest/Supertest examples in \`tests/\`

\- Pino logger in \`lib/logger.ts\`

\- \*\*Deployment\*\*

\- Trust proxy in \`server.js\`

\- Env vars in \`.env.local\`

\- Prisma migrations via \`npm run migrate:prod\`


