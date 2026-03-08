**Screenshot Moderation -- Flag, Blur, and Delete API (NestJS Backend)**

This document defines the backend logic for moderation tools that allow
users and admins to flag inappropriate screenshots, blur sensitive
content, and perform soft-deletion. All actions are logged with
timestamps and the actor's identity.

1.  Endpoint Summary

- POST /api/screenshots/:id/flag

- POST /api/screenshots/:id/blur

- DELETE /api/screenshots/:id

- GET /api/screenshots/flagged

- PUT /api/screenshots/:id/review

2.  Database Changes -- Screenshot Entity

Add the following columns to screenshots table:

- isFlagged (boolean, default false)

- isBlurred (boolean, default false)

- isDeleted (boolean, default false)

- flaggedBy (string, optional userId)

- flaggedAt (timestamp)

- reviewedBy (string, optional adminId)

- reviewStatus (enum: pending, approved, rejected)

- reviewComment (string, optional)

3.  DTOs

create-flag.dto.ts:

- reason: string (optional)

review-screenshot.dto.ts:

- status: \"approved\" \| \"rejected\"

- comment: string (optional)

4.  Controller: ScreenshotsController

POST /:id/flag

- Validates ID

- Sets isFlagged = true, flaggedAt = now(), flaggedBy = current user

- Stores optional reason in moderation log (future enhancement)

POST /:id/blur

- Sets isBlurred = true

- Used for screenshots that should be obfuscated but retained

DELETE /:id

- Sets isDeleted = true (soft delete)

- Screenshot still stored in R2 but hidden in frontend

GET /flagged

- Admin-only endpoint to list all flagged screenshots

- Returns full metadata including status, reviewer, comment

PUT /:id/review

- Accepts review decision and comment

- Updates reviewStatus and reviewedBy

5.  Service: ScreenshotsService

- flagScreenshot(id, userId)

- blurScreenshot(id)

- deleteScreenshot(id)

- getFlaggedScreenshots()

- reviewScreenshot(id, status, comment, adminId)

6.  Moderation Log Table (optional extension)

A separate table screenshot_moderation_logs can be used to track
moderation history:

- id

- screenshotId

- action (flagged, reviewed, blurred, deleted)

- actorId

- timestamp

- comment

7.  Security Rules

- Only the screenshot's owner or an admin can flag

- Only admins can review

- Blur and delete can be done by owner or admin

8.  Integration Notes

- Flag/Blur/Delete status must be reflected in frontend screenshot grid

- Review decisions should appear in admin dashboard

- Flagged screenshots must not be used in time summaries until reviewed
