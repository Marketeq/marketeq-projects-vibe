## **✅ Set the Access Token in a Secure Cookie After Google Login**

Here's what to do:

### **🔧 1. Wherever you call authGoogleService.loginWithGoogle(), wrap it like this:**

In your **Google login controller route**, modify it like this:

@Post(\'google/login\')

\@HttpCode(HttpStatus.OK)

async googleLogin(

\@Body() loginDto: AuthGoogleLoginDto,

\@Res({ passthrough: true }) res: Response,

) {

const { accessToken, refreshToken, tokenExpires, user } =

await this.authGoogleService.loginWithGoogle(loginDto);

res.cookie(\'accessToken\', accessToken, {

httpOnly: true,

secure: true,

sameSite: \'None\',

domain:

process.env.NODE_ENV === \'production\'

? \'marketeq-projects.vercel.app\'

: undefined,

path: \'/\',

});

return {

message: \'Login with Google successful\',

tokenExpires,

user,

};

}



### **✅ 2. (Optional but smart) Also store refresh token as cookie:**

****res.cookie(\'refreshToken\', refreshToken, {

httpOnly: true,

secure: true,

sameSite: \'None\',

domain:

process.env.NODE_ENV === \'production\'

? \'marketeq-projects.vercel.app\'

: undefined,

path: \'/\',

});

This is optional but helps with silent refresh logic.

### **✅ 3. Make Sure CORS and Cookie Config is Done**

You already know this part, just recapping:

// main.ts

app.enableCors({

origin: \'https://marketeq-projects.vercel.app\',

credentials: true,

});



## **✅ Summary**

  -------------------------------------------------------------
  **Task**                          **Done?**
  --------------------------------- ---------------------------
  Google login returns token?       ✅ Yes, from
                                    authGoogleService

  Controller sets cookie?           🛠 Add res.cookie(\...)
                                    wrapper

  Frontend sends credentials:       ✅ Needed
  \'include\'?                      

  CORS set correctly?               ✅ Needed for cookie to
                                    stick
  -------------------------------------------------------------
