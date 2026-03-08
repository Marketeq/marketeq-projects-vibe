# **✅ page.tsx (for your dashboard or home)**

****\'use client\';

import { useEffect, useState } from \'react\';

import { useUser } from \'@/hooks/useUser\'; // adjust to your actual
session hook

import SecuritySettingsModal from
\'@/components/security-setting.stories\'; // adjust import to your real
component path

import { useRouter } from \'next/navigation\';

export default function DashboardPage() {

const { user, loading } = useUser();

const \[showSecurityModal, setShowSecurityModal\] = useState(false);

const router = useRouter();

useEffect(() =\> {

if (!loading && user) {

if (!user.hasPassword \|\| !user.twoFactorVerified) {

setShowSecurityModal(true);

}

}

}, \[user, loading\]);

return (

\<\>

\<div\>

\<h1\>Welcome to Your Dashboard\</h1\>

{/\* your normal dashboard content \*/}

\</div\>

{showSecurityModal && (

\<SecuritySettingsModal

user={user}

onComplete={() =\> {

setShowSecurityModal(false);

router.refresh(); // optional, reload user session data after modal
completes

}}

/\>

)}

\</\>

);

}



# **🚀 Usage notes:**

✅ **useUser()** is assumed to load { user, loading } with hasPassword
and twoFactorVerified.\
✅ **SecuritySettingsModal** is your existing modal UI from
security-setting.stories.tsx.\
✅ onComplete closes the modal (and optionally refreshes session state).

✅ **Done.\**
You can copy & paste this file to your dashboard/home page, adjust the
imports, and you're fully integrated.
