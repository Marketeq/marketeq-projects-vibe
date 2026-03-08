Got it. 💯 let's fix the **existing** auth setup without rewriting
anything.

## **✅ Here\'s What You Actually Need to Do**

You said:

> "All the login logic is in src/auth/ --- not in microservices."

That's fine. So let's **keep using it** --- we'll just fix the one thing
that broke when you moved to Render:

### **🔧 Problem: Your frontend is deployed on Vercel. Your backend (with login) is now on Render.**

So, the **cookies aren't being saved** because of:

- Missing credentials: true in CORS

- Incorrect cookie settings for cross-origin

- Possibly a missing domain or HTTPS requirement

## **✅ Fix It in 3 Steps --- No Rewrite**

### **✅ 1. In main.ts of your monolith**

****app.enableCors({

origin: \'https://marketeq-projects.vercel.app\',

credentials: true,

});

Make sure that **exact URL** is in the origin.

### **✅ 2. In your existing login controller (auth.controller.ts)**

Wherever you're calling res.cookie(\...), update it to:

res.cookie(\'accessToken\', token, {

httpOnly: true,

secure: true,

sameSite: \'None\',

domain: process.env.NODE_ENV === \'production\'

? \'marketeq-projects.vercel.app\'

: undefined,

path: \'/\',

});

✅ If you're not setting the cookie manually in the controller, you
**must do this now.** The frontend won't store it unless it's set with
these exact options.

### **✅ 3. In the frontend fetch**

****fetch(\'https://your-backend-on-render.com/auth/login\', {

method: \'POST\',

credentials: \'include\', // required for cross-origin cookies

\...

});

✅ If credentials: \'include\' is missing --- the cookie won't be
saved.

## **🔁 That's it.**

You **don't need to rebuild anything.** You just need:

- ✅ CORS to allow the Vercel domain

- ✅ Cookie to be cross-origin compatible

- ✅ Frontend to send/receive the cookie
