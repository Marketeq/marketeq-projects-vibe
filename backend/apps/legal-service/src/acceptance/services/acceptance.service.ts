import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';

import { AcceptanceRecord } from '../entities/acceptance-record.entity';
import { LegalDocumentRecord } from '../../legal-documents/entities/legal-document-record.entity';
import { DocumentType } from '../../nda/enums/document-type.enum';

@Injectable()
export class AcceptanceService {
  private readonly logger = new Logger(AcceptanceService.name);

  constructor(
    @InjectRepository(AcceptanceRecord)
    private readonly acceptanceRepo: Repository<AcceptanceRecord>,
    @InjectRepository(LegalDocumentRecord)
    private readonly legalDocRepo: Repository<LegalDocumentRecord>,
  ) {}

  /**
   * Record a ToS or Privacy Policy acceptance.
   *
   * The UNIQUE constraint on (userId, documentType, documentVersion) means
   * a duplicate insert throws a conflict error — we catch it and return
   * the existing record instead of throwing a 409 to the caller.
   * This makes the endpoint idempotent.
   */
  async record(
    userId: string,
    documentType: DocumentType,
    documentVersion: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<AcceptanceRecord> {
    // Try to insert; catch unique-constraint violation and return existing
    let acceptance: AcceptanceRecord;
    try {
      const record = this.acceptanceRepo.create({
        userId,
        documentType,
        documentVersion,
        ipAddress,
        browserUserAgent: userAgent || null,
      });
      acceptance = await this.acceptanceRepo.save(record);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err as any).code === '23505' // PostgreSQL unique_violation
      ) {
        this.logger.debug(
          `Duplicate acceptance for user=${userId} type=${documentType} version=${documentVersion}`,
        );
        const existing = await this.acceptanceRepo.findOne({
          where: { userId, documentType, documentVersion },
        });
        return existing!;
      }
      throw err;
    }

    // Write immutable audit record (no signedPdfR2Key for ToS/Privacy)
    await this.legalDocRepo.save({
      userId,
      documentType,
      relatedTitle:
        documentType === DocumentType.TERMS_OF_SERVICE
          ? 'Terms of Service'
          : 'Privacy Policy',
      version: documentVersion,
      signedPdfR2Key: null,
      signingMethod: 'acceptance',
      sourceRecordId: acceptance.id,
    });

    this.logger.log(
      `Acceptance recorded: userId=${userId} documentType=${documentType} version=${documentVersion}`,
    );

    return acceptance;
  }
}
