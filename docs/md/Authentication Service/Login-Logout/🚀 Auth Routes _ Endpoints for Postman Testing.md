# **🚀 Auth Routes / Endpoints for Postman Testing**

## **🔑 1. Login**

- **POST** /auth/login

- **Body:** (JSON)

{

\"email\": \"user@example.com\",

\"password\": \"password123!\"

}

- \
  ✅ Sets accessToken cookie on success

## **🔒 2. Create Password (after onboarding)**

- **POST** /auth/create-password

- **Headers:\**

****Cookie: accessToken=\...

- (automatically handled if Postman is set to store cookies)

- **Body:** (JSON)

{

\"password\": \"MyNewSecurePassword1!\"

}



## **📱 3. Send 2FA Magic Link**

- **POST** /auth/send-2fa-link

- **Headers:\**

****Cookie: accessToken=\...

- **Body:** (JSON)

{

\"phoneNumber\": \"+15551234567\"

}



## **🔗 4. Verify 2FA via Magic Link**

- **GET** /auth/verify-2fa?token=\<token\>

- You get \<token\> from the URL sent in the email.

- Makes the user's twoFactorVerified = true.

## **🚪 5. Logout**

- **POST** /auth/logout

- Clears the accessToken cookie.

✅ **Tip for Postman:**

- Make sure to enable "automatically follow redirects" and allow cookies
  so that once you login, Postman saves your cookie for subsequent
  requests.
