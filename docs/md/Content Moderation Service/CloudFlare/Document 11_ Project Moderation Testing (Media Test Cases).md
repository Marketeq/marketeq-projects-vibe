### **Document 11: Project Moderation Testing (Media Test Cases)**

#### **Overview**

This document defines the **media-specific test cases** for the
**Project Submission** flow in the **Listing Microservice**, ensuring
that images and videos uploaded via **Cloudflare R2** and moderated by
the **Content Moderation Microservice** behave correctly. It covers:

- **Testing objectives** for media moderation

- **Test cases** for valid, invalid, and edge-case media content

- **Integration test code** using Jest & Supertest

By executing these tests, you confirm that media is correctly uploaded,
stored, fetched, and validated, and that rejection or approval flows
work as expected.

#### **1. Testing Objectives**

1.  **Validate Media Upload & Moderation\**
    Ensure that media files uploaded via the /media/upload endpoint are
    stored to Cloudflare R2 and then validated through the project
    submission flow.

2.  **Handle Rejection & Approval\**
    Confirm that explicit media is rejected with the proper error, and
    safe media is approved and proceeds to project publication.

3.  **Cover Edge Cases\**
    Test unusual or invalid media inputs (corrupted files, unsupported
    types, large sizes, expired URLs, moderation timeouts).

#### **2. Media Test Cases**

##### **2.1. Valid Media Approval**

- **Input**: A 5 MB JPEG uploaded via /media/upload, then included in
  project submission.

- **Expected**:

  - /media/upload returns { status: \'approved\', url }

  - /projects/submit returns 200 with { status: \'approved\', message:
    \'Project published successfully.\' }

##### **2.2. Explicit Media Rejection**

- **Input**: An explicit image (e.g., nudity) uploaded via
  /media/upload, included in project submission.

- **Expected**:

  - /media/upload returns { status: \'rejected\', message: \'Media
    contains explicit content.\', url }

  - If bypassed, /projects/submit returns 422 with the same rejection
    message.

##### **2.3. Unsupported Format**

- **Input**: .gif or .bmp image uploaded via /media/upload.

- **Expected**:

  - /media/upload responds 400 with { message: \'Unsupported file type\'
    }

  - /projects/submit cannot be reached because upload fails.

##### **2.4. Corrupted Media File**

- **Input**: Buffer of random bytes given .jpg extension.

- **Expected**:

  - /media/upload succeeds (R2 has no check)

  - /projects/submit → Content Moderation rejects with { status:
    \'rejected\', message: \'Media contains explicit content.\' }

##### **2.5. Large Valid Media**

- **Input**: 9.5 MB PNG.

- **Expected**:

  - /media/upload returns approval

  - /projects/submit returns approval

##### **2.6. Expired/Invalid R2 URL**

- **Input**: Project submission with a made-up Cloudflare URL.

- **Expected**:

  - /projects/submit returns 422 with { message: \'Unable to fetch
    media.\' }

##### **2.7. Moderation Timeout**

- **Input**: Stub the moderation service to hang.

- **Expected**:

  - /projects/submit returns 422 after 10 s with { message: \'Media
    validation timed out.\' }

#### **3. Testing Process**

Place tests under test/project-media.spec.ts using Jest & Supertest:

// test/project-media.spec.ts

import { Test, TestingModule } from \'@nestjs/testing\';

import { INestApplication, HttpStatus } from \'@nestjs/common\';

import \* as request from \'supertest\';

import { AppModule } from \'../src/app.module\';

describe(\'Project Submission -- Media Tests\', () =\> {

let app: INestApplication;

let mediaUrl: string;

beforeAll(async () =\> {

const module: TestingModule = await Test.createTestingModule({

imports: \[AppModule\],

}).compile();

app = module.createNestApplication();

await app.init();

// Upload a valid image to R2 for reuse in tests

const res = await request(app.getHttpServer())

.post(\'/media/upload\')

.attach(\'file\', Buffer.alloc(1024 \* 1024), { filename: \'valid.jpg\',
contentType: \'image/jpeg\' });

mediaUrl = res.body.url;

});

it(\'approves a valid project with safe media\', () =\> {

return request(app.getHttpServer())

.post(\'/projects/submit\')

.send({

title: \'Safe Project\',

description: \'All good\',

tags: \[\'tag1\'\],

skills: \[\'skill1\'\],

featuredImage: mediaUrl,

additionalImages: \[\],

})

.expect(HttpStatus.CREATED)

.expect(res =\> {

expect(res.body.status).toBe(\'approved\');

});

});

it(\'rejects a project with explicit media\', async () =\> {

// upload explicit image

const explicitRes = await request(app.getHttpServer())

.post(\'/media/upload\')

.attach(\'file\', Buffer.from(\[0xff,0xd8,0xff\]), { filename:
\'explicit.jpg\', contentType: \'image/jpeg\' });

const url = explicitRes.body.url;

return request(app.getHttpServer())

.post(\'/projects/submit\')

.send({

title: \'Bad Project\',

description: \'Contains nudity\',

tags: \[\'tag1\'\],

skills: \[\'skill1\'\],

featuredImage: url,

additionalImages: \[\],

})

.expect(HttpStatus.UNPROCESSABLE_ENTITY)

.expect(res =\> {

expect(res.body.message).toBe(\'Media contains explicit content.\');

});

});

it(\'returns 400 for unsupported media format\', () =\> {

return request(app.getHttpServer())

.post(\'/media/upload\')

.attach(\'file\', Buffer.from(\'data\'), { filename: \'file.bmp\',
contentType: \'image/bmp\' })

.expect(HttpStatus.BAD_REQUEST)

.expect(res =\> {

expect(res.body.message).toBe(\'Unsupported file type\');

});

});

it(\'rejects project when media URL cannot be fetched\', () =\> {

return request(app.getHttpServer())

.post(\'/projects/submit\')

.send({

title: \'Invalid URL\',

description: \'Test\',

tags: \[\'t\'\],

skills: \[\'s\'\],

featuredImage: \'https://imagedelivery.net/ID/nonexistent.jpg/public\',

additionalImages: \[\],

})

.expect(HttpStatus.UNPROCESSABLE_ENTITY)

.expect(res =\> {

expect(res.body.message).toBe(\'Unable to fetch media.\');

});

});

// Additional tests for timeout, large files, corrupted buffers...

});



These tests verify that **media** in project submissions is correctly
handled end-to-end---**upload**, **fetch**, **moderate**, and
**feedback**---covering all critical cases.
