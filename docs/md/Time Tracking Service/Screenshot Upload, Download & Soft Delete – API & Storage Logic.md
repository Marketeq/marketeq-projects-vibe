**Screenshot Upload, Download & Soft Delete -- API & Storage Logic**

**Feature Scope:**

- 📤 Screenshots are uploaded by the ActivityWatch desktop agent via
  backend API.

- 📥 Screenshots are downloaded as **signed URLs** from Cloudflare R2.

- 🗑️ Screenshots are soft-deleted (not removed from Cloudflare, but
  marked deleted in the database).

**Step 1 -- Screenshot Entity**

Create src/screenshots/screenshot.entity.ts:

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn }
from \'typeorm\';

\@Entity(\'screenshots\')

export class Screenshot {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column()

userId: string;

\@Column()

projectId: string;

\@Column()

imageUrl: string;

\@Column({ type: \'timestamptz\' })

timestamp: Date;

\@Column({ type: \'int\' })

keyboard: number;

\@Column({ type: \'int\' })

mouse: number;

\@Column({ default: false })

isDeleted: boolean;

\@CreateDateColumn()

createdAt: Date;

}



**Step 2 -- Screenshot Upload (POST)**

The desktop agent uploads a screenshot with metadata:

**Route:** POST /api/screenshots\
**Auth:** Requires token (from user or device)

@Post()

\@UseInterceptors(FileInterceptor(\'file\'))

async uploadScreenshot(

\@UploadedFile() file: Express.Multer.File,

\@Body() dto: CreateScreenshotDto,

\@Req() req,

) {

const userId = req.user.id;

return this.screenshotService.uploadScreenshot(userId, file, dto);

}

**DTO:** create-screenshot.dto.ts

export class CreateScreenshotDto {

\@IsString()

projectId: string;

\@IsDateString()

timestamp: string;

\@IsNumber()

keyboard: number;

\@IsNumber()

mouse: number;

}

**Service Logic:**

****async uploadScreenshot(userId: string, file: Express.Multer.File,
dto: CreateScreenshotDto) {

const filename = \`\${userId}/\${Date.now()}-\${file.originalname}\`;

const imageUrl = await this.cloudflareService.upload(file.buffer,
filename);

const screenshot = this.repo.create({

userId,

projectId: dto.projectId,

imageUrl,

timestamp: new Date(dto.timestamp),

keyboard: dto.keyboard,

mouse: dto.mouse,

});

return this.repo.save(screenshot);

}



**Step 3 -- Generate Signed URL (GET)**

**Route:** GET /api/screenshots/:id/url\
**Auth:** Requires authenticated user (must own screenshot or be admin)

@Get(\':id/url\')

async getSignedUrl(@Param(\'id\') id: string, \@Req() req) {

const screenshot = await this.repo.findOneBy({ id });

if (!screenshot \|\| screenshot.isDeleted) {

throw new NotFoundException();

}

if (screenshot.userId !== req.user.id && !req.user.isAdmin) {

throw new ForbiddenException();

}

return {

signedUrl: await
this.cloudflareService.getSignedUrl(screenshot.imageUrl),

};

}



**Step 4 -- Soft Delete (DELETE)**

**Route:** DELETE /api/screenshots/:id\
**Auth:** Must be owner or admin

@Delete(\':id\')

async softDelete(@Param(\'id\') id: string, \@Req() req) {

const screenshot = await this.repo.findOneBy({ id });

if (!screenshot \|\| screenshot.isDeleted) {

throw new NotFoundException();

}

if (screenshot.userId !== req.user.id && !req.user.isAdmin) {

throw new ForbiddenException();

}

screenshot.isDeleted = true;

return this.repo.save(screenshot);

}



**Step 5 -- Cloudflare R2 Integration**

Your cloudflare.service.ts should include:

async upload(buffer: Buffer, filename: string): Promise\<string\> {

// Upload to Cloudflare R2 bucket

return \`r2://screenshots/\${filename}\`;

}

async getSignedUrl(key: string): Promise\<string\> {

// Generate signed URL using S3-compatible SDK

return this.s3.getSignedUrl(\'getObject\', {

Bucket: this.bucket,

Key: key.replace(\'r2://screenshots/\', \'\'),

Expires: 3600,

});

}



**Step 6 -- Security Rules**

- ✅ Upload: Authenticated user only (from desktop agent)

- ✅ Download: Must be owner or admin

- ✅ Delete: Only owner or admin

- ⚠️ Deleted screenshots are excluded from frontend views

**Step 7 -- Integration Notes**

- The ActivityWatch desktop agent must POST each screenshot via
  /api/screenshots with image + metadata.

- The frontend uses GET /api/screenshots/:id/url to retrieve signed URL
  for previewing.

- Timeline and grid views must filter out isDeleted = true screenshots.

✅ This completes the backend logic for screenshot upload, signed
download, and soft delete.
