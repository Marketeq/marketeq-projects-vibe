**Cloudflare Media Upload -- Project Listings (Strapi + Frontend Flow)**

This document ensures that all media files (images, PDFs, etc.) related
to **Project Listings** are reliably uploaded to **Cloudflare**, whether
added via **Strapi Admin** or during **frontend-driven publishing**
(bypassing Strapi).

### **✅ Overview**

  ---------------------------------------------------------------------
  **Upload         **Target     **Upload         **Required
  Source**         System**     Destination**    Code/Setup**
  ---------------- ------------ ---------------- ----------------------
  Strapi Admin     Strapi       Cloudflare R2    Upload plugin
  Panel            backend                       configuration

  Frontend         NestJS API   Cloudflare R2    Manual file upload
  (Next.js)                                      endpoint
  ---------------------------------------------------------------------

### **🔧 Part 1: Strapi Admin -- Uploads to Cloudflare R2**

This assumes you're using **Strapi v4+** with a **Cloudflare R2 upload
provider plugin**.

#### **1. Install Required Plugin (Strapi Upload Provider for R2)**

****npm install strapi-provider-upload-r2 \--save

#### **2. Configure Plugin in ./config/plugins.ts**

****import { env } from \'@strapi/utils\';

export default ({ env }) =\> ({

upload: {

config: {

provider: \'r2\',

providerOptions: {

accessKeyId: env(\'R2_ACCESS_KEY_ID\'),

secretAccessKey: env(\'R2_SECRET_ACCESS_KEY\'),

endpoint: env(\'R2_ENDPOINT\'),

bucket: env(\'R2_BUCKET\'),

publicUrl: env(\'R2_PUBLIC_URL\'),

},

},

},

});

#### **3. Add Environment Variables to .env**

****R2_ACCESS_KEY_ID=your-access-key

R2_SECRET_ACCESS_KEY=your-secret

R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com

R2_BUCKET=your-bucket-name

R2_PUBLIC_URL=https://cdn.yourdomain.com

> 🔐 You must **rebuild Strapi** after setting the config:

npm run build && npm run start

#### **✅ Result:**

Any image uploaded via the Strapi Admin (e.g., in the Project listing
CMS fields) will be stored in Cloudflare R2, and url fields returned by
Strapi will point to R2_PUBLIC_URL.

### **🔧 Part 2: Frontend Upload via NestJS Project Publishing Flow**

If your frontend includes a **custom publish flow** (not using Strapi),
you need to:

1.  Accept media file uploads in NestJS

2.  Forward those uploads to Cloudflare R2

3.  Store the final CDN URL in Postgres or wherever project metadata is
    stored

#### **1. Dependencies (NestJS Backend)**

****npm install \@aws-sdk/client-s3 multer multer-s3

#### **2. Cloudflare S3 Upload Service (NestJS)**

/libs/cloudflare-r2/r2.service.ts

import { S3Client, PutObjectCommand } from \'@aws-sdk/client-s3\';

import { Injectable } from \'@nestjs/common\';

import { v4 as uuid } from \'uuid\';

\@Injectable()

export class R2Service {

private s3 = new S3Client({

region: \'auto\',

endpoint: process.env.R2_ENDPOINT,

credentials: {

accessKeyId: process.env.R2_ACCESS_KEY_ID,

secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,

},

});

async upload(buffer: Buffer, originalName: string, mimeType: string):
Promise\<string\> {

const key = \`projects/\${uuid()}-\${originalName}\`;

await this.s3.send(new PutObjectCommand({

Bucket: process.env.R2_BUCKET,

Key: key,

Body: buffer,

ContentType: mimeType,

ACL: \'public-read\',

}));

return \`\${process.env.R2_PUBLIC_URL}/\${key}\`;

}

}

#### **3. NestJS Controller**

****import { Controller, Post, UploadedFile, UseInterceptors } from
\'@nestjs/common\';

import { FileInterceptor } from \'@nestjs/platform-express\';

import { R2Service } from \'@/libs/cloudflare-r2/r2.service\';

\@Controller(\'projects\')

export class ProjectsController {

constructor(private readonly r2Service: R2Service) {}

\@Post(\'upload-image\')

\@UseInterceptors(FileInterceptor(\'file\'))

async uploadImage(@UploadedFile() file: Express.Multer.File) {

const url = await this.r2Service.upload(file.buffer, file.originalname,
file.mimetype);

return { url };

}

}

#### **4. Add to .env**

****R2_ACCESS_KEY_ID=your-access-key

R2_SECRET_ACCESS_KEY=your-secret

R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com

R2_BUCKET=your-bucket-name

R2_PUBLIC_URL=https://cdn.yourdomain.com



### **📦 Frontend Integration (Next.js Example)**

****// utils/uploadToBackend.ts

export async function uploadImage(file: File): Promise\<string\> {

const formData = new FormData();

formData.append(\'file\', file);

const res = await fetch(\'/api/projects/upload-image\', {

method: \'POST\',

body: formData,

});

const data = await res.json();

return data.url;

}

Use this URL to populate the project cover image field when calling
your project publishing API.

### **✅ Summary**

- Use Strapi plugin config to upload admin content to R2

- Use NestJS + S3 SDK to upload frontend files to R2

- Always store and return the public R2 URL

- Do **not** store raw file buffers or local paths
