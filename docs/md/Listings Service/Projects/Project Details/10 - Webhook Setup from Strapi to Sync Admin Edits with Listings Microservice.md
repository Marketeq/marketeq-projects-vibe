**Webhook Setup from Strapi to Sync Admin Edits with Listings
Microservice**

This document provides exact instructions for setting up a webhook in
Strapi that sends project data to the NestJS Listings Microservice after
an admin edits or updates a project. The webhook ensures all changes in
Strapi are synced to the main PostgreSQL database used by the frontend.
This webhook only fires if the content passes moderation and is approved
for publishing.\
\
This webhook ensures real-time sync between Strapi and your
frontend-facing microservices after admin edits. For full control, see
version history tracking or activity logging guides.

## **📦 Prerequisites**

- Strapi v4 is installed and running.

- Your Listings Microservice is live and accepts authenticated API
  requests (e.g., via internal API key or JWT).

- Content moderation rules are already implemented.

## **⚖️ Step 1: Create a Webhook in Strapi Admin**

1.  Go to the Strapi Admin Panel.

2.  Navigate to Settings \> Webhooks \> Create new webhook

3.  Enter the following configuration:

    - **Name**: Sync to Listings Microservice

    - **URL**: https://api.yourdomain.com/internal/project-sync

    - **Triggers**: On entry update

    - **Content Types**: Project

    - **Headers**:

{

\"Authorization\": \"Bearer \<YOUR_INTERNAL_API_TOKEN\>\"

}

- \
  **Custom body**: Leave empty (Strapi will send full event payload)

4.  Click **Save**.

## **⚙️ Step 2: Create a Controller in Listings Microservice**

Create the controller to receive the webhook event.

//
app/listings-service/src/project/controllers/project-sync.controller.ts

import { Controller, Post, Headers, Body, UnauthorizedException } from
\'@nestjs/common\';

import { ProjectSyncService } from \'../services/project-sync.service\';

\@Controller(\'internal/project-sync\')

export class ProjectSyncController {

constructor(private readonly projectSyncService: ProjectSyncService) {}

\@Post()

async syncProject(

\@Headers(\'authorization\') authHeader: string,

\@Body() payload: any,

) {

if (authHeader !== \`Bearer \${process.env.STRAPI_SYNC_TOKEN}\`) {

throw new UnauthorizedException(\'Invalid token\');

}

const projectData = payload.entry;

await this.projectSyncService.sync(projectData);

return { success: true };

}

}



## **📊 Step 3: Build the Sync Service**

Create a service that updates the database with the incoming Strapi
data.

// app/listings-service/src/project/services/project-sync.service.ts

import { Injectable } from \'@nestjs/common\';

import { PrismaService } from \'src/prisma/prisma.service\';

\@Injectable()

export class ProjectSyncService {

constructor(private readonly prisma: PrismaService) {}

async sync(data: any) {

const { id, title, description, tags, skills, status, \...rest } = data;

await this.prisma.project.upsert({

where: { strapiId: id },

create: {

strapiId: id,

title,

description,

tags,

skills,

status,

\...rest,

},

update: {

title,

description,

tags,

skills,

status,

\...rest,

},

});

}

}

> ✅ Note: This assumes you\'re storing a strapiId in the main database
> to identify matching records.

## **🔐 Step 4: Secure the Sync**

1.  Add this to your .env file:

STRAPI_SYNC_TOKEN=your-secure-token-here

2.  \
    Restart your NestJS service.

3.  Use this token in the Strapi webhook\'s Authorization header.

## **✅ Final Notes**

- Webhook only fires after moderation-approved edits.

- You can add filters to prevent syncing drafts (status !==
  \'published\').

- To extend this, support localization or media sync in your DTO parser.
