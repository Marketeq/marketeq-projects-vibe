## **☁️ Cloudflare Media Storage Setup Guide**

This guide outlines how to configure **Cloudflare R2** for storing media
assets (images and videos) submitted during project publishing.\
It assumes you are hosting the backend on **Heroku** and using
**Cloudflare R2** instead of AWS S3 to reduce cost.

### **✅ Use Case**

- Upload media assets from the frontend (/publish-project form)

- Store images and videos used in:

  - Project media carousel

  - Featured image

  - Optional project video (hosted externally or uploaded)

### **🪜 Step-by-Step Setup**

#### **1. Create a Cloudflare Account**

- Visit [[cloudflare.com]{.underline}](https://www.cloudflare.com/) and
  create an account (if you don't already have one).\
  \
  Use Email:
  [[developers@marketeqdigital.com]{.underline}](mailto:developers@marketeqdigital.com)

#### **2. Enable R2**

- In the Cloudflare dashboard, go to **R2 \> Buckets\**

- Click **Create Bucket\**

  - Bucket name: marketeq-media

  - Region: choose auto or preferred region

#### **3. Generate API Credentials**

- Go to **My Profile \> API Tokens\**

- Click **Create Token** \> Use template: *Edit Cloudflare R2 Bucket
  Permissions\*

- Assign permissions:

  - Account: Select your account

  - Permissions: Edit, Read, Write

- Save your Access Key ID and Secret Access Key

#### **4. Install SDK for Uploads (Backend)**

In your **NestJS backend**:

npm install aws-sdk

#### **5. Configure R2 in NestJS (S3-Compatible)**

Create a service like cloudflare-storage.service.ts

import AWS from \'aws-sdk\';

const r2 = new AWS.S3({

endpoint: \'https://\<your-account-id\>.r2.cloudflarestorage.com\',

accessKeyId: process.env.R2_ACCESS_KEY,

secretAccessKey: process.env.R2_SECRET_KEY,

region: \'auto\',

signatureVersion: \'v4\'

});

export const uploadMedia = async (fileBuffer, fileName, contentType) =\>
{

return r2.upload({

Bucket: \'marketeq-media\',

Key: fileName,

Body: fileBuffer,

ContentType: contentType,

ACL: \'public-read\'

}).promise();

};

#### **6. Set ENV Variables on Heroku**

****R2_ACCESS_KEY=your-access-key

R2_SECRET_KEY=your-secret-key

Add these to your Heroku project config (heroku config:set)

### **📤 Frontend Upload Strategy**

- Use a pre-signed upload endpoint OR stream uploads via the backend

- Enforce max file size and MIME type checks in frontend UI and backend
  validation

### **📎 Notes**

- Cloudflare R2 is 100% S3 compatible

- You can use the same codebase used for AWS S3 --- just change the
  endpoint

- Set ACL: \'public-read\' to make assets visible from your frontend

- Use a CDN like **Cloudflare Images** or **Cloudflare CDN** to serve
  assets efficiently

> Store thumbnails, featured images, and carousel media using R2. Avoid
> inline base64 images or frontend caching beyond CDN for performance
> reasons.
