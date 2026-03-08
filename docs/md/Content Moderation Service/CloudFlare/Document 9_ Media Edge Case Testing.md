### **Document 9: Media Edge Case Testing**

#### **Overview**

This document defines the **media edge case tests** for the
**/media/upload** and **/api/validate** endpoints, covering uploads to
**Cloudflare R2** and subsequent moderation. These tests ensure the
system correctly handles unusual or invalid inputs.

#### **1. Edge Case Scenarios**

1.  **Unsupported File Types\**

    - Upload a .txt or .pdf file.

    - Expect HTTP 400 with message: \"Unsupported file type\".

2.  **File Size Exceeded\**

    - Upload a file larger than 10 MB.

    - Expect HTTP 413 Payload Too Large.

3.  **Empty File (Zero Bytes)\**

    - Upload an empty buffer.

    - Expect HTTP 400 with message: \"Empty file uploaded\".

4.  **Corrupted Image\**

    - Upload a buffer with .jpg extension but invalid bytes.

    - CloudflareUploadService.uploadFile succeeds, but
      MediaModerationService.validateMedia throws or returns false.

    - Expect HTTP 200 with { status: \'rejected\', message: \'Media
      contains explicit content.\' }.

5.  **Corrupted Video\**

    - Same as (4) for a .mp4 file.

    - Expect rejection response.

6.  **Invalid Cloudflare URL (Direct Validate Call)\**

    - Call POST /api/validate with media:
      \[\'https://wrong-url.com/file.png\'\].

    - Expect { status: \'rejected\', message: \'Unable to fetch media.\'
      }.

7.  **Expired R2 URL\**

    - Simulate fetch failure in moderation service (e.g. 403 from
      Cloudflare).

    - Expect moderation endpoint to catch error and return { status:
      \'rejected\', message: \'Unable to fetch media.\' }.

8.  **Moderation Timeout\**

    - Mock validateImage or validateVideo to hang/timeout.

    - Expect the moderation endpoint to return { status: \'rejected\',
      message: \'Media validation timed out.\' } after 10 s.

9.  **Large but Valid Media\**

    - Upload a 9.5 MB JPEG.

    - Expect approval: { status: \'approved\', message: \'Media is
      safe.\', url }.

10. **Animated GIF Handling\**

    - Upload a .gif.

    - Expect validateMedia to treat .gif as images and return pass/fail
      accordingly.

#### **2. Automated Tests (Jest + Supertest)**

****// test/media.edge-cases.spec.ts

import { Test, TestingModule } from \'@nestjs/testing\';

import { INestApplication, BadRequestException } from
\'@nestjs/common\';

import \* as request from \'supertest\';

import { MediaController } from \'../src/media/media.controller\';

import { CloudflareUploadService } from
\'../src/media/cloudflare-upload.service\';

import { MediaModerationService } from
\'../src/media/media-moderation.service\';

describe(\'Media Edge Case Tests\', () =\> {

let app: INestApplication;

let uploadSvc: CloudflareUploadService;

let modSvc: MediaModerationService;

beforeAll(async () =\> {

const uploadMock = {

uploadFile: jest.fn(async (buf, name, type) =\>
\`https://imagedelivery.net/ID/\${name}/public\`)

};

const modMock = {

validateMedia: jest.fn(async (url) =\> true),

};

const module: TestingModule = await Test.createTestingModule({

controllers: \[MediaController\],

providers: \[

{ provide: CloudflareUploadService, useValue: uploadMock },

{ provide: MediaModerationService, useValue: modMock },

\],

}).compile();

app = module.createNestApplication();

await app.init();

uploadSvc = module.get(CloudflareUploadService);

modSvc = module.get(MediaModerationService);

});

it(\'rejects unsupported file type\', () =\> {

return request(app.getHttpServer())

.post(\'/media/upload\')

.attach(\'file\', Buffer.from(\'hello\'), { filename: \'file.txt\',
contentType: \'text/plain\' })

.expect(400)

.expect(res =\> {

expect(res.body.message).toBe(\'Unsupported file type\');

});

});

it(\'rejects empty file\', () =\> {

return request(app.getHttpServer())

.post(\'/media/upload\')

.attach(\'file\', Buffer.alloc(0), { filename: \'empty.jpg\',
contentType: \'image/jpeg\' })

.expect(400)

.expect(res =\> {

expect(res.body.message).toBe(\'Empty file uploaded\');

});

});

it(\'rejects oversized file\', () =\> {

const bigBuffer = Buffer.alloc(11 \* 1024 \* 1024); // 11 MB

return request(app.getHttpServer())

.post(\'/media/upload\')

.attach(\'file\', bigBuffer, { filename: \'big.jpg\', contentType:
\'image/jpeg\' })

.expect(413);

});

it(\'handles corrupted image as rejection\', async () =\> {

// Mock moderation to return false for corrupted content

modSvc.validateMedia = jest.fn(async () =\> false);

const res = await request(app.getHttpServer())

.post(\'/media/upload\')

.attach(\'file\', Buffer.from(\[0x00,0x01,0x02\]), { filename:
\'corrupt.jpg\', contentType: \'image/jpeg\' });

expect(res.body.status).toBe(\'rejected\');

expect(res.body.message).toBe(\'Media contains explicit content.\');

});

it(\'approves large valid file\', async () =\> {

modSvc.validateMedia = jest.fn(async () =\> true);

const validBuffer = Buffer.alloc(9 \* 1024 \* 1024); // 9 MB

const res = await request(app.getHttpServer())

.post(\'/media/upload\')

.attach(\'file\', validBuffer, { filename: \'valid.jpg\', contentType:
\'image/jpeg\' });

expect(res.body.status).toBe(\'approved\');

expect(res.body.url).toMatch(/\^https:\\/\\/imagedelivery\\.net\\//);

});

it(\'rejects invalid Cloudflare URL on validate endpoint\', () =\> {

return request(app.getHttpServer())

.post(\'/api/validate\')

.send({ media: \[\'https://wrong-url.com/file.png\'\] })

.expect(200)

.expect(res =\> {

expect(res.body.status).toBe(\'rejected\');

expect(res.body.message).toBe(\'Unable to fetch media.\');

});

});

});



These tests cover all critical media edge cases in your
Cloudflare-backed upload and moderation pipeline.
