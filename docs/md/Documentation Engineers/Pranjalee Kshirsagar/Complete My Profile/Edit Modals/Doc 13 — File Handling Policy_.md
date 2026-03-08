# **File Handling Policy** 

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Service:** apps/user-service (expand existing user service)\
**Scope for this sprint:** **No file uploads.** Profile image/editing is
**explicitly out of scope**. Only **JSON** requests are accepted across
all profile-edit endpoints.

## **1) Policy Summary**

- **Inbound files:** **Not accepted**. No multipart/form-data, no binary
  streams.

- **Accepted content type:** application/json; charset=utf-8.

- **Portfolio links:** URLs only (see **Doc 04F**). No fetching, no
  scraping, no storing remote content.

- **About/Experience/Education descriptions:** sanitized **HTML
  strings** in JSON (see **Doc 04A/C/D**).

- **Storage buckets (S3/GCS) & scanners:** **Not configured** in this
  sprint.

- **PII egress:** None related to files.

## **2) Request Guards (Reject non-JSON)**

Add a simple guard/middleware to reject multipart/form-data and other
non-JSON bodies for all /v1/users/:userId/profile/\* routes.

  ------------------------------------------------------------------------
  // language: typescript\
  //
  apps/user-service/src/common/middleware/reject-non-json.middleware.ts\
  import { Injectable, NestMiddleware, UnsupportedMediaTypeException }
  from \'@nestjs/common\';\
  import type { Request, Response, NextFunction } from \'express\';\
  \
  \@Injectable()\
  export class RejectNonJsonMiddleware implements NestMiddleware {\
  use(req: Request, \_res: Response, next: NextFunction) {\
  const ct = (req.headers\[\'content-type\'\] \|\| \'\').toLowerCase();\
  // Allow GET/DELETE without body; enforce JSON on POST/PATCH\
  if (req.method === \'POST\' \|\| req.method === \'PATCH\') {\
  if (!ct.startsWith(\'application/json\')) {\
  throw new UnsupportedMediaTypeException({\
  code: \'VALIDATION_ERROR\',\
  message: \'Only application/json is supported.\',\
  details: \[{ field: \'content-type\', reason: \'UNSUPPORTED\' }\]\
  });\
  }\
  }\
  next();\
  }\
  }
  ------------------------------------------------------------------------

  ------------------------------------------------------------------------

Register once at bootstrap:

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/main.ts (excerpt)\
  import { RejectNonJsonMiddleware } from
  \'@/common/middleware/reject-non-json.middleware\';\
  import \* as bodyParser from \'body-parser\';\
  \
  async function bootstrap() {\
  const app = await NestFactory.create(AppModule);\
  \
  // Body size limits (defensive; adjust if needed)\
  app.use(bodyParser.json({ limit: \'128kb\' }));\
  app.use(bodyParser.urlencoded({ extended: false, limit: \'64kb\' }));\
  \
  // Apply middleware to profile-edit routes\
  app.use(\'/v1/users\', new RejectNonJsonMiddleware().use);\
  \
  await app.listen(process.env.PORT \|\| 3000);\
  }\
  bootstrap();
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **3) Explicit API Contract Notes**

- **All POST/PATCH endpoints** in Docs 04A--04F accept **JSON only**.

Error on non-JSON:

  -----------------------------------------------------------------------
  {\
  \"code\": \"VALIDATION_ERROR\",\
  \"message\": \"Only application/json is supported.\",\
  \"details\": \[{ \"field\": \"content-type\", \"reason\":
  \"UNSUPPORTED\" }\]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- 

- **No binary fields** in DTOs. Any field implying a file (e.g., image,
  file, blob, base64) must be **rejected** with VALIDATION_ERROR.

## **4) Security Posture (this sprint)**

- **No file ingestion → no AV scanning needed** (e.g., ClamAV) in this
  sprint.

- **No transient disk writes** from requests.

- **No remote URL fetching** (portfolio URLs are stored and normalized
  only).

## **5) Future Hooks (non-blocking placeholders)**

These are stubs only (not wired this sprint), to keep future work
isolated:

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/common/files/file-storage.port.ts\
  export interface FileStoragePort {\
  putObject(\_key: string, \_bytes: Uint8Array, \_contentType: string):
  Promise\<{ url: string }\>;\
  deleteObject(\_key: string): Promise\<void\>;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/common/files/noop-storage.adapter.ts\
  export class NoopStorage implements FileStoragePort {\
  async putObject(): Promise\<{ url: string }\> { throw new
  Error(\'FILES_OUT_OF_SCOPE\'); }\
  async deleteObject(): Promise\<void\> { /\* noop \*/ }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

*Do not* inject these anywhere in this sprint.

## **6) Tests (minimum)**

- **Reject non-JSON:** POST/PATCH with multipart/form-data ⇒ 415 mapped
  to our envelope.

- **Size guard:** payloads \> configured body limit ⇒ framework error
  mapped by our global filter.

- **Portfolio URL:** ensure we never attempt outbound fetches; only
  normalization and DB write (Doc 04F).

- **HTML fields:** validate sanitization remains string-only (no file
  refs).

## **7) Operational Notes**

- No object storage credentials required (AWS\_\*, GCP\_\*) for this
  sprint.

- No CDN or signed-URL config.

- No changes to deployment manifests related to file handling.
