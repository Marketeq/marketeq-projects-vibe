## **✅ How to Confirm if the Cookie is Working in Production**

### **🔧 Prerequisites**

- Use **Chrome** (or any Chromium-based browser like Brave or Edge)

- Go to: https://marketeq-projects.vercel.app/sign-in

### **✅ Step-by-Step Instructions**

#### **✅ 1. Open Chrome DevTools**

- Mac: Cmd + Option + I

- Windows: Ctrl + Shift + I

- Then click on the **Application** tab

#### **✅ 2. Check if the cookie was set after login**

- In DevTools → Application tab → left sidebar → **Storage → Cookies\**

- Click on https://marketeq-projects.vercel.app

✅ Look for a cookie named **accessToken**

- If it's **there**, the backend **successfully set the cookie\**

- If it's **missing**, the backend is not setting the cookie properly\
  (check for secure, sameSite, domain mismatch)

#### **✅ 3. Try refreshing a protected route (e.g. /dashboard)**

- After login, manually visit:

https://marketeq-projects.vercel.app/dashboard

✅ Then go to the **Network** tab in DevTools:

- Look for an API call like /auth/profile, /auth/me, etc.

- Click it and check the **Request Headers\**

➡️ Under **Request Headers**, confirm:

Cookie: accessToken=\...

If accessToken is being sent in the request, the browser is **sending
the cookie to the backend** --- that's good.

#### **✅ 4. Logout, then repeat steps 2 & 3**

After logout:

- Go to **Application → Cookies\**

- Confirm that accessToken is **gone\**

- Refresh /dashboard again

✅ You should see:

- 401 Unauthorized or Redirect to login

If the token **still works**, logout is not properly clearing the
cookie.

### **🔁 Recap**

  --------------------------------------------------------
  **Check**                   **What It Confirms**
  --------------------------- ----------------------------
  Cookie appears after login  ✅ Backend is setting it
                              correctly

  Cookie sent with protected  ✅ Frontend is sending it to
  request                     backend

  Cookie removed after logout ✅ Session is being cleared
                              properly

  401 on refresh after logout ✅ Token no longer valid
  --------------------------------------------------------
