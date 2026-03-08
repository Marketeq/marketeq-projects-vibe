**Strapi Admin Preview Setup -- Native v5 Method**

This document walks through how to enable the **Preview** button inside
the Strapi admin panel using the official method introduced in **Strapi
v5+**. This allows admins to preview how the content will appear on the
frontend (e.g. a Next.js project detail page) before publishing. This is
the recommended, stable, and officially supported method for previewing
entries before publishing. No custom plugins are required.

### **✅ Requirements**

- Strapi v5 or later

- Your frontend supports previewing content via a /preview route (e.g.
  in Next.js)

- Environment variable for preview token security

### **1. Enable the Admin Preview Button**

Strapi v5 includes native support for preview buttons.

**Steps:**

1.  Create or update the file: ./src/admin/app.js

2.  Add the following configuration:

export default {

config: {

tutorials: false,

notifications: { releases: false },

preview: {

enabled: true,

contentTypes: \[

{

uid: \'api::project.project\',

draft: true,

url: (entry) =\> {

return
\`https://your-frontend-domain.com/preview?type=project&id=\${entry.id}\`

},

},

\],

},

},

bootstrap() {},

};

Replace https://your-frontend-domain.com with your actual frontend
domain (e.g. Vercel).

### **2. Create Secure Preview Route in Frontend (Next.js)**

Your frontend must support a secure /preview route.

**Example: /pages/api/preview.ts**

****export default async function handler(req, res) {

const { id, type, secret } = req.query;

if (secret !== process.env.PREVIEW_SECRET \|\| !id \|\| type !==
\'project\') {

return res.status(401).json({ message: \'Unauthorized\' });

}

res.setPreviewData({});

res.writeHead(307, { Location: \`/project/\${id}\` });

res.end();

}

> Set PREVIEW_SECRET in both frontend and Strapi .env files.

### **3. Configure .env in Strapi**

**Add to your Strapi .env file:**

****PREVIEW_SECRET=your_secure_token_here

Make sure this value matches the frontend's environment variable.

### **4. Triggering the Preview Button**

Once configured:

- Go to any **Project** entry in Strapi admin.

- A **Preview** button will appear in the top-right.

- Clicking it opens the frontend preview page with draft data.

### **✅ Best Practices**

- Use a long, unguessable PREVIEW_SECRET

- Never expose preview tokens in URLs sent externally

- Expire preview cookies on the frontend after rendering

- Handle 404/fallback behavior gracefully in the frontend
