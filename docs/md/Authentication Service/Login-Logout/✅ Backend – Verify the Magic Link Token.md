### **✅ Backend -- Verify the Magic Link Token**

Create a route like this in auth.controller.ts:

// GET /auth/verify-2fa?token=xxx

\@Get(\'verify-2fa\')

async verify2FAToken(@Query(\'token\') token: string) {

try {

const payload = this.jwtService.verify(token);

if (payload?.type !== \'2fa\') {

throw new UnauthorizedException(\'Invalid token type\');

}

await this.userService.update(payload.sub, {

twoFactorVerified: true,

});

return { success: true };

} catch (err) {

throw new UnauthorizedException(\'Invalid or expired token\');

}

}



### **✅ JWT Token Creation (in notification service or backend)**

When you send the email magic link, generate the token like this:

const token = this.jwtService.sign(

{ sub: userId, type: \'2fa\' },

{ expiresIn: \'24h\' }

);

Then include this in the link:

https://marketeq-projects.vercel.app/verify-2fa?token=\<token\>



### **✅ Frontend -- On /verify-2fa page**

In Next.js, use something like:

useEffect(() =\> {

const token = new
URLSearchParams(window.location.search).get(\'token\');

if (token) {

fetch(\`\${process.env.NEXT_PUBLIC_API_URL}/auth/verify-2fa?token=\${token}\`)

.then(res =\> res.json())

.then(() =\> {

// Optional: update session state, show success UI

router.push(\'/dashboard\'); // or wherever

})

.catch(() =\> {

// Show error message

});

}

}, \[\]);


