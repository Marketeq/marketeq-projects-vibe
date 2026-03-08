# **📄 Strapi Admin Preview Setup -- Native v5 Method**

This guide walks through how to add a frontend preview link for content
entries inside the Strapi admin panel using **Strapi v5 native preview
functionality**. It assumes Strapi is already deployed on Render and
connected to its own Postgres database (not shared with NestJS). This
guide covers **only preview button functionality**, using the officially
supported config/admin.ts method introduced in v5+. No plugins are
required.

## **✅ Requirements**

- Strapi v5 or later

- Frontend deployed (e.g. Vercel) with /preview API route

- Environment variable: PREVIEW_SECRET

- Domain-based FRONTEND_URL must be defined

- Frontend must support **dynamic routing** for each content type using
  **slug-based URLs\**

## **✅ 1. Enable Native Preview Support in Strapi v5**

Create or update the Strapi preview config.

### **📁 File: config/admin.ts**

****import { env } from \'@strapi/utils\';

export default {

preview: {

enabled: true,

config: {

allowedOrigins: \[env(\'FRONTEND_URL\')\],

async handler(uid, { documentId }) {

const doc = await strapi.entityService.findOne(uid, documentId, {

populate: \[\'slug\'\],

});

switch (uid) {

case \'api::project.project\':

return
\`\${env(\'FRONTEND_URL\')}/api/preview?type=project&slug=\${doc.slug}&secret=\${env(\'PREVIEW_SECRET\')}\`;

case \'api::service.service\':

return
\`\${env(\'FRONTEND_URL\')}/api/preview?type=service&slug=\${doc.slug}&secret=\${env(\'PREVIEW_SECRET\')}\`;

case \'api::job.job\':

return
\`\${env(\'FRONTEND_URL\')}/api/preview?type=job&slug=\${doc.slug}&secret=\${env(\'PREVIEW_SECRET\')}\`;

case \'api::team.team\':

return
\`\${env(\'FRONTEND_URL\')}/api/preview?type=team&slug=\${doc.slug}&secret=\${env(\'PREVIEW_SECRET\')}\`;

case \'api::talent-profile.talent-profile\':

return
\`\${env(\'FRONTEND_URL\')}/api/preview?type=talent&slug=\${doc.slug}&secret=\${env(\'PREVIEW_SECRET\')}\`;

default:

console.warn(\'Unsupported UID passed to preview handler:\', uid);

throw new Error(\`Preview not configured for content type: \${uid}\`);

}

},

},

},

};

### **✅ Example .env**

****FRONTEND_URL=https://www.marketeq-projects.com

PREVIEW_SECRET=secure_long_token_here

> 🔐 Use an unguessable secret string --- required in both Strapi and
> frontend environments.

## **🔁 2. Rebuild Strapi Admin**

Any changes to admin.ts require a full rebuild:

npm run build && npm run start

Once built, the **Preview** button will appear on all configured
content types (Project, Service, Job, Team, Talent Profile).

## **▶️ 3. How to Trigger the Preview Button**

1.  Log into the Strapi Admin Panel

2.  Go to any configured content type

3.  Open a draft or published entry

4.  Click the **Preview** button at the top-right

5.  The frontend opens in a new tab using
    /api/preview?slug=\...&type=\...&secret=\...

6.  You\'ll be redirected to /\[type\]/\[slug\] using preview mode

## **🧪 4. Add /api/preview.ts Route (Next.js)**

****// pages/api/preview.ts

export default function handler(req, res) {

const { slug, type, secret } = req.query;

if (secret !== process.env.PREVIEW_SECRET \|\| !slug \|\| !type) {

console.warn(\'Unauthorized preview attempt\', req.query);

return res.status(401).json({ message: \'Unauthorized\' });

}

res.setPreviewData({}, { maxAge: 3600 });

const path = (() =\> {

switch (type) {

case \'project\': return \`/project/\${slug}\`;

case \'service\': return \`/service/\${slug}\`;

case \'job\': return \`/job/\${slug}\`;

case \'team\': return \`/team/\${slug}\`;

case \'talent\': return \`/talent/\${slug}\`;

default:

console.warn(\'Unsupported preview type:\', type);

return \'/\';

}

})();

res.writeHead(307, { Location: path });

res.end();

}

> 💡 Redirects to the correct detail route based on slug and content
> type.

## **🧩 5. Frontend Dynamic Routing (Required)**

You **must** use getServerSideProps to support preview mode.

### **✅ Required File Paths**

****/pages/project/\[slug\].tsx

/pages/service/\[slug\].tsx

/pages/job/\[slug\].tsx

/pages/team/\[slug\].tsx

/pages/talent/\[slug\].tsx

### **✅ Example getServerSideProps**

****export async function getServerSideProps(context) {

const { slug } = context.params;

const isPreview = context.preview;

const res = await
fetch(\`https://api.example.com/api/project/slug/\${slug}?draft=\${isPreview}\`);

const project = await res.json();

return {

props: {

project,

preview: isPreview,

},

};

}

> ❌ Do **not** use getStaticProps. It breaks preview mode.

## **✅ Summary of Key Requirements**

  ---------------------------------------------
  **Task**                         **Status**
  -------------------------------- ------------
  Strapi config/admin.ts           ✅ Required
  configured                       

  Dynamic routing (\[slug\].tsx)   ✅ Required

  /api/preview.ts created          ✅ Required

  PREVIEW_SECRET in .env           ✅ Required

  Uses getServerSideProps          ✅ Required

  Preview URL format:              ✅ Required
  /api/preview?\...                

  Redirect URL format:             ✅ Required
  /\${type}/\${slug}               
  ---------------------------------------------

### **✅ Best Practices**

- Use a long, unguessable PREVIEW_SECRET

- Never expose preview tokens in shared URLs

- Expire preview cookies promptly on the frontend

- Handle 404/fallback behavior gracefully

- Only enable preview for draft or unpublished content

- Do not use getStaticProps on detail pages for listings

- Add console.warn for logging unauthorized preview attempts during
  development

- Use fallback handling and throw errors in admin.ts if UID is
  unsupported

✅ Once this is in place, editors will see a **Preview** button when
viewing an entry in Strapi Admin. Clicking it sends a secure GET request
to the frontend's /api/preview endpoint with type, slug, and secret. The
frontend then redirects to the correct detail page in preview mode.
