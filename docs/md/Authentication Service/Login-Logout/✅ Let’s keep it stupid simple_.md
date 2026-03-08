### **✅ Let's keep it stupid simple:**

You don't need to refactor **anything**.\
All you need to do now is:

### **🔧 Step 1. Wherever the Google login happens in the controller:**

Just **wrap the final result in this one line**:

res.cookie(\'accessToken\', accessToken, {

httpOnly: true,

secure: true,

sameSite: \'None\',

domain: process.env.NODE_ENV === \'production\' ?
\'marketeq-projects.vercel.app\' : undefined,

path: \'/\',

});

Same for LinkedIn (if using the same pattern).

### **🔧 Step 2. Do the same for email login (if it wasn't already done).**

### **🔧 Step 3. Check CORS and credentials: \'include\' as previously shown.**

That's it. No service rewrites. No file moves. No architecture changes.
