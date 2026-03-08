### **Document 14: Media Content Moderation (Third-Party API Integration)**

#### **Overview**

Previously, media files were being stored directly in PostgreSQL. We
have now replaced that with **Cloudflare R2** for durable, CDN-backed
storage. The **Content Moderation Microservice** will:

1.  **Receive** Cloudflare R2 URLs for each uploaded image or video

2.  **Fetch** the object via R2's S3-compatible API to verify
    accessibility

3.  **Moderate** the media using the **Hugging Face Inference API\**

4.  **Return** a single pass/fail decision

All moderation logic and thresholds remain unchanged.

#### **1. Environment Setup**

Add the following to your service's .env (loaded via
ConfigModule.forRoot):

# Cloudflare R2 credentials

CLOUDFLARE_ACCOUNT_ID=your_account_id

CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key

CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key

CLOUDFLARE_R2_BUCKET=project-uploads

\# Hugging Face Inference API

HF_INFERENCE_API_URL=https://api-inference.huggingface.co/models/openai/clip-vit-base-patch16

HF_API_TOKEN=hf_xxxYourTokenxxx



#### **2. Install Dependencies**

****npm install aws-sdk node-fetch

- \
  **aws-sdk**: To interact with Cloudflare R2 (S3-compatible)

- **node-fetch**: To call the Hugging Face Inference API

#### **3. CloudflareUploadService**

> *(Unchanged from Document 5; shows how frontend files are uploaded
> into R2. Included here for completeness.)*

**// src/media/cloudflare-upload.service.ts

import { Injectable } from \'@nestjs/common\';

import { S3 } from \'aws-sdk\';

\@Injectable()

export class CloudflareUploadService {

private readonly r2 = new S3({

endpoint:
\`https://api.cloudflare.com/client/v4/accounts/\${process.env.CLOUDFLARE_ACCOUNT_ID}/r2\`,

region: \'auto\',

accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,

secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,

signatureVersion: \'v4\',

});

async uploadFile(buffer: Buffer, filename: string, contentType: string):
Promise\<string\> {

const key = \`\${Date.now()}-\${filename}\`;

await this.r2.putObject({

Bucket: process.env.CLOUDFLARE_R2_BUCKET,

Key: key,

Body: buffer,

ContentType: contentType,

}).promise();

return
\`https://imagedelivery.net/\${process.env.CLOUDFLARE_ACCOUNT_ID}/\${key}/public\`;

}

}



#### **4. Hugging Face Moderation Service**

****// src/media/hugging-face.service.ts

import { Injectable, HttpException, HttpStatus } from
\'@nestjs/common\';

import fetch from \'node-fetch\';

\@Injectable()

export class HuggingFaceService {

private readonly apiUrl = process.env.HF_INFERENCE_API_URL;

private readonly apiToken = process.env.HF_API_TOKEN;

/\*\* Returns true if image/video is safe \*/

async moderateImage(url: string): Promise\<boolean\> {

const response = await fetch(this.apiUrl, {

method: \'POST\',

headers: {

\'Authorization\': \`Bearer \${this.apiToken}\`,

\'Content-Type\': \'application/json\',

},

body: JSON.stringify({ inputs: { image: url } }),

});

if (!response.ok) {

throw new HttpException(\'Hugging Face API error\',
HttpStatus.BAD_GATEWAY);

}

const results = (await response.json()) as Array\<{ label: string;
score: number }\>;

const explicit = results.find(r =\>
r.label.toLowerCase().includes(\'explicit\'));

return !explicit \|\| explicit.score \< 0.5;

}

async moderateVideo(url: string): Promise\<boolean\> {

// For simplicity, use the same endpoint (it will extract frames
internally)

return this.moderateImage(url);

}

}



#### **5. MediaModerationService**

****// src/media/media-moderation.service.ts

import { Injectable, HttpException, HttpStatus } from
\'@nestjs/common\';

import { S3 } from \'aws-sdk\';

import { HuggingFaceService } from \'./hugging-face.service\';

\@Injectable()

export class MediaModerationService {

private readonly s3 = new S3({

endpoint:
\`https://api.cloudflare.com/client/v4/accounts/\${process.env.CLOUDFLARE_ACCOUNT_ID}/r2\`,

region: \'auto\',

accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,

secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,

signatureVersion: \'v4\',

});

constructor(private readonly hf: HuggingFaceService) {}

/\*\* Verifies URL exists in R2, then moderates via HF \*/

async validateMedia(url: string): Promise\<boolean\> {

// Extract {key} from URL:
https://imagedelivery.net/ACCOUNT_ID/{key}/public

const parts = url.split(\'/\');

const key = parts\[parts.length - 2\];

try {

await this.s3.headObject({ Bucket: process.env.CLOUDFLARE_R2_BUCKET,
Key: key }).promise();

} catch {

throw new HttpException(\'Unable to fetch media.\',
HttpStatus.UNPROCESSABLE_ENTITY);

}

if (url.match(/\\.(jpg\|jpeg\|png)\$/)) {

return this.hf.moderateImage(url);

}

if (url.match(/\\.(mp4\|mov\|avi)\$/)) {

return this.hf.moderateVideo(url);

}

throw new HttpException(\'Unsupported media format.\',
HttpStatus.UNPROCESSABLE_ENTITY);

}

}



#### **6. Validation Controller**

****// src/validate/validate-media.controller.ts

import { Controller, Post, Body } from \'@nestjs/common\';

import { MediaModerationService } from
\'../media/media-moderation.service\';

\@Controller(\'api\')

export class ValidateMediaController {

constructor(private readonly mediaSvc: MediaModerationService) {}

\@Post(\'validate-media\')

async validate(@Body() body: { media: string\[\] }) {

for (const url of body.media) {

const safe = await this.mediaSvc.validateMedia(url);

if (!safe) {

return { status: \'rejected\', message: \'Media contains explicit
content.\' };

}

}

return { status: \'approved\', message: \'All media are safe.\' };

}

}



#### **7. Error Handling**

- **R2 fetch failure (HEAD returns 403/404)** → 422 Unprocessable Entity
  { message: \'Unable to fetch media.\' }

- **Unsupported extension** → 422 Unprocessable Entity { message:
  \'Unsupported media format.\' }

- **Hugging Face errors** → 502 Bad Gateway { message: \'Hugging Face
  API error\' }

#### **8. Testing**

Add an integration test suite (e.g. test/validate-media.spec.ts)
covering:

- Valid image → approved

- Explicit image → rejected

- Unsupported format → 422

- Invalid R2 key → 422
