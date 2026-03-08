**Strapi Sync Service -- Integration Instructions**

This document explains how to implement a NestJS service
(strapi-sync.service.ts) that syncs approved project updates from Strapi
into your NestJS-based Listings Microservice database. This assumes
Strapi is hosted separately and uses its own PostgreSQL DB, while your
frontend and backend use a separate NestJS PostgreSQL DB.

## **✅ Objective**

When an admin edits a project in Strapi and the content moderation
status is approved, we want to push that update to the Listings
Microservice via API.

This document includes:

- A detailed breakdown of the StrapiSyncService

- How to set it up in your NestJS codebase

- How to call the sync function with appropriate data

## **⚙️ Setup Instructions**

### **1. Create a file: strapi-sync.service.ts**

Inside your Listings Microservice (e.g.,
apps/listings-service/src/shared/services/):

import { Injectable, Logger } from \'@nestjs/common\';

import axios from \'axios\';

\@Injectable()

export class StrapiSyncService {

private readonly logger = new Logger(StrapiSyncService.name);

async syncProjectFromStrapi(strapiProject: any): Promise\<void\> {

const isApproved = strapiProject?.moderation_status === \'approved\';

if (!isApproved) {

this.logger.warn(\`Project \${strapiProject.id} is not approved.
Skipping sync.\`);

return;

}

try {

const projectPayload = this.transformStrapiToProjectDTO(strapiProject);

await axios.put(

\`https://your-backend-api.com/api/projects/\${projectPayload.id}\`,

projectPayload,

{

headers: {

Authorization: \`Bearer \${process.env.INTERNAL_API_KEY}\`

}

}

);

this.logger.log(\`Successfully synced project \${projectPayload.id} from
Strapi.\`);

} catch (error) {

this.logger.error(\`Failed to sync project \${strapiProject.id} from
Strapi\`, error);

}

}

private transformStrapiToProjectDTO(strapiProject: any): any {

return {

id: strapiProject.id,

title: strapiProject.title,

description: strapiProject.description,

tags: strapiProject.tags \|\| \[\],

skills: strapiProject.skills \|\| \[\],

categories: strapiProject.categories \|\| \[\],

industries: strapiProject.industries \|\| \[\],

status: \'published\',

phases: strapiProject.scope,

featuredImage: strapiProject.featured_image?.url \|\| null,

additionalImages: strapiProject.additional_images?.map(img =\> img.url)
\|\| \[\],

videoUrl: strapiProject.video_url \|\| null,

};

}

}



### **2. Register in Module**

In listings.module.ts (or the shared module where services are
imported):

import { StrapiSyncService } from
\'./shared/services/strapi-sync.service\';

\@Module({

providers: \[StrapiSyncService\],

exports: \[StrapiSyncService\],

})

export class ListingsModule {}



### **3. Calling the Sync Function**

You can trigger the sync via webhook (from Strapi) or admin panel via
manual trigger. Here\'s a simple example for webhook controller:

@Post(\'/strapi/webhook\')

async handleStrapiWebhook(@Body() payload: any) {

await this.strapiSyncService.syncProjectFromStrapi(payload);

return { message: \'Sync attempted\' };

}

> 🔗 Replace the placeholder URL and ensure proper authentication.
> Internal sync APIs should be protected with API keys.

## **🔒 Security Notes**

- Use an internal bearer token (INTERNAL_API_KEY) to secure sync calls.

- Whitelist IPs or use webhook signatures from Strapi for extra
  protection.

## **🔄 Optional Enhancements**

- Add version history support

- Retry logic for failed sync attempts

- Add event logging to database

- Use job queues (e.g. BullMQ) for async sync with retry
