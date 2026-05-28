import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2 — Initial schema for legal-service.
 * Creates all 6 tables with ls_ prefix.
 *
 * Run:   npx typeorm migration:run   -d apps/legal-service/src/data-source.ts
 * Revert: npx typeorm migration:revert -d apps/legal-service/src/data-source.ts
 */
export class InitLegalServiceSchema1714000000000 implements MigrationInterface {
  name = 'InitLegalServiceSchema1714000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /* ------------------------------------------------------------------ */
    /* Enums                                                               */
    /* ------------------------------------------------------------------ */
    await queryRunner.query(`
      CREATE TYPE "ls_document_type_enum" AS ENUM (
        'nda', 'terms_of_service', 'privacy_policy'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "ls_name_match_status_enum" AS ENUM (
        'exact', 'variation', 'no_match'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "ls_signing_method_enum" AS ENUM (
        'typed', 'drawn', 'uploaded_signature'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "ls_display_name_format_enum" AS ENUM (
        'first_name_username', 'company_representative'
      )
    `);

    /* ------------------------------------------------------------------ */
    /* ls_nda_documents                                                    */
    /* ------------------------------------------------------------------ */
    await queryRunner.query(`
      CREATE TABLE "ls_nda_documents" (
        "id"                 UUID        NOT NULL DEFAULT gen_random_uuid(),
        "documentType"       "ls_document_type_enum" NOT NULL,
        "templateVersion"    VARCHAR(20) NOT NULL,
        "jobListingId"       UUID        NOT NULL,
        "clientUserId"       UUID        NOT NULL,
        "clientDisplayName"  VARCHAR(300) NOT NULL,
        "listingTitle"       VARCHAR(100),
        "unsignedPdfR2Key"   VARCHAR(512),
        "status"             VARCHAR(30) NOT NULL,
        "generatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        "voidedAt"           TIMESTAMPTZ,
        CONSTRAINT "PK_ls_nda_documents" PRIMARY KEY ("id")
      )
    `);

    /* ------------------------------------------------------------------ */
    /* ls_nda_signing_events  (append-only — no UPDATE ever)              */
    /* ------------------------------------------------------------------ */
    await queryRunner.query(`
      CREATE TABLE "ls_nda_signing_events" (
        "id"                       UUID        NOT NULL DEFAULT gen_random_uuid(),
        "ndaDocumentId"            UUID        NOT NULL,
        "signerUserId"             UUID        NOT NULL,
        "signerUsername"           VARCHAR(100) NOT NULL,
        "signerTypedName"          VARCHAR(200) NOT NULL,
        "signerRegisteredName"     VARCHAR(200) NOT NULL,
        "nameMatchStatus"          "ls_name_match_status_enum" NOT NULL,
        "nameMatchScore"           DECIMAL(5,4) NOT NULL,
        "jobListingId"             UUID        NOT NULL,
        "signerInitials"           VARCHAR(10),
        "ipAddress"                VARCHAR(45) NOT NULL,
        "deviceType"               VARCHAR(20) NOT NULL,
        "browserUserAgent"         TEXT        NOT NULL,
        "signingMethod"            "ls_signing_method_enum" NOT NULL,
        "consentCheckboxChecked"   BOOLEAN     NOT NULL,
        "signedPdfR2Key"           VARCHAR(512),
        "signedAtUtc"              TIMESTAMPTZ NOT NULL DEFAULT now(),
        "signatureArtifactR2Key"   VARCHAR(512),
        "designatedRepCompanyId"   UUID,
        "pseudonymizedAt"          TIMESTAMPTZ,
        CONSTRAINT "PK_ls_nda_signing_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ls_nda_signing_events_nda_doc"
          FOREIGN KEY ("ndaDocumentId") REFERENCES "ls_nda_documents"("id")
          ON DELETE RESTRICT
      )
    `);

    /* ------------------------------------------------------------------ */
    /* ls_nda_settings                                                     */
    /* ------------------------------------------------------------------ */
    await queryRunner.query(`
      CREATE TABLE "ls_nda_settings" (
        "id"                    UUID        NOT NULL DEFAULT gen_random_uuid(),
        "ndaDocumentId"         UUID        NOT NULL,
        "displayNameFormat"     "ls_display_name_format_enum" NOT NULL,
        "companyId"             UUID,
        "jobTitleVisible"       BOOLEAN     NOT NULL,
        "requireNdaToViewScope" BOOLEAN     NOT NULL,
        "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ls_nda_settings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ls_nda_settings_ndaDocumentId" UNIQUE ("ndaDocumentId"),
        CONSTRAINT "FK_ls_nda_settings_nda_doc"
          FOREIGN KEY ("ndaDocumentId") REFERENCES "ls_nda_documents"("id")
          ON DELETE CASCADE
      )
    `);

    /* ------------------------------------------------------------------ */
    /* ls_legal_document_records  (immutable)                             */
    /* ------------------------------------------------------------------ */
    await queryRunner.query(`
      CREATE TABLE "ls_legal_document_records" (
        "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
        "userId"          UUID        NOT NULL,
        "documentType"    "ls_document_type_enum" NOT NULL,
        "relatedTitle"    VARCHAR(300) NOT NULL,
        "version"         VARCHAR(20) NOT NULL,
        "signedPdfR2Key"  VARCHAR(512),
        "signingMethod"   VARCHAR(30) NOT NULL,
        "sourceRecordId"  UUID        NOT NULL,
        "signedAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ls_legal_document_records" PRIMARY KEY ("id")
      )
    `);

    /* ------------------------------------------------------------------ */
    /* ls_acceptance_records  (append-only)                               */
    /* ------------------------------------------------------------------ */
    await queryRunner.query(`
      CREATE TABLE "ls_acceptance_records" (
        "id"               UUID        NOT NULL DEFAULT gen_random_uuid(),
        "userId"           UUID        NOT NULL,
        "documentType"     "ls_document_type_enum" NOT NULL,
        "documentVersion"  VARCHAR(20) NOT NULL,
        "ipAddress"        VARCHAR(45) NOT NULL,
        "browserUserAgent" TEXT,
        "acceptedAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ls_acceptance_records" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ls_acceptance_records_user_type_version"
          UNIQUE ("userId", "documentType", "documentVersion")
      )
    `);

    /* ------------------------------------------------------------------ */
    /* ls_outbox_events                                                    */
    /* ------------------------------------------------------------------ */
    await queryRunner.query(`
      CREATE TABLE "ls_outbox_events" (
        "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
        "exchange"     VARCHAR(100) NOT NULL,
        "routingKey"   VARCHAR(100) NOT NULL,
        "payload"      JSONB       NOT NULL,
        "status"       VARCHAR(20) NOT NULL,
        "attemptCount" INTEGER     NOT NULL DEFAULT 0,
        "lastError"    TEXT,
        "scheduledAt"  TIMESTAMPTZ NOT NULL,
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ls_outbox_events" PRIMARY KEY ("id")
      )
    `);

    /* Composite index for the outbox worker poll query */
    await queryRunner.query(`
      CREATE INDEX "IDX_ls_outbox_events_status_scheduledAt"
        ON "ls_outbox_events" ("status", "scheduledAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ls_outbox_events_status_scheduledAt"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ls_outbox_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ls_acceptance_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ls_legal_document_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ls_nda_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ls_nda_signing_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ls_nda_documents"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ls_display_name_format_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ls_signing_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ls_name_match_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ls_document_type_enum"`);
  }
}
