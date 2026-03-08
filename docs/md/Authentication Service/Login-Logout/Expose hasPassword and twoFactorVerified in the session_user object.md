### **✅ 1. Expose hasPassword and twoFactorVerified in the session/user object**

Make sure your backend includes these two values when returning the user
after login.

return {

id: user.id,

email: user.email,

hasPassword: !!user.password,

twoFactorVerified: user.twoFactorVerified,

\...

};



### **✅ 2. Frontend logic to check and trigger modal**

Use the condition:

if (!user.hasPassword \|\| !user.twoFactorVerified) {

showSecurityModal();

}

Do this after login or session load.

### **✅ 3. Verify the phone number (in addition to sending magic link)**

You\'ll need a route like:

// POST /auth/verify-2fa

\@Post(\'verify-2fa\')

\@UseGuards(AuthGuard(\'jwt\'))

async verify2FA(@Req() req) {

await this.userService.update(req.user.id, { twoFactorVerified: true });

return { message: \'2FA verified\' };

}

The magic link page (/verify-2fa) should hit this endpoint after token
verification.

### **✅ 4. Hook the magic link page (/verify-2fa)**

This page should:

1.  Read the token from the URL

2.  Send it to the backend for verification

3.  Call the verify-2fa endpoint to mark the user as verified
