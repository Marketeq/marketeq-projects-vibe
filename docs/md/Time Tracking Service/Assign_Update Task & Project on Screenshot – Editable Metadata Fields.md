**Assign/Update Task & Project on Screenshot -- Editable Metadata
Fields**

**Feature Scope:**

- Allow users to assign or update the taskId and projectId associated
  with each screenshot.

- This is editable in the UI by clicking the task/project dropdown on
  the screenshot card.

- ActivityWatch does **not** natively support assigning screenshots to
  tasks or projects, so this must be managed entirely on the backend
  **after** screenshots are uploaded.

**Step 1 -- Add Fields to Screenshot Entity**

Update your screenshots table:

@Column({ nullable: true })

projectId: string;

\@Column({ nullable: true })

taskId: string;

> projectId and taskId must correspond to existing records in your
> projects and tasks tables.

**Step 2 -- API Endpoint: Update Screenshot Metadata**

**Route:** PUT /api/screenshots/:id/metadata\
**Auth:** Screenshot owner only (or admin)

@Put(\':id/metadata\')

async updateScreenshotMetadata(

\@Param(\'id\') id: string,

\@Req() req,

\@Body() dto: UpdateScreenshotMetadataDto

) {

const screenshot = await this.repo.findOneBy({ id });

if (!screenshot \|\| screenshot.isDeleted) {

throw new NotFoundException();

}

if (screenshot.userId !== req.user.id && !req.user.isAdmin) {

throw new ForbiddenException();

}

screenshot.projectId = dto.projectId \|\| null;

screenshot.taskId = dto.taskId \|\| null;

return this.repo.save(screenshot);

}



**Step 3 -- DTO**

Create a DTO in dto/update-screenshot-metadata.dto.ts:

export class UpdateScreenshotMetadataDto {

\@IsOptional()

\@IsUUID()

projectId?: string;

\@IsOptional()

\@IsUUID()

taskId?: string;

}



**Step 4 -- Timeline API Adjustments**

If you have a screenshot timeline or filtering endpoint like GET
/api/screenshots?projectId=, update the query builder to allow filtering
by these fields.

Example:

async getScreenshotsByProject(userId: string, projectId?: string) {

return this.repo.find({

where: {

userId,

projectId,

isDeleted: false,

},

order: { timestamp: \'ASC\' },

});

}



**Integration with ActivityWatch**

- ❌ ActivityWatch **does not** support task/project tagging in its
  default configuration.

- ✅ All screenshots are uploaded via the AW agent with only timestamp +
  user metadata.

- ✅ Project/task assignment must happen **after** upload inside your
  backend.

- 🧠 If you want to preload task/project assignments via ActivityWatch
  in the future, you'd need to:

  - Patch the Python watcher

  - Allow AW to send projectId/taskId as metadata

  - Add parsing logic in your upload controller

But that is **not required** for this implementation.

✅ This completes the backend logic for assigning or updating screenshot
task/project metadata.
