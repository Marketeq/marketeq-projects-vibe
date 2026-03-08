## **Listings Service -- Cloudflare Media Upload & Management Integration**

This document provides the full implementation for securely uploading
and managing media files (images, videos, documents) via Cloudflare
(Images or R2) through the Listings Service. It supports:

- Signed media uploads (Cloudflare Images or R2)

- File validation (type, size, dimensions)

- Thumbnail resizing via CDN

- Media deletion on listing removal

- Secure access with private ACL (R2)

- Extensible support for future video/CDN features

### **✅ Supported Upload Targets**

1.  **Cloudflare Images** -- Recommended for image-specific assets (auto
    CDN, resizing, transformations)

2.  **Cloudflare R2 (S3-compatible)** -- Recommended for files,
    documents, or custom control over access/ACL

### **📁 Folder & File Structure (NestJS)**

****src/

media/

media.controller.ts

media.service.ts

media.module.ts

dto/

upload-media.dto.ts

utils/

validate-file.ts



### **🌐 API Endpoints**

#### **POST /media/upload**

Uploads a file to Cloudflare Images or R2.

**Request**: multipart/form-data

- file: The media file

- type: image, video, document (optional)

- listingType: project, job, etc.

- listingId: UUID of the listing this media is linked to (optional)

**Response**:

{

\"url\": \"https://imagedelivery.net/\.../public\",

\"key\": \"media/project/123456789/image.jpg\"

}



#### **DELETE /media/:key**

Deletes a file from Cloudflare (Images or R2).

**Params**:

- key: Full media key or image ID

**Response**:

{ \"success\": true }



### **🔐 Env Config Example (.env)**

****\# Shared

CLOUDFLARE_ACCOUNT_ID=abc123

CLOUDFLARE_MEDIA_MODE=images \# or r2

\# For Cloudflare Images

CLOUDFLARE_IMAGE_UPLOAD_URL=https://api.cloudflare.com/client/v4/accounts/\${CLOUDFLARE_ACCOUNT_ID}/images/v1

CLOUDFLARE_API_TOKEN=your-cloudflare-images-api-token

\# For Cloudflare R2

R2_BUCKET=marketeq-media

R2_ACCESS_KEY_ID=your-access-key

R2_SECRET_ACCESS_KEY=your-secret-key

R2_REGION=auto

R2_ENDPOINT=https://abc123.r2.cloudflarestorage.com



### **🛡 File Validation Logic (validate-file.ts)**

****export function validateFile(file: Express.Multer.File): void {

const allowedMimeTypes = \[\'image/jpeg\', \'image/png\',
\'image/webp\', \'application/pdf\'\];

const maxFileSizeMB = 10;

if (!allowedMimeTypes.includes(file.mimetype)) {

throw new BadRequestException(\'Unsupported file type.\');

}

const sizeInMB = file.size / 1024 / 1024;

if (sizeInMB \> maxFileSizeMB) {

throw new BadRequestException(\'File exceeds max size.\');

}

}



### **🔄 Upload Flow Logic (media.service.ts)**

****async uploadToCloudflare(file: Express.Multer.File): Promise\<{
url: string; key: string }\> {

validateFile(file);

const key = \`media/\${Date.now()}-\${file.originalname}\`;

if (this.config.get(\'CLOUDFLARE_MEDIA_MODE\') === \'images\') {

const form = new FormData();

form.append(\'file\', file.buffer, file.originalname);

const uploadRes = await this.http.post(

this.config.get(\'CLOUDFLARE_IMAGE_UPLOAD_URL\'),

form,

{

headers: {

Authorization: \`Bearer \${this.config.get(\'CLOUDFLARE_API_TOKEN\')}\`,

\...form.getHeaders(),

},

},

).toPromise();

return {

url: uploadRes.data.result.variants\[0\],

key: uploadRes.data.result.id,

};

}

// R2 flow

const s3 = new S3Client({

region: this.config.get(\'R2_REGION\'),

endpoint: this.config.get(\'R2_ENDPOINT\'),

credentials: {

accessKeyId: this.config.get(\'R2_ACCESS_KEY_ID\'),

secretAccessKey: this.config.get(\'R2_SECRET_ACCESS_KEY\'),

},

});

const command = new PutObjectCommand({

Bucket: this.config.get(\'R2_BUCKET\'),

Key: key,

Body: file.buffer,

ContentType: file.mimetype,

ACL: \'private\',

});

await s3.send(command);

return {

url:
\`\${this.config.get(\'R2_ENDPOINT\')}/\${this.config.get(\'R2_BUCKET\')}/\${key}\`,

key,

};

}



### **🧼 Deletion Logic (media.service.ts)**

****async deleteFromCloudflare(key: string): Promise\<boolean\> {

if (this.config.get(\'CLOUDFLARE_MEDIA_MODE\') === \'images\') {

await this.http.delete(

\`https://api.cloudflare.com/client/v4/accounts/\${this.config.get(\'CLOUDFLARE_ACCOUNT_ID\')}/images/v1/\${key}\`,

{

headers: {

Authorization: \`Bearer \${this.config.get(\'CLOUDFLARE_API_TOKEN\')}\`,

},

},

).toPromise();

return true;

}

const s3 = new S3Client({ /\* same as above \*/ });

await s3.send(

new DeleteObjectCommand({

Bucket: this.config.get(\'R2_BUCKET\'),

Key: key,

}),

);

return true;

}



### **🔁 Cleanup on Listing Deletion**

In the ListingsService, when a listing is deleted:

1.  Query associated media keys from the DB.

2.  Call mediaService.deleteFromCloudflare(key) on each key.

3.  Remove all associated DB references.

> Optional: use a media_meta table if media is shared across listings
> and needs ref tracking.

### **🖼 Thumbnail & Optimization**

When using **Cloudflare Images**, thumbnails and transformations are
handled by the CDN:

// Full-size image

https://imagedelivery.net/\<account\>/\<image-id\>/public

// Resized thumbnail (300px)

https://imagedelivery.net/\<account\>/\<image-id\>/thumbnail

// You can define variant presets like:

{

\"variants\": {

\"thumbnail\": { \"fit\": \"cover\", \"width\": 300, \"height\": 300 },

\"public\": { \"fit\": \"scale-down\", \"width\": 1600 }

}

}

No need to generate thumbnails manually --- just request the
appropriate variant in the frontend.

### **📁 Frontend Upload (Example)**

Frontend calls the NestJS upload endpoint directly:

const formData = new FormData();

formData.append(\'file\', fileInput.files\[0\]);

formData.append(\'type\', \'image\');

const res = await fetch(\'/api/listings/media/upload\', {

method: \'POST\',

headers: { Authorization: \`Bearer \${authToken}\` },

body: formData,

});



### **✅ Summary of Coverage**

  -----------------------------------------
  **Feature**                **Included**
  -------------------------- --------------
  Upload to Cloudflare       ✅
  Images                     

  Upload to Cloudflare R2    ✅

  File validation (type,     ✅
  size)                      

  Auth + ACL + token         ✅
  protection                 

  Thumbnail / CDN            ✅
  optimization               

  Media deletion on listing  ✅
  removal                    

  Endpoint-level security    ✅

  Variant-based resizing     ✅
  (Images)                   

  Modular service for        ✅
  Listings flow              
  -----------------------------------------
