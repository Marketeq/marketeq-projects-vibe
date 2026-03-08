## **⚡ 1️⃣ Default token example**

So your /verify-2fa is ready to test without waiting for a real email
link.

In your **environment**, set:

{

\"key\": \"token\",

\"value\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\...\",

\"enabled\": true

}

✅ That token can be a sample valid JWT you create manually (or ask me
to generate for you with { sub: \'sampleUserId\', type: \'2fa\' }).

## **🔗 2️⃣ Auto-chain the login step to store cookies**

Postman **automatically saves cookies** from any request if you have
"Follow redirects" and "Cookie Jar" enabled (it's default behavior).\
So after you call /auth/login:

- Your accessToken cookie is saved

- Future calls to /auth/create-password, /auth/send-2fa-link,
  /auth/logout **reuse it automatically\**

✅ No extra scripting needed.

## **🪝 3️⃣ Optional: Use Postman tests to pull values into variables**

If you want to **auto-extract tokens or IDs from responses**, add this
to the **Tests** tab of your /auth/login request:

const jsonData = pm.response.json();

pm.environment.set(\"accessToken\", jsonData.accessToken);

(This only works if your backend also returns the token in the body ---
otherwise your secure cookies already handle it, which is best
practice.)

## **✅ TL;DR - Your Setup**

  -------------------------------------------------------------
  **Feature**             **What you do now**
  ----------------------- -------------------------------------
  Cookie-based session    ✅ Automatic with Postman cookie jar
                          after login

  Manual token check      ✅ Use {{token}} in the /verify-2fa
                          request

  Sample token for        ✅ Put a prebuilt JWT in environment
  testing                 

  Re-run /verify-2fa      ✅ Already works with the environment
  quickly                 variable
  -------------------------------------------------------------
