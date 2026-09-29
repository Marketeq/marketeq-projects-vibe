__04 — IDENTITY VERIFICATION API SPECIFICATION__

*REST Endpoints, DTOs, Validation & Error Shapes — identity\-verification\-service*

__Epic: __Identity Verification

__Document Role: __Production\-ready implementation doc: every REST endpoint, request/response DTO, validation rule, and error shape for identity\-verification\-service, built directly against the entities defined in Doc 03\.

__Prerequisites: __Doc 03 — Data Model & Database Schema \(built and smoke\-tested\), 00–02 \(Service Overview, Technical Architecture, Feature List — backend\), Identity Verification Decision Record \(31 Aug 2026\)

__Author: __CTO — written for a developer building this microservice for the first time

__Status: __Final — ready to implement

__Date: __1 September 2026

__UPDATE — 16 SEPTEMBER 2026__

Applies eight documentation\-only corrections from the Document 04 final verification \(16 Sep 2026\); none change any existing route, HTTP method, auth requirement, error code, or unrelated DTO field\. InternalStatusResponseDto \(Section 5e\) gains a computed isVerified boolean \(TRVG §2, §4\.1\) — a field name this document proposes, not a sourced identifier; this service still does not compute in\_marketplace\(account\) or enforce gates G1–G6 \(TRVG §2\.4\)\. Section 8b clarifies that this internal\-auth\-only endpoint may return raw statuses to authorized internal services, and that the calling service is responsible for applying TRVG §6's consumer\-scoping rules before any of it reaches an actual end user — no new endpoint, parameter, or claim is added\. documentNumberNormalized \(Step 4d entity comment, Section 8 checklist\) is corrected from “trim \+ uppercase” to a one\-way hash, matching Doc 03's 16 September revision; the algorithm remains pending Security/Engineering and the hash is never exposed through this API\. Section 9 gains an open\-item note that “remaining attempts” \(TRVG §6\) is not yet exposed, pending Doc 03's unresolved attempt\_count scope question — no field is added\. Section 4 gains a rate\-limiting requirement for POST \.\.\./documents \(TRVG §6\.1\), with no threshold, enforcement layer, or error code invented\. The Section 8 startVerificationSession checklist gains both the retry\-budget scope caveat \(Doc 03 §8b open question\) and a vendor\-failure\-isolation cross\-reference \(TRVG §5; Doc 03 §8c\); Section 7's VENDOR\_UNAVAILABLE row gains the same cross\-reference\. Two Architecture Overview citations are split to distinguish the auth\-service service\-inventory entry from §7\.2's shared\-code guidance\. The Decision Record authority question, SVC\-24 internal\-review access, and all Christopher/Security/Engineering open items remain exactly as open as before\.

Update — 18 September 2026 \(consistency check against Doc 02/03/05/10’s TRVG2 updates, not a scope change\): the in\_marketplace\(account\)/G1–G6 comments below are corrected — TRVG2 replaces that model entirely with gate\_open\(account\) := is\_verified\(account\) OR in\_grace\(account\) across nine gates \(G1–G9, TRVG2 §2\); this service still does not compute or enforce any of them \(unchanged\)\. Doc 03 §8b’s attempt\-count scope, cited below as open, is resolved — account\-wide \(Answer 3; TRVG2 §2 gate\-table note\) — and Doc 05 has been updated accordingly\. SVC\-24, cited below as open, is resolved by Answer 4 \(Doc 10’s revised design\)\. Section 9’s “remaining attempts” note is otherwise unchanged — that field still is not exposed by this API, which is a separate, still\-open gap from the scope question\. No route, DTO identifier, or field is added or removed by this note\.

__UPDATE — 17 SEPTEMBER 2026__

Corrects one stale citation identified by the Identity Verification Final Cross\-Document Audit \(Finding 11\): Section 9’s “10\. What’s Next” list previously described the Setup & Bootstrapping document’s number as still unconfirmed\. It is Document 06 — Identity Verification Setup & Bootstrapping, per the Required Docs Checklist’s locked numbering and Document 06’s own self\-identification; the bullet now names it directly\. No other content in this document was changed\.

__UPDATE — 29 SEPTEMBER 2026__

Documents the existing user\-facing route GET /v1/identity\-verification/accepted\-documents, which was implemented before this document described it, and records that it is now backed by a real, versioned country/document coverage catalog instead of always returning 503\. Additive documentation only; no existing route, DTO field, or error code is changed\. See Section 5f and the Section 6 route table\.

# __1\. Purpose & Scope__

This document defines the complete HTTP API surface of identity\-verification\-service: every route, its authentication requirement, its request and response shapes, its validation rules, and every error it can return\. It contains full, copy\-pasteable NestJS controller and DTO code\.

This document does NOT cover: the actual business logic behind each endpoint — the duplicate\-detection transaction, the Didit vendor session orchestration, the webhook signature verification and payload handling, or the Travel Mode reminder scheduler \(all Doc 05 — Business Logic & Workflows\)\. To keep this document's routes runnable and its DTOs testable on their own, every controller here calls a service layer whose method bodies are placeholders that Doc 05 fills in — Section 4 explains this split and why it keeps both documents honest about what they actually deliver\.

__HOW THIS DOCUMENT USES ITS SOURCES__

Every DTO field, enum, and validation rule below reuses the exact entities, enums, and column definitions from Doc 03 — nothing here redefines or duplicates that schema\. Where this document adds something Doc 03 didn't specify \(an upload\-URL flow, an error\-code taxonomy, guard placeholders, the webhook's request shape\), it is called out in Section 4 and never presented as an already\-confirmed requirement\.

# __2\. Prerequisites__

- Doc 03 — Data Model & Database Schema fully built: the three entities exist, the migration has run, and its smoke test passes\. Every DTO in this document imports directly from apps/identity\-verification\-service/src/entities/\.
- The same apps/identity\-verification\-service/ scaffold and DATABASE\_URL setup from Doc 03, Steps 1–2\.
- Basic familiarity with HTTP concepts \(methods, status codes, headers\) and the terminal\. No prior NestJS validation/DTO experience is assumed — every pattern below is explained\.

# __3\. What You're Building__

Eleven endpoints across three controllers, grouped by who calls them:

__User\-facing \(bearer auth — the logged\-in end user, via the frontend\)__

- GET /v1/identity\-verification/me — current profile status\.
- POST /v1/identity\-verification/home\-country/confirm — confirm the detected country as home country \(SVC\-02\)\.
- POST /v1/identity\-verification/travel\-classification — declare Temporarily Traveling / Permanently Relocated \(SVC\-04\)\.
- POST /v1/identity\-verification/travel\-duration — declare travel duration, activates Travel Mode \(SVC\-05\)\.
- POST /v1/identity\-verification/documents/upload\-url — get a pre\-signed URL to upload a document image\.
- POST /v1/identity\-verification/documents — submit document metadata \(SVC\-08, SVC\-09, SVC\-11\)\.
- POST /v1/identity\-verification/documents/:documentId/verify — start a Didit verification session \(SVC\-14, SVC\-21\)\.
- GET /v1/identity\-verification/documents — list the current user's submitted documents\.
- GET /v1/identity\-verification/accepted\-documents?issuingCountry=US — which canonical document types are accepted for an issuing country \(Section 5f\)\.

__Internal \(internal auth — other Marketeq services\)__

- GET /v1/internal/identity\-verification/status/:userId — synchronous status read for a gating action \(SVC\-20\)\.

