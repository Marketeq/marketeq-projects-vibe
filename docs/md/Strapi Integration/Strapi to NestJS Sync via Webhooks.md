# **Strapi to NestJS Sync via Webhooks**

This document outlines how to set up webhook-based syncing between
**Strapi** and the **NestJS backend**, ensuring any admin-side edits to
marketplace projects are reflected in the main PostgreSQL database used
by the frontend.

## **✨ Overview**

- Strapi will trigger a webhook whenever a marketplace project is
  **created**, **updated**, or **deleted**.

- The webhook will send a POST request to a secure NestJS endpoint
  (/internal/strapi-sync) with the updated project payload.

- NestJS will validate, sanitize, and upsert the project into the shared
  Postgres DB.

## **📅 Events to Track**

Enable the following in **Strapi \> Settings \> Webhooks**:

  ------------------------------------------------------------------
  **Event     **Strapi         **Action**
  Type**      Trigger**        
  ----------- ---------------- -------------------------------------
  Entry       project.create   POST /internal/strapi-sync
  Create                       

  Entry       project.update   POST /internal/strapi-sync
  Update                       

  Entry       project.delete   POST /internal/strapi-sync (with
  Delete                       deleted=true)
  ------------------------------------------------------------------

## **⚖️ NestJS Sync Endpoint**

**Endpoint:** /internal/strapi-sync

**Example structure:**

****// strapi-sync.controller.ts

\@Post(\'/internal/strapi-sync\')

\@UseGuards(InternalApiGuard) // Validates secret token

async handleStrapiSync(@Body() body: StrapiSyncDto) {

return this.strapiSyncService.processWebhook(body);

}



// strapi-sync.service.ts

async processWebhook(body: StrapiSyncDto) {

const { project_id, deleted, \...projectData } = body;

if (deleted) {

await this.projectRepository.softDelete({ id: project_id });

} else {

await this.projectRepository.upsert(projectData);

}

}



## **🔒 Authentication (Recommended)**

- Use a **shared secret header** (e.g., x-strapi-secret) with each
  webhook.

- Validate using a NestJS guard:

@Injectable()

export class InternalApiGuard implements CanActivate {

canActivate(context: ExecutionContext): boolean {

const request = context.switchToHttp().getRequest();

return request.headers\[\'x-strapi-secret\'\] ===
process.env.STRAPI_SYNC_SECRET;

}

}



## **✨ Strapi Webhook Setup (Render)**

1.  Go to **Settings \> Webhooks** in your Strapi admin.

2.  Click **+ Create New Webhook**.

3.  Name it \"Project Sync\"

4.  Set URL: https://api.marketeq.com/internal/strapi-sync

5.  Add header:

    - Key: x-strapi-secret

    - Value: YOUR_SECRET_TOKEN

6.  Events: check all for project.create, project.update, project.delete

7.  Save

## **🌐 DTO for Sync**

Create a strict DTO to validate incoming webhook data. Example:

export class StrapiSyncDto {

\@IsUUID()

project_id: string;

\@IsOptional()

\@IsBoolean()

deleted?: boolean;

\@IsString()

title: string;

\@IsString()

description: string;

// Add all fields expected from Strapi edits

}



## **✨ Logging & Monitoring**

- Log all incoming webhook payloads to a secure audit table.

- Mark each entry with: source: \'strapi\', action:
  create\|update\|delete

- Consider storing old + new values if field-level change tracking is
  needed.
