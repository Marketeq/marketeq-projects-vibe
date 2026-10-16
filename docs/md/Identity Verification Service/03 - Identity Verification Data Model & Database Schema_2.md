__03 — IDENTITY VERIFICATION DATA MODEL & DATABASE SCHEMA__

*Entities, Migrations, Constraints & Persistence — identity\-verification\-service*

__Epic: __Identity Verification

__Document Role: __Production\-ready implementation doc: database schema, TypeORM entities, and migration for identity\-verification\-service\. First doc in the 03\+ build series\.

__Prerequisites: __00–02 \(Service Overview, Technical Architecture, Feature List — backend\), Identity Verification Decision Record \(31 Aug 2026\), Identity Verification Data Dictionary

__Author: __CTO — written for a developer building this microservice for the first time

__Status: __Final — ready to implement

__Date: __1 September 2026

__UPDATE — 16 SEPTEMBER 2026__

Incorporates Technical Requirements — Verification Gates \(TRVG, 11 Sep 2026\), a source that post\-dates this document's 1 September 2026 draft and is now reflected in revised Documents 00—02\. document\_number\_normalized \(Section 6b, Section 8a, entity Step 4b\) now requires a one\-way hash rather than stored plaintext — the algorithm and whether issuing\_country/document\_type join the hash input remain pending Security/Engineering confirmation; the composite index and lookup design are unchanged, and raw document\_number is unaffected\. Two new nullable columns, document\_expires\_on and last\_evaluated\_at, are added to identity\_verification\_profiles \(Section 6a, entity Step 4a, migration Step 8\) to support the EXPIRED transition \(TRVG §1\.1, §3\); population and scheduled\-job mechanics are not specified here\. identity\_verification\_status \(Step 3, Section 6a, Section 10, migration Step 8\) is expanded to TRVG's nine\-value model \(§1\.2\); the default changes from NOT\_VERIFIED to UNSTARTED; how historical data would map from the retired submitted\_pending\_review/rejected\_blocked values is an unresolved prerequisite to any real migration\. New Section 8c documents that a vendor outage must not be treated as a rejection \(TRVG §5\)\. Two open\-question notes are added without changing behavior: attempt\_count's account\-wide\-versus\-per\-document scope \(Section 8b\), and location\_verification\_status's shared enum\-type declaration with its value range left unresolved \(Section 6a\)\. No identifier is renamed, deleted, or restructured beyond the default\-value change noted above\.

Update — 18 September 2026: incorporates Christopher’s answers to the Unresolved Questions register and Technical Requirements — Verification Gates 2 \(“TRVG2”\)\. Two new nullable columns are added to identity\_verification\_profiles \(Section 6a, entity Step 4a, migration Step 8\): expired\_at \(drives the 30\-day grace window, in\_grace, TRVG2 §1\.1–§2\) and eligible\_on \(the date a BLOCKED\_AGE holder turns 18, derived from the document and discarded — no date of birth is retained, TRVG2 §3\)\. document\_type\_label is added to identity\_documents \(Section 6b, entity Step 4b\) as a display\-only field; document\_type itself is unchanged — four values, one shared category for what earlier drafts described as two \(Answer 7, corrects §6b’s prior framing\)\. Section 8b’s attempt\_count scope, previously an open question, is resolved: account\-wide, not per\-document \(TRVG2 §2 gate\-table note; Answer 3\)\. Section 10’s SVC\-32/date\_of\_birth dependency is resolved by confirmation rather than by adding a column — TRVG2 confirms deriving age and discarding the raw birth date, which is the pattern this schema’s absence of a date\_of\_birth column already anticipated\. No identifier already present in this schema was renamed or deleted\.

Update — 21 September 2026 \(SOP B compliance review, Doc 03 pass\): four additive items; nothing above is altered\. Engineering decision made under Christopher's SOP guidance \(five\-question technical resolution, Q2\): document\_number\_normalized’s hash algorithm is HMAC\-SHA\-256, keyed with a KMS\-held pepper, computed over the normalized document number only — issuing\_country/document\_type do not join the hash input \(Section 6b, Step 4b\)\. This changes nothing structural: the column type, the composite index, and Section 8a’s lookup pattern are unaffected\. Left as separate, not\-yet\-implemented considerations: field\-level encryption of the raw document\_number column, secure management of the pepper itself, and migrating any existing plaintext document\_number\_normalized values to the new hash \(Section 10\)\. Engineering decision made under Christopher's SOP guidance \(Q1\): seven of TRVG2’s nine status values \(excluding BLOCKED\_AGE and EXPIRED\) are proposed as reachable for location\_status \(Section 6a\)\. Left explicitly unresolved: whether EXPIRED applies to location\_status at all \(a genuine conflict against the Location Verification Build Specification’s “never expires” rule\) and the old\-value\-to\-new\-value migration mapping \(Section 10\); this document does not change the location\_verification\_status Postgres enum type or add any column\. Several live citations of “Technical Requirements — Verification Gates” / bare “TRVG” are relabeled TRVG2 \(Sections 4, 6a, 6b, 8c, 10, and the Step 4a/4b code comments\); content unchanged\.

# __1\. Purpose & Scope__

This document defines the complete database schema for identity\-verification\-service: every table, column, data type, relationship, constraint, and index\. It contains the full TypeORM entity code and the full database migration needed to create the schema in Postgres, plus step\-by\-step instructions to build and verify it\.

This document does NOT cover: REST endpoints or request/response DTOs \(Doc 04 — API Specification\), the vendor \(Didit\) integration or duplicate\-detection service logic \(Doc 05 — Business Logic & Workflows\), or the full app\.module\.ts / main\.ts bootstrap \(the Setup & Bootstrapping doc in this series\)\. Where this document's schema depends on a decision owned by one of those docs, it says so explicitly and links forward rather than guessing\.

__HOW THIS DOCUMENT USES ITS SOURCES__

Every table, column, and constraint below is drawn from 00 — Service Overview, 01 — Technical Architecture, 02 — Feature List \(backend\), the Identity Verification Decision Record, and the Identity Verification Data Dictionary\. Where a source leaves a detail undecided \(an exact enum vocabulary, a retention duration, a match technique\), this document makes the narrowest engineering decision needed to ship a working schema, and flags it clearly so it is never mistaken for a confirmed Product or vendor decision\. Section 4 lists every one of these decisions in one place\.

# __2\. Prerequisites__

Before starting, make sure you have:

- Access to the marketeq\-projects\-nestjs monorepo, with the apps/identity\-verification\-service/ folder already scaffolded \(Dockerfile, package\.json, empty src/app\.module\.ts, src/main\.ts\) per the platform's standard service template\. If this folder does not exist yet, create it first, following the same pattern as any existing service \(e\.g\. notification\-service\)\.
- Node\.js and npm installed locally, matching the version the monorepo's other services use\.
- A Postgres connection string for the shared Supabase instance \(DATABASE\_URL\) with permission to create schemas, types, and tables\. Ask whoever administers Supabase access for this service's credentials if you don't have them\.
- psql \(the Postgres command\-line client\) installed, or an equivalent Postgres GUI, for the verification steps in Section 5, Step 9\.
- Basic familiarity with the terminal and running npm scripts\. No prior TypeORM experience is assumed — every command below is explained\.

# __3\. What You're Building__

This schema has three tables, all living in a dedicated Postgres schema named identity\_verification \(Technical Architecture §7 — a recommended default, pending Infrastructure/Security confirmation, inside the shared Supabase Postgres instance every other Marketeq service already uses\):

__identity\_verification\_profiles__

One row per user account\. This is the "hub" table: it holds the user's confirmed home country, their most recently detected location, their travel/relocation classification, and both independent verification\-status flags \(identity and location\)\.

__identity\_documents__

One row per document a user submits \(scan or manual entry\)\. Many rows can belong to one profile — a user may submit more than one document across retries or re\-verification\. Holds document type, issuing country, the document number, expiration date, the pointer to the stored image, and which verification depth \(Registry Validated or Authenticated\) it achieved\.

__verification\_attempts__

One row per verification attempt against the vendor \(Didit\) — the audit trail required by SVC\-23\. Many rows can belong to one profile and, usually, one document\. Holds the vendor's session ID, the outcome, and the VPN/proxy signal observed at that moment\.

In plain terms: a user has one profile\. That profile can have several submitted documents\. Each document can have several verification attempts \(up to the three\-attempt limit\)\. \[Superseded, 18 September 2026: per Christopher's Answer 3 and TRVG2 §2's gate\-table note, the three\-attempt limit is counted account\-wide \(profile\_id alone\), not per document — this sentence's per\-document phrasing is a documentation wording issue only, not a schema change; see Section 4's attempt\_count note and Section 8b below for the confirmed scope\.\] Nothing about notification events, travel\-reminder cadence numbers, or the minimum\-age rule gets its own table — Section 4 explains why for each one\.

identity\_verification\_profiles \(1\) ──< identity\_documents \(many\)
        │                                        │
        │                                        │
        └──────────< verification\_attempts \(many\) ┘
              \(an attempt links to one profile, and optionally to
               the one document it was verifying\)

# __4\. Engineering Decisions Made in This Document__

These are implementation choices this document had to make because no earlier source specifies them\. None of them are Product or vendor decisions, and none override anything already confirmed\. Each is also called out inline where it applies\.