__Vendor webhook \(HMAC signature — Didit's servers call this, not a user\)__

- POST /v1/identity\-verification/webhooks/didit — inbound verification\-session result \(SVC\-30\)\.

Routes are versioned under /v1, and every non\-2xx response uses one shared error shape \(\{ code, message, details? \}\) — both per Marketeq's platform convention \(Architecture Overview §7\.3–7\.4\), applied without deviation\.

# __4\. Engineering Decisions Made in This Document__

None of these are Product or vendor decisions\. Each is the narrowest choice needed to ship a working, testable API layer against Doc 03's schema\.

- Controllers call a service layer whose methods are placeholders \(Step 6\), not real logic\. This document's job is the HTTP contract — routes, DTOs, validation, error shapes — not the business rules behind them\. Building both in one document would blur exactly the line Doc 03 already drew between itself and Doc 05\.
- Document image upload uses a pre\-signed\-URL pattern \(POST \.\.\./upload\-url, then the frontend uploads directly to Cloudflare R2, then POST \.\.\./documents references the resulting key\)\. No source specifies this mechanism — it is this document's recommended default, consistent with Doc 03 §8/§10's R2 recommendation, pending Infrastructure/Security confirmation\.
- documentImageReference is required on every document submission, matching Doc 03's NOT NULL column — even though the field was originally described as "required for the scan path" \(Data Dictionary\)\. This document does not reopen Doc 03's schema; it builds the DTO to match what Doc 03 already confirmed\. If manual\-entry submissions should be allowed without an image, that is a Doc 03 schema change to raise separately, not a DTO\-level workaround here\.
- Read responses never include documentNumber\. The frontend already has it from the user's own submission, and no source requires redisplaying raw document numbers in a read response\. Returning it again would widen PII exposure with no confirmed requirement behind it\.
- The error\-code taxonomy \(Section 7\) is this document's own list, built from confirmed business rules \(SVC\-12, SVC\-15, SVC\-17\) plus generic HTTP concerns \(validation, not\-found, auth\)\. Where a rule's exact backend name isn't confirmed \(Didit's own error/outcome vocabulary, per Doc 03 §10\), this document does not invent vendor\-specific codes — it stops at a generic VENDOR\_UNAVAILABLE / VENDOR\_ERROR pair and defers the rest to Doc 05 once Didit's real API responses are known\.
- The bearer\-auth and internal\-service guards \(Step 6\) are structural placeholders, not production authentication — both currently throw on every call, by design\. What the Architecture Overview does confirm about their eventual replacement: auth\-service is the platform's unified auth service and already issues JWTs for internal services as well as end users \(Architecture Overview, service inventory\), and reusable guards belong under /shared rather than duplicated per service \(Architecture Overview §7\.2\)\. What no source in this project documents is the exact verification mechanism these two files need — the JWT claim shape, signing\-key distribution, or whether a shared verification guard already exists under /shared today\. Until that is confirmed, both guards stay throw\-only placeholders; do not deploy them as written, and do not treat this document's phrasing as a description of real auth behavior\.
- The Didit webhook's request DTO \(Step 7c\) is a minimal, generic envelope, not Didit's real payload schema — that schema is not documented in any source available to this project\. Full parsing and signature verification is Doc 05's job once Didit's actual webhook documentation is available\.
- No manual\-review, approval, rejection, or override endpoint is included, and none is needed: Christopher's Step 10 clarification confirms there is no manual\-review/decision role anywhere in Identity Verification — the AI decision is final apart from the retry limit \(Doc 01, Doc 03\)\. Separately, an authorized help\-desk/support capability may need read\-only visibility into a user's verification status once that user has an open support ticket — but that is support visibility, not a verification decision step, and the help\-desk/support\-ticket workflow itself is explicitly out of scope for this microservice's documentation \(Christopher, Step 10\)\. This document does not add a dedicated endpoint, permission, or role for that lookup: if a support capability is ever wired up, it consumes the same read\-only, internal\-auth status read already documented in Section 6 \(GET /v1/internal/identity\-verification/status/:userId\) — nothing new to build here\. \[Superseded, 18 September 2026: this document's own 18 September update \(above\) states that SVC\-24 \(the internal\-review access question\) was actually resolved via a different design in Doc 10, not via this Section 6 endpoint — correcting "nothing new to build here\." Doc 10's revised internal status endpoint \(Step 1a\) is the one extended to expose attempt\_count, timestamps, and a coarse failure reason per J1; this document's own InternalStatusResponseDto \(§5e\) still returns only identityVerificationStatus/locationVerificationStatus/isVerified and is a narrower, separate internal read, not the J1\-compliant endpoint\.\]
- POST \.\.\./documents must be rate\-limited per TRVG §6\.1 \(“Account enumeration”\): “Rate\-limit the endpoint so repeated submissions cannot be used to probe which documents exist in the system\.” This document does not set a specific request threshold, does not choose a rate\-limiting layer \(API gateway vs\. application middleware\), and does not introduce a new error code for it — those are Security/Engineering decisions\. Do not confuse this with RETRY\_LIMIT\_EXCEEDED \(SVC\-15\), which caps verification sessions, not submission requests\.

# __5\. Step\-by\-Step Implementation__

Follow these steps in order\. Every code block names the exact file path to create it in, relative to the repository root \(marketeq\-projects\-nestjs/\)\. All paths start from apps/identity\-verification\-service/\.

## __Step 1 — Install Dependencies__

Doc 03 already installed typeorm, pg, and @nestjs/typeorm\. This step adds the validation/serialization packages every Marketeq DTO uses \(Architecture Overview §7\.1\) — nothing new is introduced beyond platform convention\.

__Run from: apps/identity\-verification\-service/__

npm install class\-validator@^0\.14\.1 class\-transformer@^0\.5\.1

## __Step 2 — Shared Error Response Shape__

Every error this API returns uses one shape, matching Marketeq's platform\-wide convention exactly \(Architecture Overview §7\.3\): \{ code, message, details? \}\. Define it once and reuse it everywhere\.

__FILE: apps/identity\-verification\-service/src/dto/response/error\.response\.dto\.ts__

// The standard error shape used by every non\-2xx response from this

// service \(Architecture Overview §7\.3\)\. Never invent a different shape

// for a new error case — add a new "code" value instead\.

export class ErrorResponseDto \{

  code: string;

  message: string;

  details?: Record<string, unknown>;

\}

__2a\. Domain exceptions__

One exception class per confirmed business rule this API enforces, each carrying the HTTP status and error code it should produce\. Doc 05 throws these from the service layer; this document's exception filter \(Step 9\) turns them into the shared error shape\.

__FILE: apps/identity\-verification\-service/src/common/errors/domain\-exceptions\.ts__

import \{ HttpException, HttpStatus \} from '@nestjs/common';

 

// Base class for every confirmed\-business\-rule error this service

// throws\. Carries the error "code" the ErrorResponseDto exposes\.

export abstract class DomainException extends HttpException \{

  abstract readonly code: string;

  constructor\(message: string, status: HttpStatus, details?: Record<string, unknown>\) \{

    super\(\{ message, details \}, status\);

  \}

\}

 

// SVC\-17 — a document already on file against a different account\.

export class DuplicateDocumentException extends DomainException \{

  readonly code = 'DUPLICATE\_DOCUMENT';

  constructor\(details?: Record<string, unknown>\) \{

    super\('A document with this number is already on file under a different account\.', HttpStatus\.CONFLICT, details\);

  \}

\}

 

// SVC\-15 — the three\-attempt retry limit has been reached\.

export class RetryLimitExceededException extends DomainException \{

  readonly code = 'RETRY\_LIMIT\_EXCEEDED';

  constructor\(details?: Record<string, unknown>\) \{

    super\('The maximum of three verification attempts has been reached\.', HttpStatus\.TOO\_MANY\_REQUESTS, details\);

  \}

\}

 

// SVC\-12 — expiration date is in the past\. Also enforced at the DTO

// level \(Step 4\) — this exception exists for any path that reaches the

// service layer without going through that DTO validation\.

export class DocumentExpiredException extends DomainException \{

  readonly code = 'DOCUMENT\_EXPIRED';

  constructor\(details?: Record<string, unknown>\) \{

    super\('This document has already expired\.', HttpStatus\.BAD\_REQUEST, details\);

  \}

\}

 

// 00 §4 — verification cannot complete while a VPN and/or proxy is

// detected\.

export class VpnProxyDetectedException extends DomainException \{

  readonly code = 'VPN\_PROXY\_DETECTED';

  constructor\(details?: Record<string, unknown>\) \{

    super\('Verification cannot proceed while a VPN or proxy is detected\.', HttpStatus\.FORBIDDEN, details\);

  \}

\}

 

// Generic upstream\-vendor failure\. Didit's own error vocabulary is not

// documented by any source \(Doc 03 §10\) — this is a deliberately generic

// pair, not a guess at Didit's real error codes\.

export class VendorUnavailableException extends DomainException \{

  readonly code = 'VENDOR\_UNAVAILABLE';

  constructor\(details?: Record<string, unknown>\) \{

    super\('The verification vendor is temporarily unavailable\. Try again shortly\.', HttpStatus\.BAD\_GATEWAY, details\);

  \}

\}

 

// A referenced profile or document does not exist, or does not belong

// to the requesting user\.

export class ProfileNotFoundException extends DomainException \{

  readonly code = 'PROFILE\_NOT\_FOUND';

  constructor\(details?: Record<string, unknown>\) \{

    super\('No identity verification profile exists for this account yet\.', HttpStatus\.NOT\_FOUND, details\);

  \}

\}

 

export class DocumentNotFoundException extends DomainException \{

  readonly code = 'DOCUMENT\_NOT\_FOUND';

  constructor\(details?: Record<string, unknown>\) \{

    super\('No matching document was found for this account\.', HttpStatus\.NOT\_FOUND, details\);

  \}

\}

 

// SVC\-02 — nothing to confirm because no location has been detected yet\.

export class NoDetectedLocationException extends DomainException \{

  readonly code = 'NO\_DETECTED\_LOCATION';

  constructor\(details?: Record<string, unknown>\) \{

    super\('No detected location is available to confirm yet\.', HttpStatus\.CONFLICT, details\);

  \}

\}

 

// SVC\-05 — travel duration was submitted before a Temporarily Traveling

// classification was recorded\.

export class ClassificationRequiredException extends DomainException \{

  readonly code = 'CLASSIFICATION\_REQUIRED';

  constructor\(details?: Record<string, unknown>\) \{

    super\('Record a Temporarily Traveling classification before declaring a travel duration\.', HttpStatus\.CONFLICT, details\);

  \}

\}

## __Step 3 — Custom Validators__

class\-validator covers most rules with built\-in decorators\. Two rules need a small custom decorator: rejecting a past expiration date \(SVC\-12\), and requiring issuingState only for a Driver's Licence \(matching Doc 03's chk\_identity\_documents\_issuing\_state constraint, enforced here too so bad input never reaches the database\)\.

__FILE: apps/identity\-verification\-service/src/common/validators/is\-not\-past\-date\.validator\.ts__

import \{ registerDecorator, ValidationOptions, ValidationArguments \} from 'class\-validator';

 

