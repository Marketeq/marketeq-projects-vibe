**Integrating Read-Only Time Zone into the Talent Profile**

Wire your existing Next.js front-end to your User Service so the
timeZone field shows up in the talent profile---using a single, simple
client-side fetch.

### **1. Backend: Ensure the User-Me Endpoint Returns timeZone**

If it isn't already in place, create or update **pages/api/user/me.ts**
in your Next.js/NextAuth service:

// pages/api/user/me.ts

import { getSession } from \"next-auth/react\";

import type { NextApiHandler } from \"next\";

import { prisma } from \"../../../lib/prisma\";

const handler: NextApiHandler = async (req, res) =\> {

const session = await getSession({ req });

if (!session?.user?.email) {

return res.status(401).json({ error: \"Not authenticated\" });

}

const user = await prisma.user.findUnique({

where: { email: session.user.email },

select: {

id: true,

name: true,

email: true,

timeZone: true, // ← make sure this is included!

// ...other profile fields...

},

});

if (!user) return res.status(404).json({ error: \"User not found\" });

return res.json(user);

};

export default handler;



### **2. Front-End: Fetch & Display with SWR**

Install SWR (if you haven't already):

npm install swr

In your talent-profile page---e.g. **pages/talent/\[id\].tsx**---fetch
the current user and render the timeZone:

// pages/talent/\[id\].tsx

import useSWR from \"swr\";

type User = {

id: number;

name: string;

email: string;

timeZone: string \| null;

// ...other fields

};

const fetcher = (url: string) =\> fetch(url).then(res =\> res.json());

export default function TalentProfile() {

// Fetch current user from \*this\* same service

const { data: user, error } = useSWR\<User\>(\"/api/user/me\", fetcher);

if (error) return \<p className=\"p-4 text-red-500\"\>Failed to load
profile.\</p\>;

if (!user) return \<p className=\"p-4\"\>Loading profile...\</p\>;

return (

\<div className=\"max-w-xl mx-auto my-8 p-6 bg-white rounded shadow\"\>

\<h1 className=\"text-2xl font-semibold mb-4\"\>{user.name}\</h1\>

{/\* ...existing profile info... \*/}

\<div className=\"flex justify-between mt-4\"\>

\<span className=\"font-medium\"\>Time Zone:\</span\>

\<span\>{user.timeZone ?? \"Unknown\"}\</span\>

\</div\>

\</div\>

);

}

- This calls **/api/user/me** on your own User Service---no separate
  microservice or third-party.

- The time zone is **read-only**, so users can't override it.

### **3. Verify**

1.  **Log in** as a test user behind different IPs (or via VPN).

2.  **Visit** the talent profile page---confirm the displayed zone
    matches the user's actual location (America/New_York, Europe/Paris,
    etc.).

3.  **Travel mode** (after your background sync runs), refresh and
    ensure the timeZone updates automatically.
