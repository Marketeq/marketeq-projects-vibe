**Login & Signup -- Local Development Fix Guide**

This guide ensures that all developers can run login/signup locally
without issues when working on other features.

### **1. Pull the Latest Code**

- Pull the latest code from the **main** branch.

- Ensure your feature branch is up to date with main.

### **2. Configure CORS in main.ts**

Make sure the origin property includes both production and local URLs:

app.enableCors({

origin: \[\'https://marketeq-projects.vercel.app\',
\'http://localhost:3000\'\],

credentials: true,

});



### **3. Cookie Settings**

Update cookie settings depending on the environment:

**Production (use in deployed code):**

****res.clearCookie(\'accessToken\', {

httpOnly: true,

secure: true,

sameSite: \'none\',

domain: \'marketeq-projects.vercel.app\',

path: \'/\',

});

**Local Development (use in local dev only):**

****res.clearCookie(\'accessToken\', {

httpOnly: true,

secure: false,

sameSite: \'lax\',

domain: \'localhost\',

path: \'/\',

});

Apply these changes in:

- auth.controller.ts (login function)

- auth.service.ts (logout function)

### **4. User Model Fix**

If you pulled the latest backend code, check:

**File:** src/user/interface/user.ts\
Replace:

import { Exclude } from \'class-transformer\';

\@Exclude({ toPlainOnly: true })

password?: string;

With:

import { Expose } from \'class-transformer\';

\@Expose()

password?: string;



### **5. User Entity Fix**

**File:**
src/user/infrastructure/persistence/relational/entities/user.entity.ts

Locate:

@Column({ nullable: true, default: null })

\@Exclude({ toPlainOnly: true }) // \<- Comment this line

password?: string;

Comment out the \@Exclude line to allow proper password handling.

### **6. Environment Variables**

Double-check that these variables are set correctly.

**Google Auth**

****GOOGLE_PROFILE_DATA_URL=

GOOGLE_CLIENT_ID=

GOOGLE_CLIENT_SECRET=

**LinkedIn Auth**

****LINKEDIN_API_URL=

LINKEDIN_CLIENT_ID=

LINKEDIN_CLIENT_SECRET=



### **7. Database Configuration**

**Production (.env on Render):**

****DATABASE_TYPE=postgres

DATABASE_URL=

DATABASE_HOST=

DATABASE_PORT=5432

DATABASE_USERNAME=marketeq_backend_db_user

DATABASE_PASSWORD=

DATABASE_NAME=marketeq_backend_db

DATABASE_SSL_ENABLED=true

DATABASE_SYNCHRONIZE=false

DATABASE_MAX_CONNECTIONS=10

**Local Development (.env.local):**

****DATABASE_TYPE=postgres

DATABASE_HOST=localhost

DATABASE_PORT=5432

DATABASE_USERNAME=postgres

DATABASE_PASSWORD=admin

DATABASE_NAME=marketeq_db

DATABASE_SSL_ENABLED=false

DATABASE_SYNCHRONIZE=true \# only enable locally

⚠️ Important: If using the production DB, always pull the latest code
before migrating. If not, login may fail.

✅ With these fixes in place, you should be able to log in and sign up
both locally and in production without any issues.