- Three tables, not ten\. The Data Dictionary lists 10 field groups; several of them \(Notification Event, Travel\-Mode schedule parameters, minimum\_age\_years, account\_deletion\_cascade, one\_account\_per\_person\) are not durable per\-user data — they are message payloads, fixed configuration constants, or enforcement rules implemented through the relationships/constraints below, not columns\. Section 6 explains where each dictionary group landed\.
- date\_of\_birth is NOT included in this schema\. SVC\-32 requires declining a submission when the document's date of birth shows the person is under 18, but Christopher's Step 10 clarification confirmed that a persisted date\-of\-birth field is not currently part of the confirmed design — it exists only as a UX Requirements suggestion \(Data Dictionary, "Document Submission" group\), not a production feature\. This document does not invent a field or an alternative mechanism to close that gap\. Section 10 records the resulting open dependency for SVC\-32\.
- attempt\_count is NOT a stored column\. It is derived by counting verification\_attempts rows for a profile/document, or by reading the highest attempt\_number\. \[Superseded, 18 September 2026: per Christopher's Answer 3 and TRVG2 §2's gate\-table note, this count is account\-wide \(profile\_id alone\) — not per document\. The "profile/document" phrasing above should be read as "profile" only; see Section 8b\.\] Storing a separate counter alongside the rows that already prove the count invites the two going out of sync — a classic and avoidable bug\.
- Duplicate\-document detection \(SVC\-16/SVC\-17\) is NOT enforced with a blind unique database constraint\. A blind UNIQUE\(document\_number, issuing\_country, document\_type\) constraint would also block a legitimate user from resubmitting their own document after a failed attempt — which is not what "a document already on file against a different account" means\. Section 8 explains the correct, concurrency\-safe pattern and hands it to Doc 05 to implement in full\. This schema implements only exact\-match detection; broader biometric/cross\-document \(1:N\) matching remains a technical recommendation pending confirmation that Didit supports that capability, not a built requirement — see Section 10\.
- identity\_rejection\_reason exists as a column because SOME way to distinguish why a submission was rejected/blocked is operationally necessary once that status exists at all \(Decision Record confirms a Rejected/blocked outcome exists\) — but its exact naming and value set are not specified by any source, so it is stored as free text \(varchar\), not a fixed database enum, and must not be read as a confirmed Product vocabulary\.
- attempt\_outcome is stored as free text \(varchar\), not a native Postgres enum, precisely because Didit's real outcome vocabulary is not specified by any source \(Decision Record §7\.1\)\. Locking it into a database enum type would have quietly turned a placeholder into a schema\-level commitment\. The three\-value list used in the TypeScript code \(Step 3\) is a development convenience only, not a confirmed vendor contract\.
- identity\_verification\_status now uses TRVG's nine\-value model — UNSTARTED, IN\_PROGRESS, PENDING, VERIFIED, FAILED, FAILED\_FINAL, BLOCKED\_DUPLICATE, BLOCKED\_AGE, EXPIRED — per TRVG2 §1\.2 \("Status enumeration"\), which post\-dates this document's original 1 September 2026 draft and now specifies exact wording for all nine states, superseding the four\-value placeholder model and the "not specified by any source" framing this bullet previously used\. How the old not\_verified/submitted\_pending\_review/verified/rejected\_blocked values map onto the nine new ones is not fully determined by any source — see Section 10 and the 16 September 2026 update note above\.
- All three tables use ON DELETE CASCADE from identity\_verification\_profiles downward, so deleting a profile deletes its documents and attempts in one operation, with nothing retained afterward\. This satisfies SVC\-33 \(documents deleted with the account\) and extends the same treatment to attempt/audit rows, since no source asserts they must outlive the account\. This schema does NOT implement the separately\-discussed technical recommendation to retain a one\-way biometric fingerprint hash after account deletion for cross\-account duplicate prevention — that remains a recommendation pending privacy/legal confirmation, not a built feature\. See Section 10\.

# __5\. Step\-by\-Step Implementation__

Follow these steps in order\. Every code block names the exact file path to create it in, relative to the repository root \(marketeq\-projects\-nestjs/\)\. All paths below start from apps/identity\-verification\-service/ — create that folder first if it does not already exist\.

## __Step 1 — Install Dependencies__

Open a terminal, move into the service folder, and install the packages this schema needs\. These are the same ORM/database packages every other Marketeq service already uses \(Technical Architecture §6, §17\) — nothing new is introduced\.

__Run from: apps/identity\-verification\-service/__

npm install typeorm@^0\.3\.20 pg@^8\.12\.0 @nestjs/typeorm@^10\.0\.2 reflect\-metadata@^0\.2\.2

npm install \-\-save\-dev ts\-node@^10\.9\.2 typescript@^5\.5\.4 @types/pg@^8\.11\.6

__IF THIS IS A BRAND\-NEW, EMPTY SERVICE FOLDER__

If apps/identity\-verification\-service/package\.json does not exist yet, this service hasn't been scaffolded\. Create it first with the minimal starter below, then re\-run the install commands above\.

__FILE: apps/identity\-verification\-service/package\.json__

\{

  "name": "identity\-verification\-service",

  "version": "0\.0\.1",

  "private": true,

  "scripts": \{

    "build": "nest build",

    "start:dev": "nest start \-\-watch"

  \},

  "dependencies": \{\},

  "devDependencies": \{\}

\}

## __Step 2 — Add the Database Environment Variable__

