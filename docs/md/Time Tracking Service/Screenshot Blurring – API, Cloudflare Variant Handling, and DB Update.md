**Screenshot Blurring -- API, Cloudflare Variant Handling, and DB
Update**

**Feature Scope:**

- User clicks \"Blur\" on a screenshot → backend marks the screenshot as
  blurred.

- Cloudflare Image Resizing (or equivalent) is used to generate a
  blurred version of the image.

- The frontend uses the blurred version of the image based on a flag
  from the backend.

**Step 1 -- Add isBlurred Field to Screenshot Entity**

Update your screenshots table to include:

@Column({ default: false })

isBlurred: boolean;

This flag controls whether the frontend should request the blurred
image version.

**Step 2 -- Blur API (POST)**

**Route:** POST /api/screenshots/:id/blur\
**Auth:** Authenticated user (must be owner or admin)

@Post(\':id/blur\')

async blurScreenshot(@Param(\'id\') id: string, \@Req() req) {

const screenshot = await this.repo.findOneBy({ id });

if (!screenshot \|\| screenshot.isDeleted) {

throw new NotFoundException();

}

if (screenshot.userId !== req.user.id && !req.user.isAdmin) {

throw new ForbiddenException();

}

screenshot.isBlurred = true;

return this.repo.save(screenshot);

}



**Step 3 -- Adjust Signed URL Logic for Blurred View**

In your cloudflare.service.ts, modify the getSignedUrl() function:

async getSignedUrl(key: string, isBlurred: boolean): Promise\<string\>
{

const cleanKey = key.replace(\'r2://screenshots/\', \'\');

const params: any = {

Bucket: this.bucket,

Key: cleanKey,

Expires: 3600,

};

if (isBlurred) {

// Request Cloudflare variant via CDN path (assuming variant is called
\"blurred\")

return
\`https://your-cdn.cloudflare.com/screenshots/blurred/\${cleanKey}\`;

}

return this.s3.getSignedUrl(\'getObject\', params);

}

> 🔍 Note: This assumes Cloudflare R2 bucket is attached to a
> Cloudflare Worker or CDN domain that supports image variants. You must
> configure the \"blurred\" variant in the Cloudflare dashboard or use
> Workers to apply dynamic blurring via image resizing.

**Step 4 -- Signed URL API Uses isBlurred Flag**

Update GET /api/screenshots/:id/url to use the blurred variant if
isBlurred is true:

@Get(\':id/url\')

async getSignedUrl(@Param(\'id\') id: string, \@Req() req) {

const screenshot = await this.repo.findOneBy({ id });

if (!screenshot \|\| screenshot.isDeleted) {

throw new NotFoundException();

}

if (screenshot.userId !== req.user.id && !req.user.isAdmin) {

throw new ForbiddenException();

}

const signedUrl = await
this.cloudflareService.getSignedUrl(screenshot.imageUrl,
screenshot.isBlurred);

return { signedUrl };

}



**Step 5 -- Frontend Behavior (For Reference)**

- The frontend still calls the same /api/screenshots/:id/url endpoint.

- If the image is blurred, it will receive a signed URL to the blurred
  image variant.

- The "Blur" action in the UI triggers the POST
  /api/screenshots/:id/blur request.

**Security & Audit Notes**

- ✅ Only screenshot owner or admin may blur the screenshot.

- ✅ Blurred screenshots remain stored in R2 as-is --- only the CDN
  layer modifies visibility.

- ✅ You do not need to store a separate blurred image. Use Cloudflare
  variant on-the-fly.

✅ This completes the backend logic for the Screenshot Blurring feature.