// Rejects a document at submission if its expiration date is in the

// past \(SVC\-12\)\. Compares calendar dates only \(UTC midnight\), so

// "expires today" still passes\.

export function IsNotPastDate\(validationOptions?: ValidationOptions\) \{

  return function \(object: Object, propertyName: string\) \{

    registerDecorator\(\{

      name: 'isNotPastDate',

      target: object\.constructor,

      propertyName,

      options: validationOptions,

      validator: \{

        validate\(value: unknown, \_args: ValidationArguments\) \{

          if \(typeof value \!== 'string'\) return false;

          const inputDate = new Date\(value \+ 'T00:00:00Z'\);

          if \(Number\.isNaN\(inputDate\.getTime\(\)\)\) return false;

          const todayUtc = new Date\(\);

          const todayMidnightUtc = new Date\(Date\.UTC\(

            todayUtc\.getUTCFullYear\(\), todayUtc\.getUTCMonth\(\), todayUtc\.getUTCDate\(\),

          \)\);

          return inputDate\.getTime\(\) >= todayMidnightUtc\.getTime\(\);

        \},

        defaultMessage\(\_args: ValidationArguments\) \{

          return 'expirationDate must not be in the past';

        \},

      \},

    \}\);

  \};

\}

## __Step 4 — Request DTOs__

A request DTO is a class describing exactly what a request body may contain\. class\-validator decorators enforce the rules; anything not listed on the class is stripped by the global ValidationPipe \(Step 9\), not silently accepted\.

__4a\. TravelClassificationRequestDto__

__FILE: apps/identity\-verification\-service/src/dto/request/travel\-classification\.request\.dto\.ts__

import \{ IsEnum \} from 'class\-validator';

import \{ TravelClassification \} from '\.\./\.\./entities/enums/identity\-verification\.enums';

 

export class TravelClassificationRequestDto \{

  @IsEnum\(TravelClassification, \{

    message: 'classification must be one of: temporarily\_traveling, permanently\_relocated',

  \}\)

  classification: TravelClassification;

\}

__4b\. TravelDurationRequestDto__

__FILE: apps/identity\-verification\-service/src/dto/request/travel\-duration\.request\.dto\.ts__

import \{ IsEnum \} from 'class\-validator';

import \{ DeclaredDuration \} from '\.\./\.\./entities/enums/identity\-verification\.enums';

 

export class TravelDurationRequestDto \{

  @IsEnum\(DeclaredDuration, \{

    message: 'duration must be one of: a\_few\_days, one\_to\_two\_weeks, more\_than\_two\_weeks, not\_sure',

  \}\)

  duration: DeclaredDuration;

\}

__4c\. DocumentUploadUrlRequestDto__

