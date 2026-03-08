**Strapi-to-NestJS API Integration -- Developer Instructions (with
Embedded Starter Code)**

This document explains how to sync project data edited in Strapi into
your NestJS backend (PostgreSQL DB). It assumes Strapi and NestJS are
running on separate databases and that your frontend pulls only from the
NestJS backend, not from Strapi. Admin edits in Strapi must update the
main Listings Microservice via REST API **after passing content
moderation.**

## **⚙️ Overview**

- **Strapi DB is isolated** from NestJS

- Strapi mirrors the same project schema as the Listings Microservice

- Any changes made to project records in Strapi (by admins or
  moderators) should be **pushed** to the NestJS backend

- Moderation is enforced at time of save or publish within Strapi

## **🔁 Sync Strategy**

### **1. Trigger sync on update or publish**

Use Strapi\'s [[lifecycle
hooks]{.underline}](https://docs.strapi.io/dev-docs/backend-customization/models#lifecycle-hooks)
to trigger a sync after edits:

**Path:** ./src/api/project/content-types/project/lifecycles.js

module.exports = {

async afterUpdate(event) {

const { result } = event;

if (result.status === \'published\' \|\| result.status ===
\'needs_update\') {

await
strapi.service(\'api::project.project-sync\').syncWithBackend(result);

}

},

};



### **2. Create a custom sync service**

**Path:** ./src/api/project/services/project-sync.js

\'use strict\';

const axios = require(\'axios\');

module.exports = ({ strapi }) =\> ({

async syncWithBackend(project) {

try {

const backendResponse = await axios.put(

\`https://api.yourdomain.com/listings/projects/\${project.slug}\`,

{

title: project.title,

description: project.description,

tags: project.tags,

skills: project.skills,

scope: project.scope,

categories: project.categories,

industries: project.industries,

visibility: project.visibility,

status: project.status,

owner_id: project.owner_id,

featured_image: project.featured_image?.url,

additional_images: project.additional_images?.map((img) =\> img.url),

video_url: project.video_url,

},

{

headers: {

Authorization: \`Bearer \${process.env.BACKEND_API_TOKEN}\`,

},

}

);

strapi.log.info(\`Synced project \${project.slug} successfully.\`);

return backendResponse.data;

} catch (err) {

strapi.log.error(\`Failed to sync project \${project.slug}:\`,
err.message);

}

},

});



## **🔐 Environment Variables**

In your .env file:

BACKEND_API_TOKEN=your_api_token_here



## **✅ Tasks to Complete**

- Enable lifecycle hook for afterUpdate in Strapi

- Create project-sync service with sync logic to backend

- Protect backend API with token auth

- Use .env to store sensitive values

- Ensure Strapi content type matches Listings Microservice schema

- Run manual tests to confirm sync works

## **🧪 Optional Enhancements**

- Add retry mechanism with exponential backoff

- Log sync history in project.activity_log

- Use Strapi\'s admin UI to show sync status or last updated
