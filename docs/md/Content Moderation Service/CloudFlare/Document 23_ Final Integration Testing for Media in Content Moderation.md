### **Document 23: Final Integration Testing for Media in Content Moderation**

#### **Overview**

These **integration tests** validate the end-to-end media moderation
flow of the **Content Moderation Microservice**, ensuring that
Cloudflare-hosted media URLs are fetched, passed to the Hugging Face
API, and correctly approved or rejected. Tests cover both:

1.  **/api/validate-media** endpoint (media-only)

2.  **/api/validate** endpoint (mixed text + media)

All tests use **Nest's TestingModule** and **Supertest**, with the
Cloudflare S3 client and Hugging Face service **mocked** to simulate
real interactions.

#### **1. Test Cases**

  -----------------------------------------------------------------------------------------------------------------------------------------------------------
  **Test Case** **Endpoint**          **Input**                                                              **Expected Result**
  ------------- --------------------- ---------------------------------------------------------------------- ------------------------------------------------
  Safe image    POST                  {\"media\":\[\"https://imagedelivery.net/ID/safe.jpg/public\"\]}       {\"status\":\"approved\",\"message\":\"All media
  approval      /api/validate-media                                                                          are safe.\"}

  Explicit      POST                  {\"media\":\[\"https://imagedelivery.net/ID/explicit.jpg/public\"\]}   {\"status\":\"rejected\",\"message\":\"Media
  image         /api/validate-media                                                                          contains explicit content.\"}
  rejection                                                                                                  

  Mixed valid   POST /api/validate    { title, description, tags, skills, media:\[safe.jpg\] }               {\"status\":\"approved\",\"message\":\"Content
  text + safe                                                                                                is clean.\"}
  media                                                                                                      

  Mixed valid   POST /api/validate    { title, description, tags, skills, media:\[explicit.jpg\] }           {\"status\":\"rejected\",\"message\":\"Media
  text +                                                                                                     contains explicit content.\"}
  explicit                                                                                                   
  media                                                                                                      

  Invalid R2    POST                  {\"media\":\[\"https://imagedelivery.net/ID/missing.jpg/public\"\]}    422 with { message:\"Unable to fetch media.\" }
  URL fetch     /api/validate-media                                                                          
  failure                                                                                                    

  Unsupported   POST                  {\"media\":\[\"https://imagedelivery.net/ID/file.txt/public\"\]}       422 with { message:\"Unsupported media format.\"
  format        /api/validate-media                                                                          }
  -----------------------------------------------------------------------------------------------------------------------------------------------------------

#### **2. Integration Test Suite**

****// test/media.integration.spec.ts

import { Test, TestingModule } from \'@nestjs/testing\';

import { INestApplication, HttpStatus } from \'@nestjs/common\';

import \* as request from \'supertest\';

import { AppModule } from \'../src/app.module\';

import { S3 } from \'aws-sdk\';

import { HuggingFaceService } from
\'../src/media/hugging-face.service\';

describe(\'Media Moderation Integration (E2E)\', () =\> {

let app: INestApplication;

let s3HeadSpy: jest.SpiedFunction\<S3\[\'headObject\'\]\>;

let hfModerateImage:
jest.SpiedFunction\<HuggingFaceService\[\'moderateImage\'\]\>;

beforeAll(async () =\> {

// Build testing module

const module: TestingModule = await Test.createTestingModule({

imports: \[AppModule\],

})

.overrideProvider(S3)

.useValue({

headObject: jest.fn().mockReturnValue({ promise: () =\>
Promise.resolve() }),

})

.overrideProvider(HuggingFaceService)

.useValue({

moderateImage: jest.fn(),

moderateVideo: jest.fn(),

})

.compile();

app = module.createNestApplication();

await app.init();

// Grab spies

const s3 = module.get\<S3\>(S3);

s3HeadSpy = jest.spyOn(s3, \'headObject\');

const hf = module.get\<HuggingFaceService\>(HuggingFaceService);

hfModerateImage = jest.spyOn(hf, \'moderateImage\');

});

afterAll(async () =\> {

await app.close();

});

it(\'approves safe image via /validate-media\', () =\> {

hfModerateImage.mockResolvedValueOnce(true);

return request(app.getHttpServer())

.post(\'/api/validate-media\')

.send({ media: \[\'https://imagedelivery.net/ID/safe.jpg/public\'\] })

.expect(HttpStatus.OK)

.expect({ status: \'approved\', message: \'All media are safe.\' });

});

it(\'rejects explicit image via /validate-media\', () =\> {

hfModerateImage.mockResolvedValueOnce(false);

return request(app.getHttpServer())

.post(\'/api/validate-media\')

.send({ media: \[\'https://imagedelivery.net/ID/explicit.jpg/public\'\]
})

.expect(HttpStatus.OK)

.expect({ status: \'rejected\', message: \'Media contains explicit
content.\' });

});

it(\'handles fetch failure for missing R2 URL\', () =\> {

s3HeadSpy.mockReturnValueOnce({ promise: () =\> Promise.reject(new
Error(\'Not Found\')) });

return request(app.getHttpServer())

.post(\'/api/validate-media\')

.send({ media: \[\'https://imagedelivery.net/ID/missing.jpg/public\'\]
})

.expect(HttpStatus.UNPROCESSABLE_ENTITY)

.expect(res =\> {

expect(res.body.message).toBe(\'Unable to fetch media.\');

});

});

it(\'returns 422 for unsupported format\', () =\> {

return request(app.getHttpServer())

.post(\'/api/validate-media\')

.send({ media: \[\'https://imagedelivery.net/ID/file.txt/public\'\] })

.expect(HttpStatus.UNPROCESSABLE_ENTITY)

.expect(res =\> {

expect(res.body.message).toBe(\'Unsupported media format.\');

});

});

it(\'approves mixed content via /api/validate\', () =\> {

hfModerateImage.mockResolvedValueOnce(true);

return request(app.getHttpServer())

.post(\'/api/validate\')

.send({

title: \'Test\',

description: \'Desc\',

tags: \[\'a\'\],

skills: \[\'b\'\],

media: \[\'https://imagedelivery.net/ID/safe.jpg/public\'\],

})

.expect(HttpStatus.OK)

.expect({ status: \'approved\', message: \'Content is clean.\' });

});

it(\'rejects mixed content with explicit media via /api/validate\', ()
=\> {

hfModerateImage.mockResolvedValueOnce(false);

return request(app.getHttpServer())

.post(\'/api/validate\')

.send({

title: \'Test\',

description: \'Desc\',

tags: \[\'a\'\],

skills: \[\'b\'\],

media: \[\'https://imagedelivery.net/ID/explicit.jpg/public\'\],

})

.expect(HttpStatus.OK)

.expect({ status: \'rejected\', message: \'Media contains explicit
content.\' });

});

});



#### **3. Running Tests**

****npm run test:e2e

Ensure the suite passes; if any integration check fails, inspect logs
for mismatched key extraction, HTTP statuses, or Hugging Face responses.
