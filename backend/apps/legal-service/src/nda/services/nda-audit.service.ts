import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NdaDocument } from '../entities/nda-document.entity';
import { NdaGenerationService } from './nda-generation.service';

/**
 * Builds the audit trail for an NDA document.
 *
 * Access rules:
 *  - The client (NDA owner) sees all signing events, unredacted.
 *  - A talent who signed sees their own event unredacted; others redacted.
 *  - Anyone else receives 403.
 */
@Injectable()
export class NdaAuditService {
  constructor(
    @InjectRepository(NdaDocument)
    private readonly ndaDocumentRepo: Repository<NdaDocument>,
    private readonly generationService: NdaGenerationService,
  ) {}

  async getAuditTrail(
    userId: string,
    ndaDocumentId: string,
  ): Promise<Record<string, unknown>> {
    const doc = await this.ndaDocumentRepo.findOne({
      where: { id: ndaDocumentId },
      relations: ['signingEvents'],
    });
    if (!doc) throw new NotFoundException('NDA document not found');

    const isClient = doc.clientUserId === userId;
    const isSignerInEvents = doc.signingEvents.some(
      (e) => e.signerUserId === userId,
    );

    if (!isClient && !isSignerInEvents) {
      throw new ForbiddenException('Access denied to this NDA');
    }

    const events = await Promise.all(
      doc.signingEvents.map(async (event) => {
        const isSelf = event.signerUserId === userId;
        const signedPdfUrl = event.signedPdfR2Key
          ? await this.generationService.getPresignedUrl(event.signedPdfR2Key)
          : null;

        return {
          id: event.id,
          signerUserId: event.signerUserId,
          signerUsername: event.signerUsername,
          signerTypedName: event.signerTypedName,
          nameMatchStatus: event.nameMatchStatus,
          nameMatchScore: event.nameMatchScore,
          signingMethod: event.signingMethod,
          signedAtUtc: event.signedAtUtc,
          signedPdfUrl,
          // Redact IP/UA for anyone who is neither the client nor the signer
          ipAddress: isClient || isSelf ? event.ipAddress : '[redacted]',
          browserUserAgent:
            isClient || isSelf ? event.browserUserAgent : '[redacted]',
        };
      }),
    );

    return {
      id: doc.id,
      documentType: doc.documentType,
      status: doc.status,
      jobListingId: doc.jobListingId,
      clientDisplayName: doc.clientDisplayName,
      listingTitle: doc.listingTitle,
      generatedAt: doc.generatedAt,
      voidedAt: doc.voidedAt,
      signingEvents: events,
    };
  }
}
