**Cloudflare Media Upload Integration for Listings Service**

This document provides full implementation instructions for integrating
Cloudflare R2 media uploads into the Listings Service. It covers both
backend and frontend logic for uploading project media files using
Cloudflare's S3-compatible API.

**1. Cloudflare R2 Bucket Setup**

- Create a Cloudflare R2 bucket (e.g., marketeq-media)

- Set access key and secret key

- Note the bucket URL and region (e.g.,
  https://\<accountid\>.r2.cloudflarestorage.com)

- Enable public access (or configure signed URL policy)

**2. Environment Variables**

Add the following to your Listings Service .env file:

CLOUDFLARE_R2_ENDPOINT=https://\<accountid\>.r2.cloudflarestorage.com

CLOUDFLARE_R2_REGION=auto

CLOUDFLARE_R2_BUCKET=marketeq-media

CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key

CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key



**3. S3 Client Configuration**

Install AWS SDK:

npm install \@aws-sdk/client-s3

Create file: cloudflare.client.ts

import { S3Client } from \'@aws-sdk/client-s3\';

import { ConfigService } from \'@nestjs/config\';

export const createCloudflareClient = (config: ConfigService) =\> {

return new S3Client({

region: config.get(\'CLOUDFLARE_R2_REGION\'),

endpoint: config.get(\'CLOUDFLARE_R2_ENDPOINT\'),

credentials: {

accessKeyId: config.get(\'CLOUDFLARE_R2_ACCESS_KEY_ID\'),

secretAccessKey: config.get(\'CLOUDFLARE_R2_SECRET_ACCESS_KEY\'),

},

});

};



**4. Upload Service**

Create file: media.service.ts

import { Injectable } from \'@nestjs/common\';

import { PutObjectCommand } from \'@aws-sdk/client-s3\';

import { ConfigService } from \'@nestjs/config\';

import { createCloudflareClient } from \'./cloudflare.client\';

import { v4 as uuidv4 } from \'uuid\';

\@Injectable()

export class MediaService {

constructor(private config: ConfigService) {}

async uploadFile(buffer: Buffer, mimetype: string, originalName:
string): Promise\<string\> {

const s3 = createCloudflareClient(this.config);

const key = \`\${uuidv4()}-\${originalName}\`;

await s3.send(

new PutObjectCommand({

Bucket: this.config.get(\'CLOUDFLARE_R2_BUCKET\'),

Key: key,

Body: buffer,

ContentType: mimetype,

ACL: \'public-read\',

})

);

return \`\${this.config.get(\'CLOUDFLARE_R2_ENDPOINT\')}/\${key}\`;

}

}



**5. Media Controller**

Create file: media.controller.ts

import { Controller, Post, UploadedFile, UseInterceptors } from
\'@nestjs/common\';

import { FileInterceptor } from \'@nestjs/platform-express\';

import { MediaService } from \'./media.service\';

\@Controller(\'media\')

export class MediaController {

constructor(private readonly mediaService: MediaService) {}

\@Post(\'upload\')

\@UseInterceptors(FileInterceptor(\'file\'))

async upload(@UploadedFile() file: Express.Multer.File) {

const url = await this.mediaService.uploadFile(file.buffer,
file.mimetype, file.originalname);

return { url };

}

}



**6. NestJS Module Integration**

In media.module.ts:

import { Module } from \'@nestjs/common\';

import { ConfigModule } from \'@nestjs/config\';

import { MediaController } from \'./media.controller\';

import { MediaService } from \'./media.service\';

\@Module({

imports: \[ConfigModule\],

controllers: \[MediaController\],

providers: \[MediaService\],

})

export class MediaModule {}

Then import MediaModule into your ListingsModule or root AppModule.

**7. Frontend Example (Next.js)**

****async function uploadFile(file: File): Promise\<string\> {

const formData = new FormData();

formData.append(\'file\', file);

const res = await fetch(\'/api/listings/media/upload\', {

method: \'POST\',

body: formData,

});

const data = await res.json();

return data.url;

}



**8. Project Publishing Flow (Frontend)**

During project publishing, call uploadFile() for each image before
submitting the listing. Store the returned Cloudflare URL in the listing
data.

**9. Important Notes**

- This upload logic works for both Strapi and frontend-driven flows

- All uploads go to Cloudflare regardless of whether they originate from
  Strapi or the frontend

- Use the same bucket and ACL strategy to avoid permission mismatches

- Cloudflare automatically provides caching and CDN for public R2 files

✅ This is the final integration layer for cloud-native media handling
in listings.
