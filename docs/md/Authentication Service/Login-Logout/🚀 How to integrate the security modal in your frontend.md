# **🚀 How to integrate the security modal in your frontend**

## **🔍 Where should you integrate it?**

✅ You typically place this logic at the **top of your main dashboard or
home page** (i.e. your page.tsx for /dashboard or /home), **NOT** in the
Storybook stories file.

In your case since you tested it at:

marketeq-projects\\app\\(group)\\(group)\\page.tsx

✅ That is **correct for a temporary test**, but for real use:

✅ **Move it to wherever your main authenticated home/dashboard screen
is rendered**, since that's the first screen after login.

## **⚙️ How should you call it?**

### **✅ 1. Load user session info**

This is typically done using:

- getServerSideProps if using Next.js pages

- or useSession / useUser hook if using NextAuth or your own session
  loader

✅ You need to ensure hasPassword and twoFactorVerified are loaded into
the frontend context.

Example:

const { user } = useUser(); // however your app loads it



### **✅ 2. Trigger the modal if user needs to finish security setup**

****useEffect(() =\> {

if (user && (!user.hasPassword \|\| !user.twoFactorVerified)) {

setShowSecurityModal(true);

}

}, \[user\]);



### **✅ 3. Render the modal conditionally**

****\<\>

\<YourDashboardComponents /\>

{showSecurityModal && (

\<SecuritySettingsModal

onComplete={() =\> setShowSecurityModal(false)}

/\>

)}

\</\>

✅ Replace SecuritySettingsModal with your actual
security-setting.stories.tsx export (likely renamed to a real
SecuritySettings component).

## **📦 Typical placement in your /dashboard/page.tsx:**

****\'use client\';

import { useUser } from \'@/hooks/useUser\'; // or your own session hook

import { useEffect, useState } from \'react\';

import SecuritySettingsModal from
\'@/components/SecuritySettingsModal\';

export default function DashboardPage() {

const { user } = useUser();

const \[showSecurityModal, setShowSecurityModal\] = useState(false);

useEffect(() =\> {

if (user && (!user.hasPassword \|\| !user.twoFactorVerified)) {

setShowSecurityModal(true);

}

}, \[user\]);

return (

\<\>

\<div\>

{/\* Your dashboard UI \*/}

\</div\>

{showSecurityModal && (

\<SecuritySettingsModal

onComplete={() =\> setShowSecurityModal(false)}

/\>

)}

\</\>

);

}



## **✅ Short checklist for devs**

✅ Session load must include hasPassword and twoFactorVerified.\
✅ Use a simple useEffect to decide when to show.\
✅ Keep modal inside the dashboard page so it always pops up right after
login.
