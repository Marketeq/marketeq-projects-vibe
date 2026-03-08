**Screenshot Deletion API (NestJS Backend)**

This document defines the backend logic for removing screenshots from
visibility via soft deletion. This implementation aligns strictly with
the UI designs and approved user stories. No moderation, flagging, or
review logic is included.

1.  Endpoint Summary

- DELETE /api/screenshots/:id\
  Soft-deletes a screenshot by marking it as hidden. Does not erase
  image data from cloud storage.

2.  Database Changes -- Screenshot Entity

Add the following column to the screenshots table:

- isDeleted (boolean, default: false)

Update Screenshot entity:

- Field: isDeleted: boolean

- Description: Marks screenshot as hidden in the dashboard. Screenshots
  marked as deleted are excluded from the frontend grid and dashboard
  summaries.

3.  Controller -- ScreenshotsController

@Delete(\'/:id\')

async deleteScreenshot(@Param(\'id\') id: string, \@Req() req) {

const userId = req.user.id;

return this.screenshotsService.deleteScreenshot(id, userId);

}



4.  Service -- ScreenshotsService

async deleteScreenshot(id: string, userId: string) {

const screenshot = await this.repo.findOneBy({ id });

if (!screenshot \|\| screenshot.userId !== userId) {

throw new ForbiddenException(\'Not authorized to delete this
screenshot\');

}

screenshot.isDeleted = true;

return this.repo.save(screenshot);

}



5.  Security Rules

- Only the user who owns the screenshot may delete it.

- Admins cannot delete screenshots on behalf of a user unless explicitly
  scoped in future UI flows.

6.  Integration Notes

- Deleted screenshots must not appear in the dashboard screenshot grid.

- Deleted screenshots must not be used in any time summary calculations.

- This endpoint must be invoked only from approved delete icons shown in
  the UI designs.