Requests a pre\-signed upload URL before the document itself is submitted \(Section 4's upload\-URL engineering decision\)\.

__FILE: apps/identity\-verification\-service/src/dto/request/document\-upload\-url\.request\.dto\.ts__

import \{ IsIn \} from 'class\-validator';

 

export class DocumentUploadUrlRequestDto \{

  // Kept to a small, known set — this is an upload target, not a

  // general\-purpose file host\.

  @IsIn\(\['jpg', 'jpeg', 'png', 'pdf'\], \{

    message: 'fileExtension must be one of: jpg, jpeg, png, pdf',

  \}\)

  fileExtension: string;

\}

__4d\. SubmitDocumentRequestDto__

The largest DTO in this service\. Every field maps directly onto a Doc 03 identity\_documents column — nothing here is invented independently of that schema\. issuingState uses @ValidateIf so it is only checked \(and only allowed\) when documentType is drivers\_licence, mirroring Doc 03's chk\_identity\_documents\_issuing\_state constraint at the API layer, before a bad request ever reaches the database\.

__FILE: apps/identity\-verification\-service/src/dto/request/submit\-document\.request\.dto\.ts__

import \{

  IsEnum,

  IsString,

  Length,

  Matches,

  IsOptional,

  ValidateIf,

  IsNotEmpty,

\} from 'class\-validator';

import \{ IsNotPastDate \} from '\.\./\.\./common/validators/is\-not\-past\-date\.validator';

import \{ DocumentType, CaptureMethod \} from '\.\./\.\./entities/enums/identity\-verification\.enums';

 

export class SubmitDocumentRequestDto \{

  @IsEnum\(DocumentType, \{

    message: 'documentType must be one of: passport, id\_card, drivers\_licence, residence\_permit',

  \}\)

  documentType: DocumentType;

 

  // ISO 3166\-1 alpha\-2, e\.g\. "US"\. Matches Doc 03's char\(2\) column\.

  @IsString\(\)

  @Length\(2, 2\)

  @Matches\(/^\[A\-Z\]\{2\}$/, \{ message: 'issuingCountry must be a 2\-letter uppercase ISO country code' \}\)

  issuingCountry: string;

 

  @IsString\(\)

  @Length\(1, 64\)

  documentNumber: string;

 

  // documentNumberNormalized is NOT part of this DTO — it is computed

  // server\-side by Doc 05's service layer as a one\-way hash of the

  // trimmed, upper\-cased document number \(Doc 03 §6b/§8a; TRVG §1\.1,

  // §1\.3\), never supplied by the client\. The hash algorithm, and whether

  // issuingCountry/documentType join the hash input, are pending

  // Security/Engineering confirmation \(Doc 03, 16 Sept update note\)\.

 

  // ISO 8601 date, e\.g\. "2030\-01\-01"\. Rejected if in the past \(SVC\-12\)\.

  @IsString\(\)

  @Matches\(/^\\d\{4\}\-\\d\{2\}\-\\d\{2\}$/, \{ message: 'expirationDate must be in YYYY\-MM\-DD format' \}\)

  @IsNotPastDate\(\)

  expirationDate: string;

 

  // Driver's Licence only \(Doc 03, chk\_identity\_documents\_issuing\_state\)\.

  @ValidateIf\(\(o\) => o\.documentType === DocumentType\.DRIVERS\_LICENCE\)

  @IsString\(\)

  @IsNotEmpty\(\{ message: 'issuingState is required when documentType is drivers\_licence' \}\)

  @ValidateIf\(\(o\) => o\.documentType \!== DocumentType\.DRIVERS\_LICENCE\)

  @IsOptional\(\)

  issuingState?: string;

 

  @IsEnum\(CaptureMethod, \{ message: 'captureMethod must be one of: scan, manual\_entry' \}\)

  captureMethod: CaptureMethod;

 

  // The object\-storage key returned by POST \.\.\./documents/upload\-url

  // \(Section 4\)\. Required on every submission — see Section 4 for why

  // this document does not make it conditional on captureMethod\.

  @IsString\(\)

  @IsNotEmpty\(\)

  documentImageReference: string;

\}

__HOW THE CONDITIONAL VALIDATION WORKS__

issuingState uses two @ValidateIf decorators to express both directions of the rule: required when documentType is drivers\_licence, and left untouched \(optional, not rejected if absent\) otherwise\. class\-validator evaluates decorators top\-to\-bottom per property, so both conditions apply correctly to the same field\. \[Gap noted, 18 September 2026: per Answer 9 / TRVG2 §2\.1's third bullet, this required/optional validation should additionally be conditional by issuing country — e\.g\., only a US driver's licence requires expiry and issuing\-state format validation; other countries' driver's licences do not\. This DTO's @ValidateIf rules above are conditional only on documentType, with no country\-based branching\. The Data Dictionary's own row 35 already states the intended US\-only framing correctly; this document's DTO has not yet been updated to match it\.\]

## __Step 5 — Response DTOs__

Response DTOs control exactly what this API sends back — deliberately narrower than the full entity in places \(Section 4: no raw documentNumber in read responses\)\.

__5a\. ProfileStatusResponseDto__

__FILE: apps/identity\-verification\-service/src/dto/response/profile\-status\.response\.dto\.ts__

import \{

  IdentityVerificationStatus,

  LocationVerificationStatus,

  TravelClassification,

  DeclaredDuration,

\} from '\.\./\.\./entities/enums/identity\-verification\.enums';

import \{ IdentityVerificationProfile \} from '\.\./\.\./entities/identity\-verification\-profile\.entity';

 

export class ProfileStatusResponseDto \{

  verifiedHomeCountry: string | null;

  detectedCountry: string | null;

  detectedRegionState: string | null;

  detectedCity: string | null;

  timeZone: string | null;

 

  travelClassification: TravelClassification | null;

  declaredDuration: DeclaredDuration | null;

  travelModeActive: boolean;

 

  identityVerificationStatus: IdentityVerificationStatus;

  // Free text — see Doc 03 §10\. Not a confirmed Product vocabulary\.

  identityRejectionReason: string | null;

  locationVerificationStatus: LocationVerificationStatus;

 

  // Computed \(detectedCountry \!== verifiedHomeCountry\), not a stored

  // column\. Drives SVC\-28's returning\-user re\-verification trigger on

  // the frontend\. This getter only computes the DISPLAY flag — the

  // actual re\-verification workflow it triggers \(SVC\-28\) is Doc 05's

  // job, not this mapping\.

  reconfirmationRequired: boolean;

 

  static fromEntity\(profile: IdentityVerificationProfile\): ProfileStatusResponseDto \{

    const dto = new ProfileStatusResponseDto\(\);

    dto\.verifiedHomeCountry = profile\.verifiedHomeCountry;

    dto\.detectedCountry = profile\.detectedCountry;

    dto\.detectedRegionState = profile\.detectedRegionState;

    dto\.detectedCity = profile\.detectedCity;

    dto\.timeZone = profile\.timeZone;

    dto\.travelClassification = profile\.travelClassification;

    dto\.declaredDuration = profile\.declaredDuration;

    dto\.travelModeActive = profile\.travelModeActive;

    dto\.identityVerificationStatus = profile\.identityVerificationStatus;

    dto\.identityRejectionReason = profile\.identityRejectionReason;

    dto\.locationVerificationStatus = profile\.locationVerificationStatus;

    dto\.reconfirmationRequired = Boolean\(

      profile\.verifiedHomeCountry && profile\.detectedCountry && profile\.verifiedHomeCountry \!== profile\.detectedCountry,

    \);

    return dto;

  \}

\}

__5b\. DocumentResponseDto__

__FILE: apps/identity\-verification\-service/src/dto/response/document\.response\.dto\.ts__

import \{

  DocumentType,

  CaptureMethod,

  VerificationDepth,

\} from '\.\./\.\./entities/enums/identity\-verification\.enums';

import \{ IdentityDocument \} from '\.\./\.\./entities/identity\-document\.entity';

 

export class DocumentResponseDto \{

  id: string;

  documentType: DocumentType;

  issuingCountry: string;

  // documentNumber is deliberately omitted — see Section 4\.

  expirationDate: string;

  issuingState: string | null;

  captureMethod: CaptureMethod;

  verificationDepth: VerificationDepth | null;

  isDuplicateMatch: boolean;

  createdAt: Date;

 

  static fromEntity\(document: IdentityDocument\): DocumentResponseDto \{

    const dto = new DocumentResponseDto\(\);

    dto\.id = document\.id;

    dto\.documentType = document\.documentType;

    dto\.issuingCountry = document\.issuingCountry;

    dto\.expirationDate = document\.expirationDate;

    dto\.issuingState = document\.issuingState;

    dto\.captureMethod = document\.captureMethod;

    dto\.verificationDepth = document\.verificationDepth;

    dto\.isDuplicateMatch = document\.isDuplicateMatch;

    dto\.createdAt = document\.createdAt;

    return dto;

  \}

\}

__5c\. DocumentUploadUrlResponseDto__

__FILE: apps/identity\-verification\-service/src/dto/response/document\-upload\-url\.response\.dto\.ts__

export class DocumentUploadUrlResponseDto \{

  uploadUrl: string;

  // Pass this back as documentImageReference in the follow\-up

  // POST \.\.\./documents call \(Section 4\)\.

  documentImageReference: string;

  expiresAt: string;

\}

__5d\. VerificationSessionResponseDto__

__FILE: apps/identity\-verification\-service/src/dto/response/verification\-session\.response\.dto\.ts__

export class VerificationSessionResponseDto \{

  vendorSessionId: string;

  // Where the frontend sends the user to continue the vendor\-hosted

  // verification flow\. Didit's actual session\-response shape is not

  // documented in any source available to this project — this field

  // name is a placeholder for whatever URL/token Didit's real API

  // returns \(Doc 03 §10; see also Section 4 of this document\)\.

  vendorSessionUrl: string;

  attemptNumber: number;

\}

__5e\. InternalStatusResponseDto__

__FILE: apps/identity\-verification\-service/src/dto/response/internal\-status\.response\.dto\.ts__

import \{

  IdentityVerificationStatus,

  LocationVerificationStatus,

\} from '\.\./\.\./entities/enums/identity\-verification\.enums';

 

export class InternalStatusResponseDto \{

  identityVerificationStatus: IdentityVerificationStatus;

  locationVerificationStatus: LocationVerificationStatus;

 

  // Computed, not stored \(TRVG §2, “Gate Evaluation”\): true iff both

  // statuses above are VERIFIED\. isVerified is this document's own

  // proposed field name, not a source\-mandated identifier, and still

  // computes ONLY is\_verified\(account\) \(TRVG2 §2\) — identity AND

  // location both VERIFIED\. TRVG2 replaces in\_marketplace\(account\) with

  // gate\_open\(account\) := is\_verified\(\) OR in\_grace\(\), evaluated across

  // nine gates \(G1–G9, TRVG2 §2\) — this service still does not compute

  // gate\_open or enforce any gate itself \(TRVG2 §2\.3\)\. KNOWN GAP \(18

  // September 2026\): isVerified was not extended to gate\_open; see Doc

  // 05's getStatusForInternalCaller for the same gap, not fixed there

  // either — an API\-contract decision this document does not make\.

  isVerified: boolean;

\}

## __5f — Accepted documents by issuing country \(coverage catalog\)__

__Route: __GET /v1/identity\-verification/accepted\-documents?issuingCountry=US

Returns which of the four canonical document types \(passport, id\_card, drivers\_licence, residence\_permit\) are accepted for the given issuing country\. The document\-selection screen renders only what this returns; the Figma rows are layout examples, not universal support\. submitDocument validates against the same catalog server\-side, so a client that skips the UI filter cannot submit an unsupported combination \(400 UNSUPPORTED\_DOCUMENT\_FOR\_COUNTRY\)\.

__Request: __issuingCountry — exactly two uppercase letters \(ISO 3166\-1 alpha\-2\), validated by AcceptedDocumentsRequestDto\.

__Response \(200\): __

```
{
  "issuingCountry": "AF",
  "acceptedDocumentTypes": ["id_card", "passport", "drivers_licence"],
  "catalogVersion": "2026-09-29.1",
  "catalogRetrievedAt": "2026-09-29"
}
```

issuingCountry and acceptedDocumentTypes are unchanged from the original contract\. catalogVersion and catalogRetrievedAt are additive metadata; clients that ignore them are unaffected\. An empty acceptedDocumentTypes array is a real answer \(Didit lists nothing we support for that country, or does not list the country\) — it is not a failure\.

__Errors: __400 VALIDATION\_ERROR for a malformed issuingCountry; 503 DOCUMENT\_COVERAGE\_UNAVAILABLE only if the committed coverage catalog fails its integrity check \(fail\-closed; never a silently empty or permissive list\)\.

__Data source — a versioned, backend\-owned catalog\. __Didit publishes no supported API for this data; its only supported publication is the public page https://docs.didit.me/core\-technology/id\-verification/supported\-documents\-id\-verification\. The service therefore ships a reviewed snapshot of that page \(providers/document\-coverage/didit\-document\-coverage\.catalog\.ts\), served by CatalogDocumentCoverageProvider\. It is never scraped at runtime, and Didit's undocumented internal coverage endpoint is not used\. The catalog records its source URL, retrieval date, catalogVersion, the SHA\-256 of the retrieved source, and a SHA\-256 of the normalized data that is verified on load\.

__What the source does and does not contain\. __Didit publishes, per country, its code \(ISO 3166\-1 alpha\-3, plus a few non\-ISO territory codes\) and a supported/unsupported flag for five columns: ID Card, Passport, Driver License, Residence Permit, Health Insurance\. It publishes no Didit document codes and no required\-side counts; both are stored as null and are never inferred\. Health Insurance is retained in the source snapshot but maps to no canonical DocumentType, so it is never returned or accepted \(the four\-type model is Answer 7\); Birth Certificate is not present\. Didit's alpha\-3 codes are bridged to the public alpha\-2 input through an ISO 3166\-1 table \(iso\-3166\-1\.ts\); Didit's RKS is aliased to XK \(Kosovo\), and six Didit\-only codes with no ISO equivalent \(ABK, DPR, LPR, RSL, TRN, XOM\) stay in the snapshot but are unreachable through the alpha\-2 API\.

__Refreshing the catalog\. __Manually download the markdown rendition of the Didit page \(\.\.\./supported\-documents\-id\-verification\.md\), then run the offline importer from backend/: npx ts\-node apps/identity\-verification\-service/scripts/import\-didit\-document\-coverage\.ts \-\-input <file> \-\-retrieved\-at YYYY\-MM\-DD\. By default it is a dry run that validates the file and prints a readable diff against the current catalog; add \-\-write to regenerate didit\-document\-coverage\.data\.ts \(the only generated file\)\. It computes the source and normalized\-data hashes and the next catalogVersion itself, and is deterministic and idempotent\. It refuses to write on duplicate countries, unknown or reordered document columns, malformed rows, ISO codes with no alpha\-2 mapping that are not on the deliberate no\-ISO list, alpha\-2 collisions, or any country/mapping count change that is not acknowledged with \-\-expect\-countries and \-\-expect\-mappings\. It never fetches anything and is never imported by the running service; Health Insurance stays in the source rows but maps to no canonical type, and document codes and required sides are never generated\. A hash mismatch in the committed data fails the catalog integrity check and its spec\.

## __Step 6 — Guards & Exception Filter__

Two guards \(Section 4: structural placeholders, not real auth\) and one global exception filter that turns every DomainException — and every other error — into the shared ErrorResponseDto shape\.

__6a\. Guards__

__NOT PRODUCTION\-SAFE — REPLACE BEFORE DEPLOYING__

These two guards are NOT production\-safe as written, and this document does not describe them as real authentication anywhere\. They exist so the controllers below have somewhere to attach @UseGuards\(\) and so this document's routes are complete and testable\. Confirmed dependency for the eventual replacement: auth\-service is the platform's unified auth service and already issues JWTs for internal services as well as end users \(Architecture Overview, service inventory\), and reusable guards belong under /shared, not duplicated per service \(Architecture Overview §7\.2\)\. Not confirmed by any source available to this project: the JWT's claim shape, signing\-key distribution, or whether a shared verification guard already exists under /shared today\. Before this ships, replace both files with the real auth\-service\-backed verification guard once that mechanism is confirmed — do not deploy the placeholder logic below, and do not invent a token format or shared secret to fill the gap in the meantime\.

__FILE: apps/identity\-verification\-service/src/common/guards/bearer\-auth\.guard\.ts__

import \{ CanActivate, ExecutionContext, Injectable, UnauthorizedException \} from '@nestjs/common';

import \{ Request \} from 'express';

 

// PLACEHOLDER — see the callout above this file in the document\. Real

// JWT verification \(signature, expiry, issuer\) belongs here, backed by

// auth\-service \(the platform's unified auth service, which already

// issues JWTs for internal services as well as end users\) via a shared

// guard under /shared per §7\.2\. The exact verification mechanism is not

// documented by any source available to this project, so it is not

// implemented below\. This placeholder only checks that a bearer token

// is present — it does not verify the token is genuine, and never will

// until the real mechanism is confirmed and this file is replaced\.

@Injectable\(\)

export class BearerAuthGuard implements CanActivate \{

  canActivate\(context: ExecutionContext\): boolean \{

    const request = context\.switchToHttp\(\)\.getRequest<Request>\(\);

    const authHeader = request\.headers\['authorization'\];

    if \(\!authHeader || \!authHeader\.startsWith\('Bearer '\)\) \{

      throw new UnauthorizedException\('Missing bearer token'\);

    \}

    // TODO \(before production\): verify the token's signature and

    // expiry using the platform's shared JWT verification, then set

    // request\.userId from its verified claims\. Throwing here instead

    // of trusting an unverified claim is intentional until that

    // replacement lands\.

    throw new UnauthorizedException\(

      'BearerAuthGuard is a placeholder — replace with the shared auth\-service JWT guard before use\.',

    \);

  \}

\}

__FILE: apps/identity\-verification\-service/src/common/guards/internal\-service\.guard\.ts__

import \{ CanActivate, ExecutionContext, Injectable, UnauthorizedException \} from '@nestjs/common';

 

// PLACEHOLDER — see the callout above this file in the document\. The

// Architecture Overview confirms auth\-service issues JWTs for internal

// services \(not just end users\) and that reusable guards belong under

// /shared \(§7\.2\), so real service\-to\-service auth here should verify

// an auth\-service\-issued internal JWT via that shared mechanism rather

// than a bespoke one\. The exact verification details \(claim shape,

// signing\-key distribution\) are not documented by any source available

// to this project, so this file does not implement them or guess at a

// substitute \(no invented shared secret, mTLS setup, or token format\)\.

@Injectable\(\)

export class InternalServiceGuard implements CanActivate \{

  canActivate\(\_context: ExecutionContext\): boolean \{

    throw new UnauthorizedException\(

      'InternalServiceGuard is a placeholder — replace with the platform\\'s real internal\-service auth before use\.',

    \);

  \}

\}

__6b\. Global exception filter__

__FILE: apps/identity\-verification\-service/src/common/filters/all\-exceptions\.filter\.ts__

import \{

  ArgumentsHost,

  BadRequestException,

  Catch,

  ExceptionFilter,

  HttpException,

  HttpStatus,

\} from '@nestjs/common';

import \{ Response \} from 'express';

import \{ DomainException \} from '\.\./errors/domain\-exceptions';

import \{ ErrorResponseDto \} from '\.\./\.\./dto/response/error\.response\.dto';

 

// Converts every thrown error into the one shared error shape

// \(Architecture Overview §7\.3\): \{ code, message, details? \}\.

@Catch\(\)

export class AllExceptionsFilter implements ExceptionFilter \{

  catch\(exception: unknown, host: ArgumentsHost\): void \{

    const ctx = host\.switchToHttp\(\);

    const response = ctx\.getResponse<Response>\(\);

 

    // 1\. A confirmed business\-rule error \(Step 2\) — has its own code

    // and status already\.

    if \(exception instanceof DomainException\) \{

      const status = exception\.getStatus\(\);

      const body = exception\.getResponse\(\) as \{ message: string; details?: unknown \};

      const errorBody: ErrorResponseDto = \{

        code: exception\.code,

        message: body\.message,

        details: body\.details as Record<string, unknown> | undefined,

      \};

      response\.status\(status\)\.json\(errorBody\);

      return;

    \}

 

    // 2\. A validation failure from the global ValidationPipe \(Step 9\) —

    // class\-validator's error array becomes "details"\.

    if \(exception instanceof BadRequestException\) \{

      const body = exception\.getResponse\(\) as \{ message: string\[\] | string \};

      const errorBody: ErrorResponseDto = \{

        code: 'VALIDATION\_ERROR',

        message: 'One or more fields failed validation\.',

        details: \{ errors: Array\.isArray\(body\.message\) ? body\.message : \[body\.message\] \},

      \};

      response\.status\(HttpStatus\.BAD\_REQUEST\)\.json\(errorBody\);

      return;

    \}

 

    // 3\. Any other NestJS HttpException \(guards, NotFoundException, etc\.\)\.

    if \(exception instanceof HttpException\) \{

      const status = exception\.getStatus\(\);

      const body = exception\.getResponse\(\);

      const message = typeof body === 'string' ? body : \(body as \{ message?: string \}\)\.message ?? 'Request failed\.';

      const errorBody: ErrorResponseDto = \{ code: 'REQUEST\_FAILED', message \};

      response\.status\(status\)\.json\(errorBody\);

      return;

    \}

 

    // 4\. Anything unexpected\. Never leak internal details \(Architecture

    // Overview §7\.3, "avoid leaking internals in messages"\)\.

    const errorBody: ErrorResponseDto = \{ code: 'INTERNAL\_ERROR', message: 'Something went wrong\. Try again\.' \};

    response\.status\(HttpStatus\.INTERNAL\_SERVER\_ERROR\)\.json\(errorBody\);

  \}

\}

## __Step 7 — Service Stub__

One service class, injected into all three controllers\. Every method signature is final — the controllers in Step 8 are written against these exact signatures — but every method body throws NotImplementedException\. Doc 05 replaces each body with real logic and does not need to touch the controllers, the DTOs, or the routes to do it\.

__FILE: apps/identity\-verification\-service/src/services/identity\-verification\.service\.ts__

import \{ Injectable, NotImplementedException \} from '@nestjs/common';

import \{ InjectRepository \} from '@nestjs/typeorm';

import \{ Repository \} from 'typeorm';

import \{ IdentityVerificationProfile \} from '\.\./entities/identity\-verification\-profile\.entity';

import \{ IdentityDocument \} from '\.\./entities/identity\-document\.entity';

import \{ VerificationAttempt \} from '\.\./entities/verification\-attempt\.entity';

import \{ TravelClassification, DeclaredDuration, IdentityVerificationStatus, LocationVerificationStatus \} from '\.\./entities/enums/identity\-verification\.enums';

import \{ SubmitDocumentRequestDto \} from '\.\./dto/request/submit\-document\.request\.dto';

 

// PLACEHOLDER SERVICE — see Section 1 and Section 4 of this document\.

// Every method below is a stub\. Doc 05 \(Business Logic & Workflows\)

// replaces each method body with real logic \(the duplicate\-detection

// transaction, the Didit session orchestration, the webhook handler,

// the Travel Mode scheduler\)\. Do not treat any behavior implied by a

// method's NAME as already implemented — only the SIGNATURE is final\.

@Injectable\(\)

export class IdentityVerificationService \{

  constructor\(

    @InjectRepository\(IdentityVerificationProfile\)

    private readonly profileRepository: Repository<IdentityVerificationProfile>,

    @InjectRepository\(IdentityDocument\)

    private readonly documentRepository: Repository<IdentityDocument>,

    @InjectRepository\(VerificationAttempt\)

    private readonly attemptRepository: Repository<VerificationAttempt>,

  \) \{\}

 

  async getOrCreateProfile\(userId: string\): Promise<IdentityVerificationProfile> \{

    throw new NotImplementedException\('Implemented in Doc 05\.'\);

  \}

 

  async confirmHomeCountry\(userId: string\): Promise<IdentityVerificationProfile> \{

    throw new NotImplementedException\('Implemented in Doc 05\. Must throw NoDetectedLocationException if detectedCountry is null\.'\);

  \}

 

  async recordTravelClassification\(

    userId: string,

    classification: TravelClassification,

  \): Promise<IdentityVerificationProfile> \{

    throw new NotImplementedException\('Implemented in Doc 05\.'\);

  \}

 

  async recordTravelDuration\(userId: string, duration: DeclaredDuration\): Promise<IdentityVerificationProfile> \{

    throw new NotImplementedException\('Implemented in Doc 05\. Must throw ClassificationRequiredException if classification is not temporarily\_traveling\.'\);

  \}

 

  async createDocumentUploadUrl\(

    userId: string,

    fileExtension: string,

  \): Promise<\{ uploadUrl: string; documentImageReference: string; expiresAt: string \}> \{

    throw new NotImplementedException\('Implemented in Doc 05 \(Cloudflare R2 pre\-signed URL — see Doc 03 §8\)\.'\);

  \}

 

  async submitDocument\(userId: string, dto: SubmitDocumentRequestDto\): Promise<IdentityDocument> \{

    throw new NotImplementedException\(

      'Implemented in Doc 05\. Must run the duplicate\-detection transaction from Doc 03 §8a and throw DuplicateDocumentException on a cross\-profile match\.',

    \);

  \}

 

  async startVerificationSession\(

    userId: string,

    documentId: string,

  \): Promise<\{ vendorSessionId: string; vendorSessionUrl: string; attemptNumber: number \}> \{

    throw new NotImplementedException\(

      'Implemented in Doc 05\. Must enforce the 3\-attempt limit \(Doc 03 §8b\) via RetryLimitExceededException and check the VPN/proxy signal via VpnProxyDetectedException\.',

    \);

  \}

 

  async listDocuments\(userId: string\): Promise<IdentityDocument\[\]> \{

    throw new NotImplementedException\('Implemented in Doc 05\.'\);

  \}

 

  async getStatusForInternalCaller\(

    userId: string,

  \): Promise<\{

    identityVerificationStatus: IdentityVerificationStatus;

    locationVerificationStatus: LocationVerificationStatus;

    // Computed \(TRVG §2\), not a Pick<> off the entity — see Section 5e\.

    isVerified: boolean;

  \}> \{

    throw new NotImplementedException\('Implemented in Doc 05\. isVerified is computed, not stored \(TRVG2 §2\); this service still does not compute gate\_open\(account\) or enforce gates G1–G9 \(TRVG2 §2\.3\)\.'\);

  \}

 

  async handleDiditWebhook\(payload: unknown, signatureHeader: string | undefined\): Promise<void> \{

    throw new NotImplementedException\(

      'Implemented in Doc 05\. Must verify the HMAC signature \(Doc 03 §10, SVC\-30\) before processing, and must be idempotent on vendor\_session\_id \(Doc 03 §6c\)\.',

    \);

  \}

\}

## __Step 8 — Controllers__

Three controllers, one per caller type from Section 3\. Each route is annotated with its confirmed source \(SVC\-ID or section reference\) so nothing here reads as invented\.

__8a\. User\-facing controller__

__FILE: apps/identity\-verification\-service/src/controllers/identity\-verification\.controller\.ts__

import \{

  Controller,

  Get,

  Post,

  Param,

  Body,

  Req,

  UseGuards,

  HttpCode,

  HttpStatus,

\} from '@nestjs/common';

import \{ Request \} from 'express';

import \{ IdentityVerificationService \} from '\.\./services/identity\-verification\.service';

import \{ BearerAuthGuard \} from '\.\./common/guards/bearer\-auth\.guard';

import \{ TravelClassificationRequestDto \} from '\.\./dto/request/travel\-classification\.request\.dto';

import \{ TravelDurationRequestDto \} from '\.\./dto/request/travel\-duration\.request\.dto';

import \{ DocumentUploadUrlRequestDto \} from '\.\./dto/request/document\-upload\-url\.request\.dto';

import \{ SubmitDocumentRequestDto \} from '\.\./dto/request/submit\-document\.request\.dto';

import \{ ProfileStatusResponseDto \} from '\.\./dto/response/profile\-status\.response\.dto';

import \{ DocumentResponseDto \} from '\.\./dto/response/document\.response\.dto';

import \{ DocumentUploadUrlResponseDto \} from '\.\./dto/response/document\-upload\-url\.response\.dto';

import \{ VerificationSessionResponseDto \} from '\.\./dto/response/verification\-session\.response\.dto';

 

// Every route below expects request\.userId to already be set by

// BearerAuthGuard once that guard is replaced with real auth \(Step 6\)\.

interface AuthenticatedRequest extends Request \{

  userId: string;

\}

 

@Controller\('v1/identity\-verification'\)

@UseGuards\(BearerAuthGuard\)

export class IdentityVerificationController \{

  constructor\(private readonly service: IdentityVerificationService\) \{\}

 

  // SVC\-01, SVC\-02, SVC\-03, SVC\-19, SVC\-20 \(self\-read\), SVC\-28\.

  @Get\('me'\)

  async getMyStatus\(@Req\(\) req: AuthenticatedRequest\): Promise<ProfileStatusResponseDto> \{

    const profile = await this\.service\.getOrCreateProfile\(req\.userId\);

    return ProfileStatusResponseDto\.fromEntity\(profile\);

  \}

 

  // SVC\-02 — confirm the detected country as home country\.

  @Post\('home\-country/confirm'\)

  @HttpCode\(HttpStatus\.OK\)

  async confirmHomeCountry\(@Req\(\) req: AuthenticatedRequest\): Promise<ProfileStatusResponseDto> \{

    const profile = await this\.service\.confirmHomeCountry\(req\.userId\);

    return ProfileStatusResponseDto\.fromEntity\(profile\);

  \}

 

  // SVC\-04 — record Temporarily Traveling / Permanently Relocated\.

  @Post\('travel\-classification'\)

  @HttpCode\(HttpStatus\.OK\)

  async recordTravelClassification\(

    @Req\(\) req: AuthenticatedRequest,

    @Body\(\) dto: TravelClassificationRequestDto,

  \): Promise<ProfileStatusResponseDto> \{

    const profile = await this\.service\.recordTravelClassification\(req\.userId, dto\.classification\);

    return ProfileStatusResponseDto\.fromEntity\(profile\);

  \}

 

  // SVC\-05 — record declared duration, activates Travel Mode\.

  @Post\('travel\-duration'\)

  @HttpCode\(HttpStatus\.OK\)

  async recordTravelDuration\(

    @Req\(\) req: AuthenticatedRequest,

    @Body\(\) dto: TravelDurationRequestDto,

  \): Promise<ProfileStatusResponseDto> \{

    const profile = await this\.service\.recordTravelDuration\(req\.userId, dto\.duration\);

    return ProfileStatusResponseDto\.fromEntity\(profile\);

  \}

 

  // Section 4 — pre\-signed upload URL, ahead of document submission\.

  @Post\('documents/upload\-url'\)

  async createDocumentUploadUrl\(

    @Req\(\) req: AuthenticatedRequest,

    @Body\(\) dto: DocumentUploadUrlRequestDto,

  \): Promise<DocumentUploadUrlResponseDto> \{

    return this\.service\.createDocumentUploadUrl\(req\.userId, dto\.fileExtension\);

  \}

 

  // SVC\-08, SVC\-09, SVC\-11 — submit document metadata\.

  @Post\('documents'\)

  async submitDocument\(

    @Req\(\) req: AuthenticatedRequest,

    @Body\(\) dto: SubmitDocumentRequestDto,

  \): Promise<DocumentResponseDto> \{

    const document = await this\.service\.submitDocument\(req\.userId, dto\);

    return DocumentResponseDto\.fromEntity\(document\);

  \}

 

  // SVC\-14, SVC\-21 — start a Didit verification session for a

  // previously submitted document\.

  @Post\('documents/:documentId/verify'\)

  async startVerificationSession\(

    @Req\(\) req: AuthenticatedRequest,

    @Param\('documentId'\) documentId: string,

  \): Promise<VerificationSessionResponseDto> \{

    return this\.service\.startVerificationSession\(req\.userId, documentId\);

  \}

 

  // Convenience read — supports the frontend's attempt/retry history

  // display\. Not a distinct SVC\-ID; a reasonable engineering addition

  // \(Section 4\)\.

  @Get\('documents'\)

  async listDocuments\(@Req\(\) req: AuthenticatedRequest\): Promise<DocumentResponseDto\[\]> \{

    const documents = await this\.service\.listDocuments\(req\.userId\);

    return documents\.map\(\(d\) => DocumentResponseDto\.fromEntity\(d\)\);

  \}

\}

__8b\. Internal controller__

Built for SVC\-20 \(another Marketeq service gating an action\), but note its shape: read\-only, internal\-auth, single\-user status\. That is also the minimum integration boundary a future authorized support/help\-desk capability would need for read\-only visibility into a user's status \(Christopher, Step 10; Section 4\)\. No separate endpoint, permission, or role is added for that case here — the help\-desk/support\-ticket workflow itself stays out of scope for this document\. \[Superseded, 18 September 2026: as corrected in Section 4 above, the actual J1\-compliant read\-only support/internal\-review endpoint lives in Doc 10 \(Step 1a\), not in this document's InternalServiceGuard\-gated controller — this controller \(built for SVC\-20\) remains a separate, narrower internal read that does not itself satisfy J1\.\]

__FILE: apps/identity\-verification\-service/src/controllers/identity\-verification\-internal\.controller\.ts__

import \{ Controller, Get, Param, UseGuards \} from '@nestjs/common';

import \{ IdentityVerificationService \} from '\.\./services/identity\-verification\.service';

import \{ InternalServiceGuard \} from '\.\./common/guards/internal\-service\.guard';

import \{ InternalStatusResponseDto \} from '\.\./dto/response/internal\-status\.response\.dto';

 

// SVC\-20 — synchronous, point\-in\-time status read for another Marketeq

// service gating an action on verification status \(Doc 01 §5\)\. Never

// exposed to the public internet — internal auth only\.

 

// TRVG §6 \("Data Exposure"\) constrains what reaches a client\-facing

// consumer, not what this internal\-auth\-only endpoint returns to another

// Marketeq service\. The calling service is responsible for applying

// TRVG §6's consumer\-scoping table \(Client/hiring, Team owner, Account

// holder\) before any value derived from this response reaches an actual

// client\-facing consumer\. This document does not enumerate which services

// call this endpoint or how they must scope it further — see Doc 02,

// SVC\-20 \("The calling services themselves are not enumerated by any

// source and are not invented here\."\)\.

@Controller\('v1/internal/identity\-verification'\)

@UseGuards\(InternalServiceGuard\)

export class IdentityVerificationInternalController \{

  constructor\(private readonly service: IdentityVerificationService\) \{\}

 

  @Get\('status/:userId'\)

  async getStatus\(@Param\('userId'\) userId: string\): Promise<InternalStatusResponseDto> \{

    const status = await this\.service\.getStatusForInternalCaller\(userId\);

    return \{

      identityVerificationStatus: status\.identityVerificationStatus,

      locationVerificationStatus: status\.locationVerificationStatus,

      isVerified: status\.isVerified,

    \};

  \}

\}

__8c\. Webhook controller__

Didit's exact webhook payload schema is not documented in any source available to this project \(Section 4\)\. This DTO is a minimal, generic envelope — enough to route and log the delivery — not a confirmed parse of Didit's real payload\. Doc 05 replaces the body\-shape assumptions here once Didit's actual webhook documentation is available\.

__FILE: apps/identity\-verification\-service/src/dto/webhooks/didit\-webhook\.payload\.dto\.ts__

// Minimal generic envelope — see the note above this file in the

// document\. Do not treat this as Didit's confirmed payload schema\.

export class DiditWebhookPayloadDto \{

  vendorSessionId: string;

  eventType: string;

  occurredAt: string;

  // Everything else Didit sends is preserved as\-is for Doc 05 to parse

  // once the real payload schema is confirmed\.

  raw: Record<string, unknown>;

\}

__FILE: apps/identity\-verification\-service/src/controllers/identity\-verification\-webhooks\.controller\.ts__

import \{ Controller, Post, Body, Headers, HttpCode, HttpStatus \} from '@nestjs/common';

import \{ IdentityVerificationService \} from '\.\./services/identity\-verification\.service';

import \{ DiditWebhookPayloadDto \} from '\.\./dto/webhooks/didit\-webhook\.payload\.dto';

 

// SVC\-30 — inbound, HMAC\-signed webhook from Didit\. Not a user or

// internal\-service caller — authenticated by signature header, not a

// guard \(Doc 03 §10\)\. No @UseGuards\(\) here on purpose; the signature

// check happens inside the service call \(Doc 05\)\.

@Controller\('v1/identity\-verification/webhooks'\)

export class IdentityVerificationWebhooksController \{

  constructor\(private readonly service: IdentityVerificationService\) \{\}

 

  @Post\('didit'\)

  @HttpCode\(HttpStatus\.OK\)

  async handleDiditWebhook\(

    @Body\(\) payload: DiditWebhookPayloadDto,

    // Exact header name is not confirmed by any source — placeholder

    // pending Didit's real webhook documentation \(Section 4\)\.

    @Headers\('x\-didit\-signature'\) signature: string | undefined,

  \): Promise<\{ received: boolean \}> \{

    await this\.service\.handleDiditWebhook\(payload, signature\);

    return \{ received: true \};

  \}

\}

## __Step 9 — Wire Into the App Module and main\.ts__

This step only shows the additions this document introduces\. Do not remove the TypeOrmModule\.forRoot\(\.\.\.\) call Doc 03 already added\.

__FILE: apps/identity\-verification\-service/src/app\.module\.ts \(Controllers & Providers section\)__

import \{ Module \} from '@nestjs/common';

import \{ TypeOrmModule \} from '@nestjs/typeorm';

import \{ identityVerificationDataSourceOptions \} from '\./database/data\-source';

import \{ IdentityVerificationProfile \} from '\./entities/identity\-verification\-profile\.entity';

import \{ IdentityDocument \} from '\./entities/identity\-document\.entity';

import \{ VerificationAttempt \} from '\./entities/verification\-attempt\.entity';

import \{ IdentityVerificationController \} from '\./controllers/identity\-verification\.controller';

import \{ IdentityVerificationInternalController \} from '\./controllers/identity\-verification\-internal\.controller';

import \{ IdentityVerificationWebhooksController \} from '\./controllers/identity\-verification\-webhooks\.controller';

import \{ IdentityVerificationService \} from '\./services/identity\-verification\.service';

 

@Module\(\{

  imports: \[

    TypeOrmModule\.forRoot\(identityVerificationDataSourceOptions\),

    // Registers the three entities so @InjectRepository\(\.\.\.\) resolves

    // inside IdentityVerificationService \(Step 7\)\.

    TypeOrmModule\.forFeature\(\[IdentityVerificationProfile, IdentityDocument, VerificationAttempt\]\),

  \],

  controllers: \[

    IdentityVerificationController,

    IdentityVerificationInternalController,

    IdentityVerificationWebhooksController,

  \],

  providers: \[IdentityVerificationService\],

\}\)

export class AppModule \{\}

main\.ts needs two additions: the global validation pipe \(so every DTO's decorators actually run\), and the global exception filter \(Step 6b\)\. The version prefix \(Architecture Overview §7\.4\) is already applied — each controller in Step 8 declares its own "v1/\.\.\." path directly in @Controller\(\), so main\.ts must NOT also call app\.setGlobalPrefix\('v1'\); doing both would double the prefix into /v1/v1/\.\.\.\.

__FILE: apps/identity\-verification\-service/src/main\.ts \(additions\)__

import \{ NestFactory \} from '@nestjs/core';

import \{ ValidationPipe \} from '@nestjs/common';

import \{ AppModule \} from '\./app\.module';

import \{ AllExceptionsFilter \} from '\./common/filters/all\-exceptions\.filter';

 

async function bootstrap\(\) \{

  const app = await NestFactory\.create\(AppModule\);

 

  // Do NOT also call app\.setGlobalPrefix\('v1'\) here — every controller

  // in Step 8 already declares "v1/\.\.\." directly in its @Controller\(\)

  // path\. Adding a global prefix on top would double it into

  // /v1/v1/identity\-verification/\.\.\.\.

 

  // Runs every DTO's class\-validator decorators \(Steps 4–5\) on every

  // request; strips any field not declared on the DTO; converts plain

  // JSON into real class instances so decorators like @ValidateIf can

  // read sibling properties\.

  app\.useGlobalPipes\(

    new ValidationPipe\(\{

      whitelist: true,

      forbidNonWhitelisted: true,

      transform: true,

    \}\),

  \);

 

  // Turns every thrown error into the shared \{ code, message, details? \}

  // shape \(Step 6b\)\.

  app\.useGlobalFilters\(new AllExceptionsFilter\(\)\);

 

  await app\.listen\(process\.env\.PORT ?? 3000\);

\}

bootstrap\(\);

## __Step 10 — Verify__

Three checks: the app starts and every route registers, validation actually rejects bad input, and the error shape looks right end to end\.

__10a\. Start the service__

__Run from: apps/identity\-verification\-service/__

npm run start:dev

Expected: the NestJS startup log lists every route from Section 6 \("Mapped \{/v1/identity\-verification/me, GET\} route" and similarly for each other route\)\. If a route is missing, re\-check that its controller is listed in app\.module\.ts's controllers array \(Step 9\)\.

__10b\. Confirm validation actually runs__

With the service running in another terminal, send a request missing a required field and an extra, undeclared field:

curl \-i \-X POST http://localhost:3000/v1/identity\-verification/travel\-classification \\

  \-H "Authorization: Bearer test" \\

  \-H "Content\-Type: application/json" \\

  \-d '\{"classification": "not\_a\_real\_value", "extraField": "should be stripped"\}'

Expected response: HTTP 401, because BearerAuthGuard is still the Step 6 placeholder that always rejects\. This is correct for now — it confirms the guard is wired in\. Once Doc 05 \(or whoever replaces the guard\) supplies real authentication, re\-run this same request with a valid token and expect HTTP 400 with code: "VALIDATION\_ERROR" and a details\.errors array naming both problems: the invalid classification value and the unexpected extraField\.

__10c\. Confirm the error shape__

Every error response, regardless of which controller or guard produced it, should come back as exactly:

\{

  "code": "SOME\_CODE",

  "message": "A human\-readable explanation\.",

  "details": \{ \}

\}

If any response instead shows NestJS's default \{ statusCode, message, error \} shape, the AllExceptionsFilter \(Step 6b\) is not registered — re\-check main\.ts's app\.useGlobalFilters\(\.\.\.\) call\.

# __6\. Full Endpoint Reference__

__Method / Path__

__Full Route__

__Auth__

__Request__

__Response__

__Key Errors__

GET

/v1/identity\-verification/me

bearer

none

ProfileStatusResponseDto

401 \(auth\)

POST

/v1/identity\-verification/home\-country/confirm

bearer

none

ProfileStatusResponseDto

409 NO\_DETECTED\_LOCATION

POST

/v1/identity\-verification/travel\-classification

bearer

TravelClassificationRequestDto

ProfileStatusResponseDto

400 VALIDATION\_ERROR

POST

/v1/identity\-verification/travel\-duration

bearer

TravelDurationRequestDto

ProfileStatusResponseDto

400 VALIDATION\_ERROR; 409 CLASSIFICATION\_REQUIRED

POST

/v1/identity\-verification/documents/upload\-url

bearer

DocumentUploadUrlRequestDto

DocumentUploadUrlResponseDto

400 VALIDATION\_ERROR

POST

/v1/identity\-verification/documents

bearer

SubmitDocumentRequestDto

DocumentResponseDto

400 VALIDATION\_ERROR; 400 DOCUMENT\_EXPIRED; 409 DUPLICATE\_DOCUMENT; 429 RETRY\_LIMIT\_EXCEEDED

POST

/v1/identity\-verification/documents/:documentId/verify

bearer

none

VerificationSessionResponseDto

404 DOCUMENT\_NOT\_FOUND; 429 RETRY\_LIMIT\_EXCEEDED; 403 VPN\_PROXY\_DETECTED; 502 VENDOR\_UNAVAILABLE

GET

/v1/identity\-verification/documents

bearer

none

DocumentResponseDto\[\]

401 \(auth\)

GET

/v1/identity\-verification/accepted\-documents

bearer

AcceptedDocumentsRequestDto \(query: issuingCountry, ISO 3166\-1 alpha\-2\)

AcceptedDocumentsResponseDto

400 VALIDATION\_ERROR; 503 DOCUMENT\_COVERAGE\_UNAVAILABLE

GET

/v1/internal/identity\-verification/status/:userId

internal

none

InternalStatusResponseDto

401 \(auth\); 404 PROFILE\_NOT\_FOUND

POST

/v1/identity\-verification/webhooks/didit

HMAC signature

DiditWebhookPayloadDto

\{ received: true \}

401 INVALID\_SIGNATURE; 404 \(unknown session\) — both Doc 05

# __7\. Error Shape Reference__

Every code this document's own controllers and guards can produce\. Doc 05 will add a small number more \(INVALID\_SIGNATURE for the webhook, at minimum\) once its logic is implemented — this table covers only what Section 6's routes and Steps 2–9 already define\.

__Code__

__HTTP Status__

__Meaning__

__Source__

VALIDATION\_ERROR

400

One or more request fields failed a class\-validator rule \(Steps 4–5\)\. details\.errors lists each failure\.

Global ValidationPipe \(Step 9\)

DOCUMENT\_EXPIRED

400

expirationDate is in the past\.

SVC\-12

NO\_DETECTED\_LOCATION

409

Nothing to confirm — no detected country is on the profile yet\.

SVC\-02

CLASSIFICATION\_REQUIRED

409

Travel duration submitted before a Temporarily Traveling classification exists\.

SVC\-04, SVC\-05

DUPLICATE\_DOCUMENT

409

This document is already on file under a different account\.

SVC\-17

RETRY\_LIMIT\_EXCEEDED

429

The three\-attempt limit has been reached\.

SVC\-15

VPN\_PROXY\_DETECTED

403

Verification cannot proceed while a VPN/proxy is detected\.

00 §4

VENDOR\_UNAVAILABLE

502

Didit could not be reached or failed unexpectedly\. Deliberately generic — Didit's own error vocabulary is unconfirmed \(Doc 03 §10\)\. Per TRVG §5 and Doc 03 §8c, throwing this exception must not by itself change identityVerificationStatus toward a rejected/blocked value — only a vendor decision may do that\.

This document, Section 4

PROFILE\_NOT\_FOUND

404

No profile exists for the given userId \(internal\-controller path only — the user\-facing controller lazily creates one instead\)\.

This document, Section 4

DOCUMENT\_NOT\_FOUND

404

documentId does not exist or does not belong to the caller\.

This document

REQUEST\_FAILED

varies

Fallback for any other NestJS HttpException not covered above \(e\.g\. an unhandled guard rejection\)\.

AllExceptionsFilter \(Step 6b\)

INTERNAL\_ERROR

500

Anything unexpected\. Never includes internal details in the message \(Architecture Overview §7\.3\)\.

AllExceptionsFilter \(Step 6b\)

# __8\. Business Logic Notes for Doc 05__

Every placeholder method in Step 7's service stub already carries a NotImplementedException message naming what it must do\. This section is a single consolidated checklist of those requirements, so Doc 05 can be built method\-by\-method without re\-reading this entire document first\.

- getOrCreateProfile — create a new identity\_verification\_profiles row on first access if none exists for this userId \(this document's lazy\-creation decision, Section 4\), rather than requiring a separate provisioning endpoint\.
- confirmHomeCountry — copy detectedCountry into verifiedHomeCountry and stamp verifiedHomeCountryConfirmedAt; throw NoDetectedLocationException if detectedCountry is null\.
- recordTravelClassification / recordTravelDuration — SVC\-04/SVC\-05; recordTravelDuration must throw ClassificationRequiredException unless travelClassification is already temporarily\_traveling\.
- createDocumentUploadUrl — generate a Cloudflare R2 pre\-signed PUT URL and a corresponding object key to hand back as documentImageReference \(Doc 03 §8, this document's Section 4\)\.
- submitDocument — run the duplicate\-detection transaction exactly as specified in Doc 03 §8a \(advisory lock, cross\-profile lookup, DuplicateDocumentException on a match\), compute documentNumberNormalized server\-side as a one\-way hash of the trimmed, upper\-cased documentNumber \(algorithm pending Security/Engineering — Doc 03 §6b\), and persist the row\.
- startVerificationSession — enforce the three\-attempt limit per Doc 03 §8b \(RetryLimitExceededException once reached; account\-wide, resolved 18 September 2026 — Answer 3, TRVG2 §2 gate\-table note — Doc 05 implements this\), check the VPN/proxy signal \(VpnProxyDetectedException, now carrying which of VPN/proxy/both was detected — TRVG2 §1\.5\), then call Didit and return its session identifiers\. Per TRVG2 §5\.1 and Doc 03 §8c, a VendorUnavailableException must not by itself change identityVerificationStatus toward a rejected/blocked value — only a vendor decision may do that; this is now confirmed policy \(Answer 6\), not just a structural consequence of the code\.
- getStatusForInternalCaller — a plain read; throw ProfileNotFoundException if no profile exists \(unlike the user\-facing getOrCreateProfile, this path must not silently create one for an arbitrary userId\)\.
- handleDiditWebhook — verify the HMAC signature before doing anything else \(SVC\-30\), look up the matching verification\_attempts row by vendor\_session\_id idempotently \(Doc 03 §6c — that column is unique specifically to make this safe to call twice\), and update the relevant status fields\.

# __9\. Pending Confirmations Carried Into This Spec__

- The bearer\-auth and internal\-service guards \(Step 6a\) are structural placeholders, not real authentication — both currently throw on every call\. Confirmed dependency for the replacement: auth\-service \(issues JWTs for internal services as well as end users\) plus a shared guard under /shared per §7\.2\. Not confirmed: the exact claim shape, signing\-key distribution, or whether that shared guard already exists\. This is the single most important thing to resolve before any of these routes are exposed anywhere reachable\.
- The document upload\-URL flow \(Section 4, Step 4c\) is this document's own recommended pattern, not a confirmed design\. If the frontend's actual upload mechanism differs, the DocumentUploadUrlRequestDto/ResponseDto pair and its endpoint should change to match — nothing else in this document depends on the exact mechanism\.
- The Didit webhook's request DTO and its signature header name \(x\-didit\-signature\) are placeholders pending Didit's real webhook documentation \(Doc 03 §10\)\. Do not build Doc 05's signature verification against the exact field names in DiditWebhookPayloadDto without checking Didit's actual docs first\.
- documentImageReference is required on every submission because Doc 03's schema requires it, not because any source specifically confirmed manual\-entry submissions must include an image\. If that turns out to be wrong, it is a Doc 03 schema question to raise, not something to patch around at the DTO level\.
- VENDOR\_UNAVAILABLE and VENDOR\_ERROR\-style codes are deliberately generic\. Once Didit's real API error responses are known, Doc 05 should likely add more specific codes rather than force everything through this one generic pair\.
- ProfileStatusResponseDto \(Section 5a\) does not expose “remaining attempts,” which TRVG §6 \(“Data Exposure”\) lists as something the account holder may receive\. It is not added here because its calculation depends on Doc 03's own open question \(Section 8b, “OPEN QUESTION — ATTEMPT\_COUNT SCOPE”\): whether the three\-attempt budget is account\-wide or resets per distinct document\. Add this field only after that scope question is resolved, computed consistently with whichever derivation Doc 03 settles on\.

# __10\. What's Next__

- Doc 05 — Business Logic & Workflows: fill in every placeholder method in Step 7's service, replace the two guards in Step 6a with real authentication, and confirm Didit's actual webhook and session\-response schemas against Steps 8c and 5d\.
- Document 06 — Identity Verification Setup & Bootstrapping: the rest of app\.module\.ts, Dockerfile, and health\-check wiring this document's Step 9 builds on top of\.
- Once Doc 05 is complete, update the Required Docs Checklist to mark Doc 04 and Doc 05 both complete\.

