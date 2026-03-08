# **🚀 Example Postman Test Script**

✅ **Place this in the Tests tab of your /auth/login request:**

****// Parse the JSON response

const jsonData = pm.response.json();

// If your backend also returns an access token in body (optional)

if (jsonData.accessToken) {

pm.environment.set(\"accessToken\", jsonData.accessToken);

}

// If your backend returns user object, you can extract fields

if (jsonData.user) {

pm.environment.set(\"userId\", jsonData.user.id);

pm.environment.set(\"hasPassword\", jsonData.user.hasPassword);

pm.environment.set(\"twoFactorVerified\",
jsonData.user.twoFactorVerified);

}

// Log for debugging

console.log(\"Saved accessToken, userId, hasPassword, twoFactorVerified
to environment.\");



✅ **Use this in the Tests tab of your /auth/send-2fa-link request:**

****pm.test(\"2FA link sent successfully\", function () {

pm.response.to.have.status(200);

});



✅ **Use this in the Tests tab of your /auth/verify-2fa request:**

****pm.test(\"2FA verified\", function () {

pm.response.to.have.status(200);

});



# **✅ What this gives you**

  -----------------------------------------------------------------------
  **Variable**                  **Description**
  ----------------------------- -----------------------------------------
  accessToken                   Can be used for headers if you do manual
                                Bearer tests

  userId                        If you need to test user-specific
                                endpoints

  hasPassword &                 For debugging multi-step onboarding
  twoFactorVerified             
  -----------------------------------------------------------------------
