**NestJS Screenshot Upload Endpoint -- Cloud-Synced Screenshot
Metadata**

This document provides implementation instructions for the backend
endpoint responsible for storing screenshot metadata sent by the local
time tracking agent. Screenshots are uploaded directly to Cloudflare R2
by the agent; the backend stores only metadata in Postgres.

1.  Endpoint Overview

- **Route**: POST /api/screenshots

- **Purpose**: Accept screenshot metadata

- **Authentication**: Machine-to-machine auth token (internal service
  only)

- **Media Storage**: Screenshot is uploaded to Cloudflare R2 by the
  agent

- **Backend Role**: Store screenshot metadata and associate with
  user/project/task

2.  Request Payload

The following fields must be sent in the body of the POST request:

- userId (string)

- projectId (string)

- imageUrl (string -- Cloudflare R2 link)

- timestamp (ISO 8601 string)

- keyboard (integer -- key presses in that interval)

- mouse (integer -- mouse events in that interval)

Example JSON:\
{\
\"userId\": \"abc123\",\
\"projectId\": \"proj789\",\
\"imageUrl\":
\"[[https://r2.cdn.cloudflare.com/\.../screen123.jpg]{.underline}](https://r2.cdn.cloudflare.com/.../screen123.jpg)\",\
\"timestamp\": \"2025-08-07T13:25:00.000Z\",\
\"keyboard\": 45,\
\"mouse\": 37\
}

3.  Backend File Structure (NestJS)

/src/screenshots

- screenshots.controller.ts

- screenshots.service.ts

- dto/create-screenshot.dto.ts

- entities/screenshot.entity.ts

- screenshots.module.ts

4.  Database Entity: Screenshot

Postgres table screenshots should contain:

- id (UUID, primary key)

- userId (string)

- projectId (string)

- imageUrl (string)

- timestamp (string -- ISO8601)

- keyboard (int)

- mouse (int)

- createdAt (auto timestamp)

5.  DTO: CreateScreenshotDto

Validates all request fields using class-validator:

- All fields are required

- imageUrl must be a valid URL

- timestamp must be ISO8601

- keyboard and mouse must be integers

6.  Service: ScreenshotsService

Handles saving the metadata to the database:

- create(dto: CreateScreenshotDto): Saves and returns the record

- findAll(): (optional) Returns all screenshots (used for admin/debug
  only)

7.  Controller: ScreenshotsController

- POST /api/screenshots: Receives the CreateScreenshotDto and calls the
  service to persist the record

- Returns 201 with the saved screenshot metadata

8.  Module: ScreenshotsModule

Registers:

- Screenshot entity via TypeOrmModule

- ScreenshotsController

- ScreenshotsService

9.  Security Notes

- Accept requests only from trusted agents (machine-to-machine token)

- Enforce R2 domain whitelisting for imageUrl field

- Implement rate limiting for abuse prevention

- Do not expose this endpoint to end users

10. Next Steps

- Add optional linkage to task ID or contract ID

- Add soft-delete or flag logic for admin tools

- Extend DTO with optional metadata (blurred, flagged, rejected)

- Build frontend tools to render screenshot grids and review modal
