import { DataSource } from 'typeorm';

import { NdaDocument } from '../nda/entities/nda-document.entity';
import { NdaSettings } from '../nda/entities/nda-settings.entity';
import { DocumentType } from '../nda/enums/document-type.enum';
import { DisplayNameFormat } from '../nda/enums/display-name-format.enum';

/**
 * Seed script for legal-service QA & test data (LS-07).
 *
 * Creates two NDA documents with fixed UUIDs so all test cases in LS-07
 * can reference predictable, stable records. Safe to run multiple times —
 * checks existence before inserting (idempotent).
 *
 * Fixed UUIDs (must match LS-07 Postman collection variables):
 *   Seed Generated NDA : 44444444-4444-4444-a444-444444444444
 *   Seed Voided NDA    : 55555555-5555-4555-a555-555555555555
 *   talentA userId     : 11111111-1111-4111-a111-111111111111
 *   talentB userId     : 22222222-2222-4222-a222-222222222222
 *   clientA userId     : 33333333-3333-4333-a333-333333333333
 *   testListingId      : 66666666-6666-4666-a666-666666666666
 *   testCompanyId      : 77777777-7777-4777-a777-777777777777
 */
export async function seedLegalService(dataSource: DataSource): Promise<void> {
  const ndaRepo = dataSource.getRepository(NdaDocument);
  const settingsRepo = dataSource.getRepository(NdaSettings);

  // ─── 1. Seed Generated NDA ─────────────────────────────────────────────────
  // Used by: TC-NDA-SIGN-*, TC-NAME-*, TC-AUDIT-*, TC-SETTINGS-*
  // Status: 'generated' — ready for signing

  const generatedId = '44444444-4444-4444-a444-444444444444';
  const existingGenerated = await ndaRepo.findOne({ where: { id: generatedId } });

  if (!existingGenerated) {
    await ndaRepo.save({
      id:                generatedId,
      documentType:      DocumentType.NDA,
      templateVersion:   '1.0',
      jobListingId:      '66666666-6666-4666-a666-666666666666',
      clientUserId:      '33333333-3333-4333-a333-333333333333',
      clientDisplayName: 'Chris (@cmorgan)',
      listingTitle:      'E-commerce Platform Rebuild',
      unsignedPdfR2Key:  null,
      status:            'generated',
      generatedAt:       new Date(),
    });

    await settingsRepo.save({
      ndaDocumentId:         generatedId,
      displayNameFormat:     DisplayNameFormat.FIRST_NAME_USERNAME,
      companyId:             null,
      jobTitleVisible:       false,
      requireNdaToViewScope: true,
    });

    console.log('✅ Seed Generated NDA created:', generatedId);
  } else {
    console.log('⏭️  Seed Generated NDA already exists — skipped');
  }

  // ─── 2. Seed Voided NDA ────────────────────────────────────────────────────
  // Used by: TC-NDA-SIGN-08 (sign voided NDA → 409)
  // Status: 'voided' — cannot be signed

  const voidedId = '55555555-5555-4555-a555-555555555555';
  const existingVoided = await ndaRepo.findOne({ where: { id: voidedId } });

  if (!existingVoided) {
    await ndaRepo.save({
      id:                voidedId,
      documentType:      DocumentType.NDA,
      templateVersion:   '1.0',
      jobListingId:      '66666666-6666-4666-a666-666666666666',
      clientUserId:      '33333333-3333-4333-a333-333333333333',
      clientDisplayName: 'Chris (@cmorgan)',
      listingTitle:      'Voided Test Listing',
      unsignedPdfR2Key:  null,
      status:            'voided',
      generatedAt:       new Date(),
      voidedAt:          new Date(),
    });

    console.log('✅ Seed Voided NDA created:', voidedId);
  } else {
    console.log('⏭️  Seed Voided NDA already exists — skipped');
  }

  console.log('\n📋 Seed Reference UUIDs:');
  console.log('   talentA (Jordan Lee)  :', '11111111-1111-4111-a111-111111111111');
  console.log('   talentB (Alex Thompson):', '22222222-2222-4222-a222-222222222222');
  console.log('   clientA (Chris Morgan) :', '33333333-3333-4333-a333-333333333333');
  console.log('   Seed Generated NDA     :', generatedId);
  console.log('   Seed Voided NDA        :', voidedId);
  console.log('   Test Listing UUID      :', '66666666-6666-4666-a666-666666666666');
  console.log('\n✅ Seed complete — ready for QA test cases');
}