This service reads one environment variable for its database connection, matching the platform convention \(Architecture Overview, Appendix\)\. Add it to your local \.env file \(create the file if it doesn't exist\) and, separately, to this service's environment configuration in the Supabase dashboard when you deploy\.

__FILE: apps/identity\-verification\-service/\.env__

DATABASE\_URL=postgresql://<user>:<password>@<host>:<port>/<database>

Ask whoever administers Supabase access for this service's actual connection string\. Never commit a real \.env file — add \.env to the repository's \.gitignore if it isn't already covered\.

## __Step 3 — Create the Enum Types__

Every status field, category field, and fixed\-choice field in this schema is backed by a TypeScript enum, which TypeORM turns into a native Postgres enum type\. Putting them all in one file keeps every accepted value in one place for the whole service to import\.

__FILE: apps/identity\-verification\-service/src/entities/enums/identity\-verification\.enums\.ts__

// Every accepted value for every fixed\-choice field in this service's

// data model\. Import from here — never redeclare these elsewhere\.

 

export enum TravelClassification \{

  TEMPORARILY\_TRAVELING = 'temporarily\_traveling',

  PERMANENTLY\_RELOCATED = 'permanently\_relocated',

\}

 

export enum DeclaredDuration \{

  A\_FEW\_DAYS = 'a\_few\_days',

  ONE\_TO\_TWO\_WEEKS = 'one\_to\_two\_weeks',

  MORE\_THAN\_TWO\_WEEKS = 'more\_than\_two\_weeks',

  NOT\_SURE = 'not\_sure',

\}

 

export enum IdentityVerificationStatus \{

  UNSTARTED = 'unstarted',

  IN\_PROGRESS = 'in\_progress',

  PENDING = 'pending',

  VERIFIED = 'verified',

  FAILED = 'failed',

  FAILED\_FINAL = 'failed\_final',

  BLOCKED\_DUPLICATE = 'blocked\_duplicate',

  BLOCKED\_AGE = 'blocked\_age',

  EXPIRED = 'expired',

\}

 

export enum LocationVerificationStatus \{

  NOT\_VERIFIED = 'not\_verified',

  SUBMITTED\_PENDING\_REVIEW = 'submitted\_pending\_review',

  VERIFIED = 'verified',

\}

 

export enum DocumentType \{

  PASSPORT = 'passport',

  ID\_CARD = 'id\_card',

  DRIVERS\_LICENCE = 'drivers\_licence',

  RESIDENCE\_PERMIT = 'residence\_permit',

\}

 

export enum CaptureMethod \{

  SCAN = 'scan',

  MANUAL\_ENTRY = 'manual\_entry',

\}

 

export enum VerificationDepth \{

  REGISTRY\_VALIDATED = 'registry\_validated',

  AUTHENTICATED = 'authenticated',

\}

 

// Development convenience only — NOT a confirmed vendor contract, and NOT

// enforced by the database\. Didit's exact outcome values are not

// specified by any source \(Decision Record §7\.1\)\. The corresponding

// database column \(verification\_attempts\.attempt\_outcome, Step 4c\) is a

// plain varchar, deliberately not a Postgres enum, so that Didit's real

// values can be adopted later without a breaking migration\. Do not treat

// these three values as final, and do not assume application code can

// safely restrict itself to only these three\.

export enum AttemptOutcome \{

  APPROVED = 'approved',

  REJECTED = 'rejected',

  ERROR = 'error',

\}

 

export enum VpnProxyDetectionResult \{

  NONE = 'none',

  VPN\_DETECTED = 'vpn\_detected',

  PROXY\_DETECTED = 'proxy\_detected',

  VPN\_AND\_PROXY\_DETECTED = 'vpn\_and\_proxy\_detected',

\}

## __Step 4 — Create the Entity Files__

An "entity" is a TypeScript class that TypeORM maps directly onto a database table — one class per table\. Create the following three files exactly as shown\.

__4a\. IdentityVerificationProfile__

__FILE: apps/identity\-verification\-service/src/entities/identity\-verification\-profile\.entity\.ts__

import \{

  Entity,

  PrimaryGeneratedColumn,

  Column,

  OneToMany,

  CreateDateColumn,

  UpdateDateColumn,

  Index,

\} from 'typeorm';

import \{

  IdentityVerificationStatus,

  LocationVerificationStatus,

  TravelClassification,

  DeclaredDuration,

\} from '\./enums/identity\-verification\.enums';

import \{ IdentityDocument \} from '\./identity\-document\.entity';

import \{ VerificationAttempt \} from '\./verification\-attempt\.entity';

 

@Entity\(\{ name: 'identity\_verification\_profiles', schema: 'identity\_verification' \}\)

export class IdentityVerificationProfile \{

  @PrimaryGeneratedColumn\('uuid'\)

  id: string;

 

  // External reference to the account in user\-service / auth\-service\.

  // No database\-level foreign key is created across the service

  // boundary — Marketeq services never join across each other's

  // databases \(Architecture Overview §7\.2, "never import from one

  // service's src/ into another"\)\.

  @Index\('idx\_ivp\_user\_id', \{ unique: true \}\)

  @Column\(\{ name: 'user\_id', type: 'uuid', unique: true \}\)

  userId: string;

 

  // \-\-\- Home Country / Location \-\-\-

  @Column\(\{ name: 'verified\_home\_country', type: 'char', length: 2, nullable: true \}\)

  verifiedHomeCountry: string | null;

 

  @Column\(\{ name: 'verified\_home\_country\_confirmed\_at', type: 'timestamptz', nullable: true \}\)

  verifiedHomeCountryConfirmedAt: Date | null;

 

  // Most recently observed detected location\. Not a history log — this

  // is the single latest reading, kept so the service can tell when the

  // detected country changes \(needed to trigger re\-verification and

  // Travel Mode reminder logic\) without re\-querying LocationProvider on

  // every check\.

  @Column\(\{ name: 'detected\_country', type: 'char', length: 2, nullable: true \}\)

  detectedCountry: string | null;

 

  @Column\(\{ name: 'detected\_region\_state', type: 'varchar', length: 120, nullable: true \}\)

  detectedRegionState: string | null;

 

  @Column\(\{ name: 'detected\_city', type: 'varchar', length: 120, nullable: true \}\)

  detectedCity: string | null;

 

  @Column\(\{ name: 'time\_zone', type: 'varchar', length: 64, nullable: true \}\)

  timeZone: string | null;

 

  // \-\-\- Travel / Relocation Declaration \-\-\-

  @Column\(\{

    name: 'travel\_classification',

    type: 'enum',

    enum: TravelClassification,

    enumName: 'travel\_classification\_enum',

    nullable: true,

  \}\)

  travelClassification: TravelClassification | null;

 

  @Column\(\{

    name: 'declared\_duration',

    type: 'enum',

    enum: DeclaredDuration,

    enumName: 'declared\_duration\_enum',

    nullable: true,

  \}\)

  declaredDuration: DeclaredDuration | null;

 

  @Column\(\{ name: 'travel\_mode\_active', type: 'boolean', default: false \}\)

  travelModeActive: boolean;

 

  @Column\(\{ name: 'travel\_mode\_activated\_at', type: 'timestamptz', nullable: true \}\)

  travelModeActivatedAt: Date | null;

 

  // reminder\_recheck\_frequency, reminder\_skip\_thresholds, and

  // first\_reminder\_delay \(Data Dictionary, "Travel / Relocation

  // Declaration"\) are fixed, system\-wide configuration values, not

  // per\-user data — they belong in application config \(Doc 05\), not as

  // columns here\. Only the per\-user scheduling STATE needs a column:

  @Column\(\{ name: 'last\_travel\_reminder\_sent\_at', type: 'timestamptz', nullable: true \}\)

  lastTravelReminderSentAt: Date | null;

 

  @Column\(\{ name: 'next\_travel\_reminder\_at', type: 'timestamptz', nullable: true \}\)

  nextTravelReminderAt: Date | null;

 

  // \-\-\- Identity Verification Status \-\-\-

  @Index\('idx\_ivp\_identity\_status'\)

  @Column\(\{

    name: 'identity\_verification\_status',

    type: 'enum',

    enum: IdentityVerificationStatus,

    enumName: 'identity\_verification\_status\_enum',

    default: IdentityVerificationStatus\.UNSTARTED,

  \}\)

  identityVerificationStatus: IdentityVerificationStatus;

 

  // Free text, deliberately not a database enum\. The rejected/blocked

  // outcome itself is confirmed \(Decision Record\), but neither its exact

  // naming nor a reason\-code vocabulary is specified by any source \(00

  // §6\) — see Section 6 and Section 10\. Do not treat any value written

  // here as a confirmed Product wording\.

  @Column\(\{ name: 'identity\_rejection\_reason', type: 'varchar', length: 64, nullable: true \}\)

  identityRejectionReason: string | null;

 

  // \-\-\- Location Verification Status \-\-\-

  @Index\('idx\_ivp\_location\_status'\)

  @Column\(\{

    name: 'location\_verification\_status',

    type: 'enum',

    enum: LocationVerificationStatus,

    enumName: 'location\_verification\_status\_enum',

    default: LocationVerificationStatus\.NOT\_VERIFIED,

  \}\)

  locationVerificationStatus: LocationVerificationStatus;

 

  // \-\-\- Document Expiry and Re\-Verification \(TRVG2 §1\.1, §3\) \-\-\-

  // Population and scheduled\-job mechanics are Doc 05's responsibility;

  // this document only adds the columns TRVG2 requires\.

  @Column\(\{ name: 'document\_expires\_on', type: 'date', nullable: true \}\)

  documentExpiresOn: string | null;

 

  @Column\(\{ name: 'last\_evaluated\_at', type: 'timestamptz', nullable: true \}\)

  lastEvaluatedAt: Date | null;

  // \-\-\- Grace Window & Age\-Block Clearing \(TRVG2 §1\.1, §2, §3\) \-\-\-

  // expired\_at drives the 30\-day grace window \(in\_grace\); it is set

  // when the profile transitions into EXPIRED\. eligible\_on clears

  // BLOCKED\_AGE automatically\. Population/clearing mechanics are

  // Doc 05's responsibility; this document only adds the columns\.

  @Column\(\{ name: 'expired\_at', type: 'timestamptz', nullable: true \}\)

  expiredAt: Date | null;

  @Column\(\{ name: 'eligible\_on', type: 'date', nullable: true \}\)

  eligibleOn: string | null;

 

  @CreateDateColumn\(\{ name: 'created\_at', type: 'timestamptz' \}\)

  createdAt: Date;

 

  @UpdateDateColumn\(\{ name: 'updated\_at', type: 'timestamptz' \}\)

  updatedAt: Date;

 

  @OneToMany\(\(\) => IdentityDocument, \(document\) => document\.profile\)

  documents: IdentityDocument\[\];

 

  @OneToMany\(\(\) => VerificationAttempt, \(attempt\) => attempt\.profile\)

  attempts: VerificationAttempt\[\];

\}

__4b\. IdentityDocument__

__FILE: apps/identity\-verification\-service/src/entities/identity\-document\.entity\.ts__

import \{

  Entity,

  PrimaryGeneratedColumn,

  Column,

  ManyToOne,

  OneToMany,

  JoinColumn,

  CreateDateColumn,

  UpdateDateColumn,

  Index,

  Check,

\} from 'typeorm';

import \{ IdentityVerificationProfile \} from '\./identity\-verification\-profile\.entity';

import \{ VerificationAttempt \} from '\./verification\-attempt\.entity';

import \{

  DocumentType,

  CaptureMethod,

  VerificationDepth,

\} from '\./enums/identity\-verification\.enums';

 

@Entity\(\{ name: 'identity\_documents', schema: 'identity\_verification' \}\)

// issuing\_state only ever applies to a Driver's Licence \(Service Overview

// §5\)\. Enforced here so bad data can never reach the database, not only

// checked in application code\.

@Check\('chk\_identity\_documents\_issuing\_state', \`"issuing\_state" IS NULL OR "document\_type" = 'drivers\_licence'\`\)

export class IdentityDocument \{

  @PrimaryGeneratedColumn\('uuid'\)

  id: string;

 

  @Index\('idx\_identity\_documents\_profile\_id'\)

  @Column\(\{ name: 'profile\_id', type: 'uuid' \}\)

  profileId: string;

 

  @ManyToOne\(\(\) => IdentityVerificationProfile, \(profile\) => profile\.documents, \{

    onDelete: 'CASCADE',

  \}\)

  @JoinColumn\(\{ name: 'profile\_id' \}\)

  profile: IdentityVerificationProfile;

 

  @Column\(\{

    name: 'document\_type',

    type: 'enum',

    enum: DocumentType,

    enumName: 'document\_type\_enum',

  \}\)

  documentType: DocumentType;

  // Display\-only\. Never branch gate or business logic on this field

  // \(TRVG2 §1\.4\)\. documentType \(above\) remains the canonical,

  // vendor\-aligned value; this is user\-facing wording only\.

  @Column\(\{ name: 'document\_type\_label', type: 'varchar', length: 100, nullable: true \}\)

  documentTypeLabel: string | null;

 

  @Column\(\{ name: 'issuing\_country', type: 'char', length: 2 \}\)

  issuingCountry: string;

 

  // Raw, as captured or entered\. Shown back to the user; never used

  // directly for duplicate matching — see documentNumberNormalized\.

  @Column\(\{ name: 'document\_number', type: 'varchar', length: 64 \}\)

  documentNumber: string;

 

  // A one\-way hash of the trimmed, upper\-cased documentNumber, maintained

  // by the application layer on every write \(TRVG2 §1\.1, §1\.3\)\. Hash

  // algorithm: HMAC\-SHA\-256 with a KMS\-held pepper, over this number

  // only \(Section 6b — engineering decision, Q2, 21 September 2026\)\.

  // Used only by the duplicate\-match

  // lookup \(Section 8\) — never displayed to a user\. Indexed, not unique

  // — see Section 8 for why a unique constraint here would be a bug\.

  @Index\('idx\_identity\_documents\_fingerprint'\)

  @Column\(\{ name: 'document\_number\_normalized', type: 'varchar', length: 64 \}\)

  documentNumberNormalized: string;

 

  @Column\(\{ name: 'expiration\_date', type: 'date' \}\)

  expirationDate: string;

 

  // Driver's Licence only\. Null for every other document type\.

  @Column\(\{ name: 'issuing\_state', type: 'varchar', length: 10, nullable: true \}\)

  issuingState: string | null;

 

  @Column\(\{

    name: 'capture\_method',

    type: 'enum',

    enum: CaptureMethod,

    enumName: 'capture\_method\_enum',

  \}\)

  captureMethod: CaptureMethod;

 

  // Pointer to the stored image \(Cloudflare R2 object key\) — not the

  // image itself \(Technical Architecture §8\)\.

  @Column\(\{ name: 'document\_image\_reference', type: 'varchar', length: 512 \}\)

  documentImageReference: string;

 

  @Column\(\{

    name: 'verification\_depth',

    type: 'enum',

    enum: VerificationDepth,

    enumName: 'verification\_depth\_enum',

    nullable: true,

  \}\)

  verificationDepth: VerificationDepth | null;

 

  // NOTE: There is deliberately no date\_of\_birth column here\. SVC\-32

  // requires enforcing a minimum age of 18 from the document's date of

  // birth, but a persisted date\-of\-birth field is not part of the

  // confirmed design \(Christopher's Step 10 clarification — DOB is a UX

  // Requirements suggestion only, not a production feature\)\. This leaves

  // SVC\-32 without a confirmed data path in this schema — see Section 10

  // for that open dependency\. Do not add this column back without a

  // confirmed Product/Design decision to do so\.

 

  @Column\(\{ name: 'is\_duplicate\_match', type: 'boolean', default: false \}\)

  isDuplicateMatch: boolean;

 

  @Index\('idx\_identity\_documents\_duplicate\_of'\)

  @Column\(\{ name: 'duplicate\_of\_document\_id', type: 'uuid', nullable: true \}\)

  duplicateOfDocumentId: string | null;

 

  @CreateDateColumn\(\{ name: 'created\_at', type: 'timestamptz' \}\)

  createdAt: Date;

 

  @UpdateDateColumn\(\{ name: 'updated\_at', type: 'timestamptz' \}\)

  updatedAt: Date;

 

  @OneToMany\(\(\) => VerificationAttempt, \(attempt\) => attempt\.document\)

  attempts: VerificationAttempt\[\];

\}

__4c\. VerificationAttempt__

__FILE: apps/identity\-verification\-service/src/entities/verification\-attempt\.entity\.ts__

import \{

  Entity,

  PrimaryGeneratedColumn,

  Column,

  ManyToOne,

  JoinColumn,

  CreateDateColumn,

  Index,

  Check,

\} from 'typeorm';

import \{ IdentityVerificationProfile \} from '\./identity\-verification\-profile\.entity';

import \{ IdentityDocument \} from '\./identity\-document\.entity';

import \{

  CaptureMethod,

  DocumentType,

  VpnProxyDetectionResult,

\} from '\./enums/identity\-verification\.enums';

// AttemptOutcome is intentionally NOT imported here — attempt\_outcome is

// stored as plain text \(see the column below\), not this TypeScript enum\.

 

@Entity\(\{ name: 'verification\_attempts', schema: 'identity\_verification' \}\)

// The retry limit is three attempts \(SVC\-15, revised down from an

// earlier ten\-attempt figure\)\. Enforced at the database level as a

// backstop, in addition to whatever the application layer checks\.

@Check\('chk\_verification\_attempts\_attempt\_number', '"attempt\_number" >= 1 AND "attempt\_number" <= 3'\)

export class VerificationAttempt \{

  @PrimaryGeneratedColumn\('uuid'\)

  id: string;

 

  @Index\('idx\_verification\_attempts\_profile\_id'\)

  @Column\(\{ name: 'profile\_id', type: 'uuid' \}\)

  profileId: string;

 

  @ManyToOne\(\(\) => IdentityVerificationProfile, \(profile\) => profile\.attempts, \{

    onDelete: 'CASCADE',

  \}\)

  @JoinColumn\(\{ name: 'profile\_id' \}\)

  profile: IdentityVerificationProfile;

 

  @Index\('idx\_verification\_attempts\_document\_id'\)

  @Column\(\{ name: 'document\_id', type: 'uuid', nullable: true \}\)

  documentId: string | null;

 

  @ManyToOne\(\(\) => IdentityDocument, \(document\) => document\.attempts, \{

    onDelete: 'CASCADE',

    nullable: true,

  \}\)

  @JoinColumn\(\{ name: 'document\_id' \}\)

  document: IdentityDocument | null;

 

  // Didit's session identifier\. Unique so the inbound HMAC\-signed

  // webhook handler \(Doc 05\) can look up the matching attempt

  // idempotently — processing the same webhook delivery twice must not

  // create two rows\.

  @Index\('idx\_verification\_attempts\_vendor\_session\_id', \{ unique: true \}\)

  @Column\(\{ name: 'vendor\_session\_id', type: 'varchar', length: 128 \}\)

  vendorSessionId: string;

 

  @CreateDateColumn\(\{ name: 'attempt\_timestamp', type: 'timestamptz' \}\)

  attemptTimestamp: Date;

 

  @Column\(\{

    name: 'attempt\_method',

    type: 'enum',

    enum: CaptureMethod,

    enumName: 'capture\_method\_enum',

  \}\)

  attemptMethod: CaptureMethod;

 

  @Column\(\{

    name: 'attempt\_document\_type',

    type: 'enum',

    enum: DocumentType,

    enumName: 'document\_type\_enum',

  \}\)

  attemptDocumentType: DocumentType;

 

  // Free text, deliberately not a database enum — Didit's exact outcome

  // vocabulary is not specified by any source\. Populate it from the

  // vendor's real webhook payload once confirmed \(Doc 05\); the

  // AttemptOutcome TypeScript enum \(Step 3\) is a development convenience,

  // not a closed set this column enforces\. See Section 6 and Section 10\.

  @Column\(\{ name: 'attempt\_outcome', type: 'varchar', length: 32 \}\)

  attemptOutcome: string;

 

  // Vendor\-provided\. Exact code set not specified by any source\. Stored

  // as free text\. Server\-side only — never returned to the end user

  // \(Service Overview §3, item 12\)\.

  @Column\(\{ name: 'failure\_code', type: 'varchar', length: 64, nullable: true \}\)

  failureCode: string | null;

 

  // This attempt's position in the 3\-attempt sequence \(SVC\-15\)\. See

  // Section 4 for why there is no separate stored attempt\_count\.

  @Column\(\{ name: 'attempt\_number', type: 'smallint' \}\)

  attemptNumber: number;

 

  @Column\(\{

    name: 'vpn\_proxy\_detection\_result',

    type: 'enum',

    enum: VpnProxyDetectionResult,

    enumName: 'vpn\_proxy\_detection\_result\_enum',

    default: VpnProxyDetectionResult\.NONE,

  \}\)

  vpnProxyDetectionResult: VpnProxyDetectionResult;

\}

## __Step 5 — Create the TypeORM Data Source__

This file is the single source of truth for the database connection\. Both the migration CLI \(Step 7–8\) and the running NestJS app \(Step 6\) use it, so the schema definition and the app's runtime connection can never drift apart\.

__FILE: apps/identity\-verification\-service/src/database/data\-source\.ts__

import 'reflect\-metadata';

import \{ DataSource, DataSourceOptions \} from 'typeorm';

import \* as path from 'path';

 

export const identityVerificationDataSourceOptions: DataSourceOptions = \{

  type: 'postgres',

  url: process\.env\.DATABASE\_URL,

  schema: 'identity\_verification',

  entities: \[path\.join\(\_\_dirname, '\.\.', 'entities', '\*\.entity\{\.ts,\.js\}'\)\],

  migrations: \[path\.join\(\_\_dirname, 'migrations', '\*\{\.ts,\.js\}'\)\],

  // Never true outside a local scratch database\. Schema changes are made

  // exclusively through migrations \(Step 7\) so every environment ends up

  // with the exact same schema, in the exact same order\.

  synchronize: false,

  logging: process\.env\.NODE\_ENV \!== 'production',

\};

 

const dataSource = new DataSource\(identityVerificationDataSourceOptions\);

export default dataSource;

## __Step 6 — Wire TypeORM into the App Module__

This step only shows the TypeORM piece\. The rest of app\.module\.ts \(other feature modules, global pipes, etc\.\) is built up across later documents in this series — do not remove anything already there\.

__FILE: apps/identity\-verification\-service/src/app\.module\.ts \(TypeORM section\)__

import \{ Module \} from '@nestjs/common';

import \{ TypeOrmModule \} from '@nestjs/typeorm';

import \{ identityVerificationDataSourceOptions \} from '\./database/data\-source';

 

@Module\(\{

  imports: \[

    TypeOrmModule\.forRoot\(identityVerificationDataSourceOptions\),

    // \.\.\.other feature modules are added here in later documents

  \],

\}\)

export class AppModule \{\}

## __Step 7 — Add Migration Scripts__

Add these four scripts to package\.json so you can run and reverse migrations from the command line\. Merge them into the existing "scripts" block — do not delete any script already there\.

__FILE: apps/identity\-verification\-service/package\.json \(scripts section\)__

\{

  "scripts": \{

    "typeorm": "ts\-node \./node\_modules/typeorm/cli\.js \-d src/database/data\-source\.ts",

    "migration:run": "npm run typeorm \-\- migration:run",

    "migration:revert": "npm run typeorm \-\- migration:revert",

    "migration:generate": "npm run typeorm \-\- migration:generate"

  \}

\}

## __Step 8 — Write the Migration__

A migration is a versioned script that creates \(or changes\) database structure\. This single migration creates the schema, every enum type, all three tables, and every constraint and index defined in this document\. Create the migrations folder and this file inside it\.

__FILE: apps/identity\-verification\-service/src/database/migrations/1756742400000\-CreateIdentityVerificationSchema\.ts__

import \{ MigrationInterface, QueryRunner \} from 'typeorm';

 

export class CreateIdentityVerificationSchema1756742400000 implements MigrationInterface \{

  name = 'CreateIdentityVerificationSchema1756742400000';

 

  public async up\(queryRunner: QueryRunner\): Promise<void> \{

    // 1\. Dedicated schema \(Technical Architecture §7 — recommended

    // default, pending Infrastructure/Security confirmation\)\.

    await queryRunner\.query\(\`CREATE SCHEMA IF NOT EXISTS "identity\_verification";\`\);

 

    // 2\. gen\_random\_uuid\(\), used by every primary key below\.

    await queryRunner\.query\(\`CREATE EXTENSION IF NOT EXISTS "pgcrypto";\`\);

 

    // 3\. Enum types

    await queryRunner\.query\(\`

      CREATE TYPE "identity\_verification"\."travel\_classification\_enum" AS ENUM \(

        'temporarily\_traveling', 'permanently\_relocated'

      \);

    \`\);

    await queryRunner\.query\(\`

      CREATE TYPE "identity\_verification"\."declared\_duration\_enum" AS ENUM \(

        'a\_few\_days', 'one\_to\_two\_weeks', 'more\_than\_two\_weeks', 'not\_sure'

      \);

    \`\);

    await queryRunner\.query\(\`

      CREATE TYPE "identity\_verification"\."identity\_verification\_status\_enum" AS ENUM \(

        'unstarted', 'in\_progress', 'pending', 'verified', 'failed', 'failed\_final', 'blocked\_duplicate', 'blocked\_age', 'expired'

      \);

    \`\);

    await queryRunner\.query\(\`

      CREATE TYPE "identity\_verification"\."location\_verification\_status\_enum" AS ENUM \(

        'not\_verified', 'submitted\_pending\_review', 'verified'

      \);

    \`\);

    await queryRunner\.query\(\`

      CREATE TYPE "identity\_verification"\."document\_type\_enum" AS ENUM \(

        'passport', 'id\_card', 'drivers\_licence', 'residence\_permit'

      \);

    \`\);

    await queryRunner\.query\(\`

      CREATE TYPE "identity\_verification"\."capture\_method\_enum" AS ENUM \(

        'scan', 'manual\_entry'

      \);

    \`\);

    await queryRunner\.query\(\`

      CREATE TYPE "identity\_verification"\."verification\_depth\_enum" AS ENUM \(

        'registry\_validated', 'authenticated'

      \);

    \`\);

    // NOTE: no attempt\_outcome\_enum type is created\. attempt\_outcome

    // \(table 6, below\) is a plain varchar — see Step 3 and Step 4c for

    // why locking Didit's unconfirmed outcome vocabulary into a Postgres

    // enum would have been a source\-grounding mistake\.

    await queryRunner\.query\(\`

      CREATE TYPE "identity\_verification"\."vpn\_proxy\_detection\_result\_enum" AS ENUM \(

        'none', 'vpn\_detected', 'proxy\_detected', 'vpn\_and\_proxy\_detected'

      \);

    \`\);

 

    // 4\. identity\_verification\_profiles

    await queryRunner\.query\(\`

      CREATE TABLE "identity\_verification"\."identity\_verification\_profiles" \(

        "id" uuid NOT NULL DEFAULT gen\_random\_uuid\(\),

        "user\_id" uuid NOT NULL,

        "verified\_home\_country" char\(2\),

        "verified\_home\_country\_confirmed\_at" timestamptz,

        "detected\_country" char\(2\),

        "detected\_region\_state" varchar\(120\),

        "detected\_city" varchar\(120\),

        "time\_zone" varchar\(64\),

        "travel\_classification" "identity\_verification"\."travel\_classification\_enum",

        "declared\_duration" "identity\_verification"\."declared\_duration\_enum",

        "travel\_mode\_active" boolean NOT NULL DEFAULT false,

        "travel\_mode\_activated\_at" timestamptz,

        "last\_travel\_reminder\_sent\_at" timestamptz,

        "next\_travel\_reminder\_at" timestamptz,

        "identity\_verification\_status" "identity\_verification"\."identity\_verification\_status\_enum" NOT NULL DEFAULT 'unstarted',

        "identity\_rejection\_reason" varchar\(64\),

        "location\_verification\_status" "identity\_verification"\."location\_verification\_status\_enum" NOT NULL DEFAULT 'not\_verified',

        "document\_expires\_on" date,

        "last\_evaluated\_at" timestamptz,

  "expired\_at" timestamptz,

  "eligible\_on" date,

        "created\_at" timestamptz NOT NULL DEFAULT now\(\),

        "updated\_at" timestamptz NOT NULL DEFAULT now\(\),

        CONSTRAINT "pk\_identity\_verification\_profiles" PRIMARY KEY \("id"\)

      \);

    \`\);

    await queryRunner\.query\(\`CREATE UNIQUE INDEX "idx\_ivp\_user\_id" ON "identity\_verification"\."identity\_verification\_profiles" \("user\_id"\);\`\);

    await queryRunner\.query\(\`CREATE INDEX "idx\_ivp\_identity\_status" ON "identity\_verification"\."identity\_verification\_profiles" \("identity\_verification\_status"\);\`\);

    await queryRunner\.query\(\`CREATE INDEX "idx\_ivp\_location\_status" ON "identity\_verification"\."identity\_verification\_profiles" \("location\_verification\_status"\);\`\);

 

    // 5\. identity\_documents

    await queryRunner\.query\(\`

      CREATE TABLE "identity\_verification"\."identity\_documents" \(

        "id" uuid NOT NULL DEFAULT gen\_random\_uuid\(\),

        "profile\_id" uuid NOT NULL,

        "document\_type" "identity\_verification"\."document\_type\_enum" NOT NULL,

  "document\_type\_label" varchar\(100\),

        "issuing\_country" char\(2\) NOT NULL,

        "document\_number" varchar\(64\) NOT NULL,

        "document\_number\_normalized" varchar\(64\) NOT NULL,

        "expiration\_date" date NOT NULL,

        "issuing\_state" varchar\(10\),

        "capture\_method" "identity\_verification"\."capture\_method\_enum" NOT NULL,

        "document\_image\_reference" varchar\(512\) NOT NULL,

        "verification\_depth" "identity\_verification"\."verification\_depth\_enum",

        "is\_duplicate\_match" boolean NOT NULL DEFAULT false,

        "duplicate\_of\_document\_id" uuid,

        "created\_at" timestamptz NOT NULL DEFAULT now\(\),

        "updated\_at" timestamptz NOT NULL DEFAULT now\(\),

        CONSTRAINT "pk\_identity\_documents" PRIMARY KEY \("id"\),

        CONSTRAINT "fk\_identity\_documents\_profile" FOREIGN KEY \("profile\_id"\)

          REFERENCES "identity\_verification"\."identity\_verification\_profiles" \("id"\) ON DELETE CASCADE,

        CONSTRAINT "fk\_identity\_documents\_duplicate\_of" FOREIGN KEY \("duplicate\_of\_document\_id"\)

          REFERENCES "identity\_verification"\."identity\_documents" \("id"\) ON DELETE SET NULL,

        CONSTRAINT "chk\_identity\_documents\_issuing\_state"

          CHECK \("issuing\_state" IS NULL OR "document\_type" = 'drivers\_licence'\)

      \);

    \`\);

    await queryRunner\.query\(\`CREATE INDEX "idx\_identity\_documents\_profile\_id" ON "identity\_verification"\."identity\_documents" \("profile\_id"\);\`\);

    await queryRunner\.query\(\`CREATE INDEX "idx\_identity\_documents\_fingerprint" ON "identity\_verification"\."identity\_documents" \("document\_number\_normalized", "issuing\_country", "document\_type"\);\`\);

    await queryRunner\.query\(\`CREATE INDEX "idx\_identity\_documents\_duplicate\_of" ON "identity\_verification"\."identity\_documents" \("duplicate\_of\_document\_id"\);\`\);

 

    // 6\. verification\_attempts

    await queryRunner\.query\(\`

      CREATE TABLE "identity\_verification"\."verification\_attempts" \(

        "id" uuid NOT NULL DEFAULT gen\_random\_uuid\(\),

        "profile\_id" uuid NOT NULL,

        "document\_id" uuid,

        "vendor\_session\_id" varchar\(128\) NOT NULL,

        "attempt\_timestamp" timestamptz NOT NULL DEFAULT now\(\),

        "attempt\_method" "identity\_verification"\."capture\_method\_enum" NOT NULL,

        "attempt\_document\_type" "identity\_verification"\."document\_type\_enum" NOT NULL,

        "attempt\_outcome" varchar\(32\) NOT NULL,

        "failure\_code" varchar\(64\),

        "attempt\_number" smallint NOT NULL,

        "vpn\_proxy\_detection\_result" "identity\_verification"\."vpn\_proxy\_detection\_result\_enum" NOT NULL DEFAULT 'none',

        CONSTRAINT "pk\_verification\_attempts" PRIMARY KEY \("id"\),

        CONSTRAINT "fk\_verification\_attempts\_profile" FOREIGN KEY \("profile\_id"\)

          REFERENCES "identity\_verification"\."identity\_verification\_profiles" \("id"\) ON DELETE CASCADE,

        CONSTRAINT "fk\_verification\_attempts\_document" FOREIGN KEY \("document\_id"\)

          REFERENCES "identity\_verification"\."identity\_documents" \("id"\) ON DELETE CASCADE,

        CONSTRAINT "chk\_verification\_attempts\_attempt\_number"

          CHECK \("attempt\_number" >= 1 AND "attempt\_number" <= 3\)

      \);

    \`\);

    await queryRunner\.query\(\`CREATE INDEX "idx\_verification\_attempts\_profile\_id" ON "identity\_verification"\."verification\_attempts" \("profile\_id"\);\`\);

    await queryRunner\.query\(\`CREATE INDEX "idx\_verification\_attempts\_document\_id" ON "identity\_verification"\."verification\_attempts" \("document\_id"\);\`\);

    await queryRunner\.query\(\`CREATE UNIQUE INDEX "idx\_verification\_attempts\_vendor\_session\_id" ON "identity\_verification"\."verification\_attempts" \("vendor\_session\_id"\);\`\);

  \}

 

  public async down\(queryRunner: QueryRunner\): Promise<void> \{

    await queryRunner\.query\(\`DROP TABLE IF EXISTS "identity\_verification"\."verification\_attempts";\`\);

    await queryRunner\.query\(\`DROP TABLE IF EXISTS "identity\_verification"\."identity\_documents";\`\);

    await queryRunner\.query\(\`DROP TABLE IF EXISTS "identity\_verification"\."identity\_verification\_profiles";\`\);

    await queryRunner\.query\(\`DROP TYPE IF EXISTS "identity\_verification"\."vpn\_proxy\_detection\_result\_enum";\`\);

    // No attempt\_outcome\_enum to drop — that column is a plain varchar\.

    await queryRunner\.query\(\`DROP TYPE IF EXISTS "identity\_verification"\."verification\_depth\_enum";\`\);

    await queryRunner\.query\(\`DROP TYPE IF EXISTS "identity\_verification"\."capture\_method\_enum";\`\);

    await queryRunner\.query\(\`DROP TYPE IF EXISTS "identity\_verification"\."document\_type\_enum";\`\);

    await queryRunner\.query\(\`DROP TYPE IF EXISTS "identity\_verification"\."location\_verification\_status\_enum";\`\);

    await queryRunner\.query\(\`DROP TYPE IF EXISTS "identity\_verification"\."identity\_verification\_status\_enum";\`\);

    await queryRunner\.query\(\`DROP TYPE IF EXISTS "identity\_verification"\."declared\_duration\_enum";\`\);

    await queryRunner\.query\(\`DROP TYPE IF EXISTS "identity\_verification"\."travel\_classification\_enum";\`\);

    // The schema itself and the pgcrypto extension are intentionally left

    // in place — other services on the shared instance may depend on

    // pgcrypto, and dropping the schema here could destroy data outside

    // this migration's ownership if it was ever reused for anything else\.

    // Drop them manually only if this service is fully decommissioned\.

  \}

\}

## __Step 9 — Run the Migration__

__Run from: apps/identity\-verification\-service/__

npm run migration:run

Expected output ends with a line naming the migration and "has been executed successfully", for example:

Migration CreateIdentityVerificationSchema1756742400000 has been executed successfully\.

__IF THE COMMAND FAILS__

"relation \\"identity\_verification\\" already exists" — someone already ran this migration against this database\. Safe to ignore if you're re\-running against a database you already set up\.

"password authentication failed" or "could not connect to server" — DATABASE\_URL in your \.env is wrong or missing\. Re\-check Step 2\.

"Cannot find module 'ts\-node'" — Step 1's devDependency install didn't complete\. Re\-run npm install \-\-save\-dev ts\-node typescript\.

## __Step 10 — Verify the Schema__

Two checks: first, confirm the tables exist and look right; second, run a real insert/read/delete against them to prove the entities work end to end and that the duplicate\-detection index behaves as expected\.

__10a\. Inspect with psql__

__Connect, then run:__

\\dt identity\_verification\.\*

\\d identity\_verification\.identity\_verification\_profiles

\\d identity\_verification\.identity\_documents

\\d identity\_verification\.verification\_attempts

\\dt identity\_verification\.\* should list all three tables\. Each \\d command should show every column from Section 6 below, with the correct type, nullability, and default\.

__10b\. Run the smoke test__

This script connects using the same DataSource the app uses, creates a profile and a document, proves a duplicate document is correctly rejected, then cleans up after itself\.

__FILE: apps/identity\-verification\-service/src/database/smoke\-test\.ts__

import 'reflect\-metadata';

import dataSource from '\./data\-source';

import \{ IdentityVerificationProfile \} from '\.\./entities/identity\-verification\-profile\.entity';

import \{ IdentityDocument \} from '\.\./entities/identity\-document\.entity';

import \{ DocumentType, CaptureMethod \} from '\.\./entities/enums/identity\-verification\.enums';

 

async function run\(\) \{

  await dataSource\.initialize\(\);

  console\.log\('Connected to identity\_verification schema\.'\);

 

  const profileRepo = dataSource\.getRepository\(IdentityVerificationProfile\);

  const documentRepo = dataSource\.getRepository\(IdentityDocument\);

 

  // 1\. Create a profile\.

  const profile = await profileRepo\.save\(

    profileRepo\.create\(\{ userId: '00000000\-0000\-0000\-0000\-000000000001' \}\),

  \);

  console\.log\('Created profile:', profile\.id\);

 

  // 2\. Submit a document\.

  const doc = await documentRepo\.save\(

    documentRepo\.create\(\{

      profileId: profile\.id,

      documentType: DocumentType\.PASSPORT,

      issuingCountry: 'US',

      documentNumber: 'X1234567',

      documentNumberNormalized: 'PENDING\_HASH\_1', // pending hash algorithm

      expirationDate: '2030\-01\-01',

      captureMethod: CaptureMethod\.SCAN,

      documentImageReference: 'smoke\-test/placeholder\.jpg',

    \}\),

  \);

  console\.log\('Created document:', doc\.id\);

 

  // 3\. Look up whether that fingerprint already exists under a DIFFERENT

  // profile — this is the query Doc 05's duplicate\-detection logic runs

  // before allowing a submission \(Section 8\)\. It should find nothing yet\.

  const existingMatch = await documentRepo\.findOne\(\{

    where: \{

      documentNumberNormalized: 'PENDING\_HASH\_1', // pending hash algorithm

      issuingCountry: 'US',

      documentType: DocumentType\.PASSPORT,

    \},

  \}\);

  console\.log\(

    existingMatch && existingMatch\.profileId \!== profile\.id

      ? 'FAILED: found a cross\-profile match that should not exist yet\.'

      : 'PASSED: no cross\-profile duplicate found, as expected\.',

  \);

 

  // 4\. Confirm the issuing\_state CHECK constraint blocks bad data: a

  // Passport can never have an issuing\_state\.

  try \{

    await documentRepo\.save\(

      documentRepo\.create\(\{

        profileId: profile\.id,

        documentType: DocumentType\.PASSPORT,

        issuingCountry: 'US',

        documentNumber: 'X7654321',

        documentNumberNormalized: 'PENDING\_HASH\_2', // pending hash algorithm

        expirationDate: '2030\-01\-01',

        issuingState: 'CA',

        captureMethod: CaptureMethod\.SCAN,

        documentImageReference: 'smoke\-test/placeholder\-2\.jpg',

      \}\),

    \);

    console\.error\('FAILED: a Passport with issuing\_state was allowed\. Check the CHECK constraint\.'\);

  \} catch \(err\) \{

    console\.log\('PASSED: Passport \+ issuing\_state was correctly rejected by the database\.'\);

  \}

 

  // 5\. Clean up \(cascade deletes the document too\)\.

  await profileRepo\.delete\(\{ id: profile\.id \}\);

  console\.log\('Cleaned up smoke\-test rows\.'\);

 

  await dataSource\.destroy\(\);

\}

 

run\(\)\.catch\(\(err\) => \{

  console\.error\('Smoke test failed:', err\);

  process\.exit\(1\);

\}\);

__Run from: apps/identity\-verification\-service/__

npx ts\-node src/database/smoke\-test\.ts

Expected output: five lines ending in "PASSED" for both checks and "Cleaned up smoke\-test rows\." If either check prints FAILED, stop and re\-check the corresponding entity file in Step 4 before moving on — do not proceed to Doc 04 with a schema that fails its own smoke test\.

# __6\. Full Schema Reference__

Every column in every table, exactly as created by the migration in Step 8\. "Constraints / Indexes" lists only what applies to that specific column; table\-level constraints that span more than one column \(the two CHECK constraints\) are called out separately beneath each table\.

## __6a\. identity\_verification\_profiles__

One row per user account \(Data Dictionary groups: Home Country / Location, Travel / Relocation Declaration, Identity Verification Status, Location Verification Status\)\.

__Column__

__Postgres Type__

__Null?__

__Default__

__Constraints / Indexes__

__Notes / Source__

id

uuid

No

gen\_random\_uuid\(\)

PRIMARY KEY

Surrogate key\. Never exposed as the account identifier — user\_id is\.

user\_id

uuid

No

—

UNIQUE \(idx\_ivp\_user\_id\)

External reference to the account in user\-service/auth\-service\. No DB\-level foreign key — Marketeq services never join across each other's databases \(Architecture Overview §7\.2\)\.

verified\_home\_country

char\(2\)

Yes

—

—

ISO 3166\-1 alpha\-2\. Persists until the detected country changes \(00 §5\)\.

verified\_home\_country\_confirmed\_at

timestamptz

Yes

—

—

When the user confirmed the detected location as home country\.

detected\_country

char\(2\)

Yes

—

—

Most recent LocationProvider reading, not a history log\. See Section 4\.

detected\_region\_state

varchar\(120\)

Yes

—

—

Region/state component of the current\-location display \(AC\-01\.2\)\.

detected\_city

varchar\(120\)

Yes

—

—

City component of the current\-location display \(AC\-01\.2\)\.

time\_zone

varchar\(64\)

Yes

—

—

IANA tz string, e\.g\. "America/New\_York"\. Derived via MaxMind GeoLite2 IP resolution \(Epic Overview §7\.1\)\.

travel\_classification

travel\_classification\_enum

Yes

—

—

temporarily\_traveling / permanently\_relocated\. No third option \(AC\-04\.2\)\.

declared\_duration

declared\_duration\_enum

Yes

—

—

Applies only when travel\_classification = temporarily\_traveling \(AC\-05\.1\)\. Null = skipped\.

travel\_mode\_active

boolean

No

false

—

Whether Travel Mode is currently active \(00 §5\)\.

travel\_mode\_activated\_at

timestamptz

Yes

—

—

When Travel Mode was last activated\.

last\_travel\_reminder\_sent\_at

timestamptz

Yes

—

—

Per\-user scheduling state\. The cadence itself \(daily \+ fresh\-login re\-check, skip at 3/7 days\) is fixed application config, not a column — see Section 4\.

next\_travel\_reminder\_at

timestamptz

Yes

—

—

Computed and stored by Doc 05's reminder job; read by that job on each run\.

identity\_verification\_status

identity\_verification\_status\_enum

No

'unstarted'

INDEX \(idx\_ivp\_identity\_status\)

unstarted / in\_progress / pending / verified / failed / failed\_final / blocked\_duplicate / blocked\_age / expired \(TRVG2 §1\.2\)\. Default changed from not\_verified to unstarted — same meaning, renamed\. Historical\-data mapping from the retired submitted\_pending\_review/rejected\_blocked values is an unresolved prerequisite to any real migration — see Section 10\.

identity\_rejection\_reason

varchar\(64\)

Yes

—

—

Free text, not a database enum\. The rejected/blocked outcome is confirmed; its reason\-code vocabulary is not specified by any source \(00 §6\)\. See Section 10\.

location\_verification\_status

location\_verification\_status\_enum

No

'not\_verified'

INDEX \(idx\_ivp\_location\_status\)

not\_verified / submitted\_pending\_review / verified\. Tracked independently of identity status \(00 §6; SVC\-19\)\.

document\_expires\_on

date

Yes

—

—

Nullable; drives the EXPIRED re\-verification transition \(TRVG2 §1\.1, §3\)\. Population and scheduled\-job mechanics are Doc 05's responsibility, not specified here\.

last\_evaluated\_at

timestamptz

Yes

—

—

Nullable \(TRVG2 §1\.1\)\. Updated whenever this profile's verification state is evaluated; update mechanics are Doc 05's responsibility, not specified here\.

expired\_at

timestamptz

Yes

—

—

Nullable; set when the profile transitions into EXPIRED, and drives the 30\-day grace window \(in\_grace, TRVG2 §1\.1, §2\)\. Population mechanics are Doc 05’s responsibility, not specified here\.

eligible\_on

date

Yes

—

—

Nullable; set only on transition into BLOCKED\_AGE — the date the holder turns 18, derived from the document at read time and then discarded \(TRVG2 §3\)\. No date\_of\_birth is retained anywhere in this schema\. Clears BLOCKED\_AGE automatically on arrival \(Doc 05’s responsibility\)\.

created\_at

timestamptz

No

now\(\)

—

Row creation time\.

updated\_at

timestamptz

No

now\(\)

—

Auto\-updated by TypeORM on every save\(\)\.

__OPEN QUESTION — LOCATION\_STATUS ENUM SCOPE__

TRVG2 §1\.1 declares location\_status : enum // see 1\.2 — the identical reference used for identity\_status, stated directly in the source\. This document does not add any value to LocationVerificationStatus \(Step 3\), change its Postgres enum type \(migration Step 8\), or alter this table's three\-value description above; LocationVerificationStatus and its schema are unchanged\. Which of TRVG's nine values are actually reachable for location\_status, and what its transitions are, remain unresolved — pending Christopher's confirmation \(carried from the Document 02 review, Finding 2\)\. \[Updated 21 September 2026: partially addressed by the five\-question technical resolution \(Q1\) — an engineering recommendation made under Christopher's SOP guidance: seven of TRVG2’s nine values \(excluding BLOCKED\_AGE, which is identity\-only\) are proposed as reachable for location\_status\. Still explicitly unresolved: whether EXPIRED applies to location\_status at all — a genuine conflict against the Location Verification Build Specification’s “never expires” rule — and the transitions/old\-value migration mapping\. This document still does not change LocationVerificationStatus’s Postgres enum type or add any column; see the new Section 10 entry\.\]

## __6b\. identity\_documents__

One row per submitted document — many per profile \(Data Dictionary group: Document Submission, plus the Duplicate\-Document Block fields\)\.

__Column__

__Postgres Type__

__Null?__

__Default__

__Constraints / Indexes__

__Notes / Source__

id

uuid

No

gen\_random\_uuid\(\)

PRIMARY KEY

Surrogate key\.

profile\_id

uuid

No

—

FOREIGN KEY → identity\_verification\_profiles\(id\) ON DELETE CASCADE; INDEX

Deleting a profile deletes all of its documents \(SVC\-33\)\.

document\_type

document\_type\_enum

No

—

—

passport / id\_card / drivers\_licence / residence\_permit — the four vendor\-aligned categories \(Decision Record §3\.2; SVC\-09\)\.

document\_type\_label

varchar\(100\)

Yes

—

—

Display\-only; may differ by locale \(TRVG2 §1\.4\)\. Never branch gate or business logic on this field — document\_type \(above\) remains the single canonical, vendor\-aligned value\. Introduced 18 September 2026 \(Answer 7\)\.

issuing\_country

char\(2\)

No

—

—

ISO 3166\-1 alpha\-2\. Determines the accepted\-document list shown to the user \(AC\-09\.3\)\.

document\_number

varchar\(64\)

No

—

—

Raw, as captured or entered\. Shown back to the user\.

document\_number\_normalized

varchar\(64\)

No

—

INDEX, composite \(idx\_identity\_documents\_fingerprint\) — see Section 8

A one\-way hash of the trimmed, upper\-cased document number, maintained by the application layer \(TRVG2 §1\.1, §1\.3\)\. \[Updated 21 September 2026, engineering decision made under Christopher's SOP guidance \(five\-question technical resolution, Q2\): HMAC\-SHA\-256, keyed with a KMS\-held pepper, computed over the normalized document number only — issuing\_country and document\_type do not join the hash input\. Separate, not\-yet\-implemented considerations: field\-level encryption of the raw document\_number column, secure management of the pepper itself, and migrating any existing plaintext document\_number\_normalized values to this hash — see Section 10\.\] Used only for duplicate matching — never displayed\.

expiration\_date

date

No

—

—

Rejected at submission if in the past \(SVC\-12\) — enforced in Doc 05, before this row is ever written\.

issuing\_state

varchar\(10\)

Yes

—

CHECK chk\_identity\_documents\_issuing\_state \(table\-level, below\)

Driver's Licence only \(00 §5; AC\-26\.4\)\.

capture\_method

capture\_method\_enum

No

—

—

scan / manual\_entry \(00 §5\)\.

document\_image\_reference

varchar\(512\)

No

—

—

Cloudflare R2 object key — a pointer, not the image itself \(Technical Architecture §8\)\.

verification\_depth

verification\_depth\_enum

Yes

—

—

registry\_validated / authenticated\. Null until the vendor session completes \(Decision Record §1\.2\)\.

is\_duplicate\_match

boolean

No

false

—

Set true by Doc 05's duplicate\-detection logic when a cross\-profile match is found \(SVC\-16/17\)\.

duplicate\_of\_document\_id

uuid

Yes

—

FOREIGN KEY → identity\_documents\(id\) ON DELETE SET NULL; INDEX

Points at the pre\-existing document this one matched\. Self\-referential\.

created\_at

timestamptz

No

now\(\)

—

Row creation time\.

updated\_at

timestamptz

No

now\(\)

—

Auto\-updated by TypeORM on every save\(\)\.

__TABLE\-LEVEL CONSTRAINT__

chk\_identity\_documents\_issuing\_state — CHECK \(issuing\_state IS NULL OR document\_type = 'drivers\_licence'\)\. Blocks any row where a non\-licence document carries a state value, at the database level, not only in application code\.

__SOURCE\-GROUNDING NOTE — DATE OF BIRTH__

This table has no date\_of\_birth column\. SVC\-32 \(minimum\-age enforcement\) needs a date of birth, but Christopher's Step 10 clarification confirmed DOB is not currently part of the confirmed design — only a UX Requirements suggestion, not a production feature\. This document does not add the field or invent a substitute mechanism\. Section 10 records the resulting open dependency; do not close it by adding this column back without a confirmed Product/Design decision\.

## __6c\. verification\_attempts__

One row per verification attempt against the vendor — the audit trail \(Data Dictionary group: Verification Attempt / Audit Record\)\.

__Column__

__Postgres Type__

__Null?__

__Default__

__Constraints / Indexes__

__Notes / Source__

id

uuid

No

gen\_random\_uuid\(\)

PRIMARY KEY

Surrogate key\.

profile\_id

uuid

No

—

FOREIGN KEY → identity\_verification\_profiles\(id\) ON DELETE CASCADE; INDEX

Deleting a profile deletes its attempt history \(Section 4\)\.

document\_id

uuid

Yes

—

FOREIGN KEY → identity\_documents\(id\) ON DELETE CASCADE; INDEX

Null only if an attempt fails before a document row exists\.

vendor\_session\_id

varchar\(128\)

No

—

UNIQUE \(idx\_verification\_attempts\_vendor\_session\_id\)

Didit's session identifier\. Unique so the webhook handler \(Doc 05\) can process a delivery idempotently\.

attempt\_timestamp

timestamptz

No

now\(\)

—

When the attempt occurred \(SVC\-23\)\.

attempt\_method

capture\_method\_enum

No

—

—

scan / manual\_entry, for this specific attempt \(SVC\-23\)\.

attempt\_document\_type

document\_type\_enum

No

—

—

Document type used for this specific attempt \(SVC\-23\)\.

attempt\_outcome

varchar\(32\)

No

—

—

Free text, not a database enum — deliberately, so Didit's real outcome vocabulary \(not specified by any source\) can be adopted without a breaking migration\. See Section 10\.

failure\_code

varchar\(64\)

Yes

—

—

Vendor\-provided\. Server\-side only, never shown to the user \(00 §3 item 12\)\.

attempt\_number

smallint

No

—

CHECK chk\_verification\_attempts\_attempt\_number \(table\-level, below\)

This attempt's position in the 3\-attempt limit \(SVC\-15\)\.

vpn\_proxy\_detection\_result

vpn\_proxy\_detection\_result\_enum

No

'none'

—

Evaluated at the moment of this attempt \(00 §4\)\.

__TABLE\-LEVEL CONSTRAINT__

chk\_verification\_attempts\_attempt\_number — CHECK \(attempt\_number >= 1 AND attempt\_number <= 3\)\. Backstops the three\-attempt retry limit \(SVC\-15\) at the database level\.

# __7\. Relationships & Cascade Behavior__

identity\_verification\_profiles is the parent of both other tables\. A profile has zero or more documents \(one per submission attempt across scans, retries, and re\-verification\), and zero or more verification attempts \(one per call to the vendor\)\.

identity\_documents is also a parent of verification\_attempts: an attempt is optionally tied to the specific document it was verifying, so a failed attempt that never produced a usable document row \(e\.g\. capture failed before intake completed\) can still be logged with document\_id left null\.

Every foreign key from a child table back to identity\_verification\_profiles uses ON DELETE CASCADE\. This means deleting one row from identity\_verification\_profiles automatically deletes every identity\_documents row and every verification\_attempts row that references it, in one database operation, with no application code needed to clean them up separately\. This directly satisfies SVC\-33 \("deletes identity documents when the associated account is deleted"\) and extends the same treatment to the attempt/audit history, since no source states that audit rows must outlive the account \(Section 4\)\.

__OPEN INTEGRATION POINT__

No source specifies exactly how this service learns that an account was deleted \(an event from user\-service or auth\-service, or a direct internal call\)\. That integration is not decided by this document and belongs in Doc 05 or an Integrations doc later in this series\. This document only guarantees that once the profile row's delete is triggered, cascade behavior does the rest correctly\.

The identity\_documents → identity\_documents self\-reference \(duplicate\_of\_document\_id\) uses ON DELETE SET NULL instead of CASCADE: if the original document a duplicate pointed to is ever deleted, the duplicate flag's target reference is cleared rather than deleting the duplicate row itself, since that row's own account may still exist and still need its own document history intact\.

__SOURCE\-GROUNDING NOTE — POST\-DELETION FINGERPRINT RETENTION__

This schema retains nothing after a profile is deleted — cascade removes the documents and attempt history in full\. It does NOT implement the separately\-discussed technical recommendation to retain a one\-way \(hashed\) fingerprint of a deleted account's document after deletion, for cross\-account duplicate prevention going forward\. That idea remains a technical recommendation only: whether it may be retained at all, and for how long, is pending privacy/legal confirmation, not a decision this document is authorized to make\. No table, column, or index here implements it\.

# __8\. Business Logic Notes for Downstream Docs__

This section is not implementation — Doc 05 \(Business Logic & Workflows\) owns building this logic\. It exists so the developer building Doc 05 does not have to re\-derive the reasoning behind two structural choices made in this schema\.

__8a\. Duplicate\-document detection is application logic, not a database constraint__

A blind UNIQUE\(document\_number\_normalized, issuing\_country, document\_type\) constraint across the whole table would be wrong: it would also block a legitimate user from resubmitting their own document after a failed scan or a rescan retry, because that resubmission has the same fingerprint under the same profile\_id\. "A document already on file against a different account" \(SVC\-17\) is a conditional rule — it depends on whether the existing match belongs to someone else — and Postgres UNIQUE constraints cannot express "unique, except when this other column also matches\."

The correct pattern, to implement in Doc 05, runs inside the same database transaction as the insert:

\-\- 1\. Take an advisory lock keyed on the fingerprint, so two concurrent

\-\-    submissions of the same real\-world document can't both pass the

\-\-    check before either has committed \(a classic TOCTOU race\)\.

SELECT pg\_advisory\_xact\_lock\(hashtext\($1 || $2 || $3\)\);

\-\- \($1 = document\_number\_normalized, $2 = issuing\_country, $3 = document\_type\)

 

\-\- 2\. Look for a match belonging to a DIFFERENT profile\.

SELECT id, profile\_id FROM identity\_verification\.identity\_documents

WHERE document\_number\_normalized = $1

  AND issuing\_country = $2

  AND document\_type = $3

  AND profile\_id <> $4

LIMIT 1;

\-\- \($4 = the submitting user's own profile\_id\)

 

\-\- 3\. If a row comes back: block the submission \(SVC\-17\), set

\-\-    is\_duplicate\_match = true and duplicate\_of\_document\_id on the new

\-\-    row, and set identity\_verification\_status = 'blocked\_duplicate' on

\-\-    the submitting profile\. If no row comes back: proceed normally\.

The idx\_identity\_documents\_fingerprint index \(Section 6b\) makes step 2's lookup fast; it is intentionally not a unique index, for the reason above\.

__TECHNICAL RECOMMENDATION, NOT A CONFIRMED REQUIREMENT__

This pattern implements only exact\-match detection — the same document number, issuing country, and document type on file under a different profile\. A broader biometric match across different documents \(catching the same physical person re\-submitting under a different document\) is a separate, best\-in\-class technical recommendation from Step 10 whose implementation depends on confirming that Didit supports the required cross\-user/1:N biometric\-search capability\. It is not an existing production requirement, no schema for it is proposed here, and Doc 05 should not build it until that vendor capability is confirmed\.

\[Added 21 September 2026: the HMAC\-SHA\-256 hash\-algorithm decision \(Section 6b\) does not change this pattern\. issuing\_country and document\_type never joined the hash input, so they remain plain, separately\-matched columns in both the advisory\-lock key and the WHERE clause above — this lookup and the composite index it uses are unaffected\.\]

__8b\. attempt\_count is derived, not stored__

To enforce the three\-attempt limit \(SVC\-15\) before creating a new verification\_attempts row, count existing ones rather than reading a separate counter:

SELECT COUNT\(\*\) FROM identity\_verification\.verification\_attempts

WHERE profile\_id = $1; \-\- account\-wide \(TRVG2 §2 gate\-table note; Answer 3\) \-\- see the 18 September 2026 update note

\-\- If the count is already 3, do not create a 4th row — the

\-\- chk\_verification\_attempts\_attempt\_number constraint would reject it

\-\- anyway, but the application should stop and return the final\-rejection

\-\- outcome before ever calling the vendor a 4th time\.

__OPEN QUESTION — ATTEMPT\_COUNT SCOPE \(ACCOUNT VS\. DOCUMENT\)__

TRVG2 §2 \(gate\-table note\) and Christopher’s Answer 3 resolve what this document previously carried as an open question: attempt\_count is account\-wide, not per\-document\. “Gate logic does not distinguish manual entry from a scan\. Every accepted route produces one verified status” \(Answer 1\) reinforces the same account\-level framing\. The derivation query above is updated accordingly \(profile\_id alone, no document\_id filter\) — see the 18 September 2026 update note\. attempt\_number’s own assignment \(incrementing 1–3 per new row\) must follow the same account\-wide count when Doc 05 implements it; this document does not itself assign attempt\_number\.

__8c\. Vendor outages must not be recorded or treated as rejections__

Per TRVG2 §5 \("Vendor Integration," row "Failure isolation"\), a vendor outage must leave identity\_verification\_status unchanged rather than transitioning the account toward a rejected outcome — vendor unavailability and vendor rejection are two different conditions and must be distinguished\. attempt\_outcome \(Section 6c\) is free text specifically so Doc 05 can record whichever vocabulary the real integration needs, including a value for vendor unavailability distinct from a value for vendor rejection; this document does not name that value\. What this section establishes is only the constraint Doc 05's outcome handling must respect: an attempt logged because Didit was unreachable must not, by itself, move identity\_verification\_status toward FAILED, FAILED\_FINAL, or any other rejected/blocked value; only an attempt where the vendor actually returned a decision may do that\. This document does not specify retry count, backoff, or circuit\-breaker behavior for outages, and does not decide whether an outage\-caused attempt counts toward the three\-attempt limit \(Section 8b\) — both are Doc 05 implementation decisions\. \[Superseded, 18 September 2026: the second question is resolved, not open — per Christopher's Answer 6 / TRVG2 §5\.1, a vendor\-outage\-caused attempt never counts toward the three\-attempt limit, without qualification\. Only retry count, backoff, and circuit\-breaker behavior for outages remain Doc 05 implementation decisions\.\]

# __9\. Indexes Summary__

__Index__

__Table__

__Column\(s\)__

__Purpose__

pk\_identity\_verification\_profiles

identity\_verification\_profiles

id

Primary key\.

idx\_ivp\_user\_id

identity\_verification\_profiles

user\_id

Unique\. Fast lookup by account; enforces one profile per user\.

idx\_ivp\_identity\_status

identity\_verification\_profiles

identity\_verification\_status

Fast filtering/reporting by status\.

idx\_ivp\_location\_status

identity\_verification\_profiles

location\_verification\_status

Fast filtering/reporting by status\.

pk\_identity\_documents

identity\_documents

id

Primary key\.

idx\_identity\_documents\_profile\_id

identity\_documents

profile\_id

Fast lookup of all documents for one profile\.

idx\_identity\_documents\_fingerprint

identity\_documents

document\_number\_normalized, issuing\_country, document\_type

Fast duplicate\-match lookup \(Section 8a\)\. Not unique — see that section\.

idx\_identity\_documents\_duplicate\_of

identity\_documents

duplicate\_of\_document\_id

Fast lookup of every document flagged as a duplicate of a given one\.

pk\_verification\_attempts

verification\_attempts

id

Primary key\.

idx\_verification\_attempts\_profile\_id

verification\_attempts

profile\_id

Fast lookup of a profile's full attempt history\.

idx\_verification\_attempts\_document\_id

verification\_attempts

document\_id

Fast lookup of a document's attempt history\.

idx\_verification\_attempts\_vendor\_session\_id

verification\_attempts

vendor\_session\_id

Unique\. Idempotent webhook lookup \(Section 6c\)\.

\[Added 21 September 2026: idx\_identity\_documents\_fingerprint's composition \(document\_number\_normalized, issuing\_country, document\_type\) is unaffected by the hash\-algorithm decision in Section 6b — the hash input is the document number alone, so the other two columns keep their existing role in this index and in the Section 8a lookup\.\]

# __10\. Pending Confirmations Carried Into This Schema__

None of these block the schema from working today\. Each is a place where this document made the narrowest workable engineering decision instead of guessing a Product or vendor answer\. Track these to closure the same way the nine outstanding Decision Record questions are already tracked\.

- date\_of\_birth is not part of this schema, and TRVG2 now confirms that is the correct design rather than a gap pending one\. SVC\-32 \(minimum\-age enforcement\) is resolved by the newly added eligible\_on column \(Section 6a, entity Step 4a\): the document’s date of birth is derived at read time, used only to compute eligible\_on \(the date the holder turns 18\), and then discarded — no date of birth is stored on the account record at all \(TRVG2 §3\)\. This document’s original decision not to add a date\_of\_birth column, made without a confirmed mechanism at the time, turns out to anticipate TRVG2’s actual design rather than to have left a gap in it\.
- identity\_rejection\_reason \(6a\) and attempt\_outcome \(6c\) use starter vocabularies, stored as free text rather than database enums for exactly this reason\. Neither Didit's real outcome values nor a final Product\-approved rejection\-reason list is specified by any source\. The actual values used in this document's code samples should not be treated as final anywhere downstream\.
- identity\_verification\_status \(6a\) now uses TRVG2's nine\-value model \(§1\.2\), which post\-dates this document's original 1 September 2026 draft and supersedes the four\-value placeholder this bullet previously described\. VERIFIED maps exactly and NOT\_VERIFIED renames cleanly to UNSTARTED, but SUBMITTED\_PENDING\_REVIEW conflates TRVG2's IN\_PROGRESS and PENDING, and REJECTED\_BLOCKED conflates FAILED, FAILED\_FINAL, BLOCKED\_DUPLICATE, and BLOCKED\_AGE — except Section 8a's duplicate\-detection SQL comment, whose specific trigger maps unambiguously to BLOCKED\_DUPLICATE alone\. Which old\-value boundary maps to which new value is a product judgment call this document cannot resolve from its own text — pending Christopher's confirmation\.
- duplicate\_match\_technique \(Data Dictionary, Duplicate\-Document Block group\) — this schema implements only exact\-match detection \(Section 8a\), which is what SVC\-17's confirmed "deterministic block" requirement can be built against today\. Cross\-document biometric \(1:N\) matching is a best\-in\-class technical recommendation from Step 10, not a confirmed requirement — its implementation depends on confirming Didit supports that cross\-user capability, and no schema for it is proposed here\.
- Retaining a one\-way document fingerprint after account deletion, for cross\-account duplicate prevention, is likewise a technical recommendation only \(Step 10\), not a confirmed production requirement\. Whether it may be retained at all, and for how long, is pending privacy/legal confirmation\. This schema implements no persistent post\-deletion storage of any kind \(Section 7\)\.
- How account deletion is signaled to this service \(Section 7\) — not established by any source\. The cascade behavior is ready; the trigger for it is not yet designed\.
- Field\-level encryption / KMS approach for document\_number — no product or vendor is named by any source \(Technical Architecture §15\)\. This schema stores it as a plain column; encrypting it is an Infrastructure/Security decision layered on top of this schema, not a change to it\. \[Updated 21 September 2026: this is a separate question from document\_number\_normalized's own hashing\. Q2 \(five\-question technical resolution\) confirms a KMS\-held pepper is needed for that hash's HMAC\-SHA\-256 algorithm \(Section 6b, Step 4b\) — an engineering decision made under Christopher's SOP guidance — but no KMS product or vendor is named for either that pepper or this field\-level\-encryption question, and neither is implemented by this document\.\]
- Migrating any existing plaintext document\_number\_normalized values to the HMAC\-SHA\-256 hash \(Section 6b\) is a separate, not\-yet\-implemented consideration — no source specifies a backfill procedure, and this document does not propose one\. \[Added 21 September 2026\.\]
- location\_verification\_status's enum scope \(Section 6a\) is only partially addressed: the five\-question technical resolution \(Q1\) proposes seven of TRVG2's nine values as reachable \(excluding BLOCKED\_AGE and EXPIRED\) — an engineering recommendation made under Christopher's SOP guidance\. Whether EXPIRED applies to location\_status at all remains a genuine, unresolved conflict against the Location Verification Build Specification's “never expires” rule, and the old\-value\-to\-new\-value migration mapping \(the same kind of judgment call flagged above for identity\_verification\_status\) is not decided by any source\. This document does not change the Postgres enum type or add any column for location\_status\. \[Added 21 September 2026\.\]
- Cloudflare R2 as the object\-storage target for document\_image\_reference is a recommended default pending Infrastructure/Security confirmation \(Technical Architecture §8\), carried through unchanged from that document\.

# __11\. What's Next__

With this schema built and its smoke test passing, the next documents in this series can build on it directly:

- Doc 04 — API Specification: REST endpoints, request/response DTOs, and validation, built against the entities defined here\.
- Doc 05 — Business Logic & Workflows: the duplicate\-detection transaction \(Section 8a\), the Travel Mode reminder scheduler, the DocumentVerificationProvider/Didit integration, and the HMAC\-signed webhook handler that writes verification\_attempts rows\.
- The Setup & Bootstrapping doc \(if not already written\): the rest of app\.module\.ts, main\.ts, and the Dockerfile/health\-check wiring referenced in Steps 1 and 6\.

