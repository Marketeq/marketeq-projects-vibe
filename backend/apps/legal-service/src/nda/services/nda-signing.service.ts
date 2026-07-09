import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import * as natural from 'natural';

import { NdaDocument } from '../entities/nda-document.entity';
import { NdaSigningEvent } from '../entities/nda-signing-event.entity';
import { NdaSettings } from '../entities/nda-settings.entity';
import { LegalDocumentRecord } from '../../legal-documents/entities/legal-document-record.entity';
import { OutboxEvent } from '../../outbox/entities/outbox-event.entity';
import { NameMatchStatus } from '../enums/name-match-status.enum';
import { SignNdaDto } from '../dto/sign-nda.dto';
import { NdaGenerationService } from './nda-generation.service';
import { NdaEventsPublisher } from './nda-events.publisher';

interface NameMatchResult {
  status: NameMatchStatus;
  score: number;
}

/**
 * Handles the full e-signature flow for an NDA:
 *   consent → load doc → duplicate check → fetch identity →
 *   name validation (Jaro-Winkler) → device detection →
 *   PDF generation + R2 upload →
 *   DB transaction (NdaSigningEvent + LegalDocumentRecord + OutboxEvent + status update) →
 *   presigned URL → direct event publish
 */
@Injectable()
export class NdaSigningService {
  private readonly logger = new Logger(NdaSigningService.name);

  constructor(
    @InjectRepository(NdaDocument)
    private readonly ndaDocumentRepo: Repository<NdaDocument>,
    @InjectRepository(NdaSigningEvent)
    private readonly signingEventRepo: Repository<NdaSigningEvent>,
    @InjectRepository(NdaSettings)
    private readonly ndaSettingsRepo: Repository<NdaSettings>,
    @InjectRepository(LegalDocumentRecord)
    private readonly legalDocRepo: Repository<LegalDocumentRecord>,
    @InjectRepository(OutboxEvent)
    private readonly outboxRepo: Repository<OutboxEvent>,
    private readonly dataSource: DataSource,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly generationService: NdaGenerationService,
    private readonly eventsPublisher: NdaEventsPublisher,
  ) {}

  async sign(
    signerUserId: string,
    ndaDocumentId: string,
    dto: SignNdaDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ eventId: string; signedPdfUrl: string | null }> {
    // 1. Validate consent (DTO @Equals(true) catches false, belt-and-suspenders here)
    if (!dto.consentCheckboxChecked) {
      throw new BadRequestException('ESIGN Act consent must be acknowledged');
    }

    // 2. Load NDA document
    const doc = await this.ndaDocumentRepo.findOne({
      where: { id: ndaDocumentId },
    });
    if (!doc) throw new NotFoundException('NDA document not found');
    if (doc.status === 'voided') {
      throw new ConflictException('NDA has been voided and cannot be signed');
    }

    // 3. Duplicate signing check (append-only — one signer per document)
    const existing = await this.signingEventRepo.findOne({
      where: { ndaDocumentId, signerUserId },
    });
    if (existing) {
      throw new ConflictException('You have already signed this NDA');
    }

    // 4. Load NDA settings (needed for PDF generation)
    const settings = await this.ndaSettingsRepo.findOne({
      where: { ndaDocumentId },
    });

    // 5. Fetch signer identity from user-service
    let signerUsername = 'unknown';
    let signerRegisteredName = 'Unknown User';
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<Record<string, string>>(
          `/internal/users/${signerUserId}`,
        ),
      );
      signerUsername = data['username'] ?? 'unknown';
      // user-service returns firstName + lastName; join them as registered name
      const firstName = data['firstName'] ?? data['legalName'] ?? '';
      const lastName = data['lastName'] ?? '';
      signerRegisteredName =
        lastName ? `${firstName} ${lastName}`.trim() : firstName || 'Unknown User';
    } catch {
      this.logger.warn(
        `Could not fetch user ${signerUserId} from user-service — proceeding with stub identity`,
      );
    }

    // 6. Jaro-Winkler name validation
    const nameMatch = this.validateName(dto.typedName, signerRegisteredName);
    if (nameMatch.status === NameMatchStatus.NO_MATCH) {
      throw new UnprocessableEntityException({
        code: 'LS_NAME_NO_MATCH',
        message:
          'The name you entered does not match your registered name. ' +
          'Please type your legal name exactly as it appears in your account.',
        details: { typedName: dto.typedName, expectedFormat: 'Your registered legal name' },
      });
    }

    // 6b. Warn if name is a variation (flagged for compliance review)
    if (nameMatch.status === NameMatchStatus.VARIATION) {
      this.logger.warn(
        `NDA signing: name variation detected signingEventId=pending ` +
        `score=${nameMatch.score} — flagged for review`,
      );
    }

    // 7. Device type detection
    const deviceType = this.detectDeviceType(userAgent);

    // 8. Pre-generate IDs used in both the PDF and DB record
    const signingEventId = uuidv4();
    const signedAtUtc = new Date();

    // Title-case the typed name for display in the PDF signature block.
    // The raw typed name is preserved in signerTypedName for the legal audit record.
    // e.g. "priya bharathi" → "Priya Bharathi"
    const displayName = dto.typedName
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());

    // 9. Generate signed PDF + upload to R2 (outside transaction — can be retried)
    const signedPdfR2Key = await this.generationService.generateSignedNda(
      doc,
      settings ?? ({ requireNdaToViewScope: false } as any),
      signingEventId,
      displayName,
      signerUserId,
      ipAddress,
      deviceType,
      signedAtUtc,
    );

    // 10. Atomic DB transaction: NdaSigningEvent + LegalDocumentRecord + OutboxEvent + status update
    await this.dataSource.transaction(async (manager) => {
      // NdaSigningEvent (append-only legal record)
      const event = manager.create(NdaSigningEvent, {
        id: signingEventId,
        ndaDocumentId,
        signerUserId,
        signerUsername,
        signerTypedName: dto.typedName,
        signerRegisteredName,
        nameMatchStatus: nameMatch.status,
        nameMatchScore: nameMatch.score,
        jobListingId: dto.jobListingId,
        signerInitials: dto.initials ?? null,
        ipAddress,
        deviceType,
        browserUserAgent: userAgent,
        signingMethod: dto.signingMethod,
        consentCheckboxChecked: true,
        signedPdfR2Key,
        signatureArtifactR2Key: null,
        designatedRepCompanyId: null,
        pseudonymizedAt: null,
        signedAtUtc,
      });
      await manager.save(NdaSigningEvent, event);

      // LegalDocumentRecord (user's document history entry)
      await manager.save(LegalDocumentRecord, {
        userId: signerUserId,
        documentType: doc.documentType,
        relatedTitle: doc.listingTitle ?? doc.clientDisplayName,
        version: doc.templateVersion,
        signedPdfR2Key,
        signingMethod: dto.signingMethod,
        sourceRecordId: signingEventId,
      });

      // OutboxEvent (guarantees at-least-once RabbitMQ delivery)
      await manager.save(OutboxEvent, {
        exchange: 'marketeq.legal',
        routingKey: 'nda.signed',
        payload: {
          signingEventId,
          documentId: ndaDocumentId,
          jobListingId: dto.jobListingId,
          signerUserId,
          nameMatchStatus: nameMatch.status,
          requireNdaToViewScope: settings?.requireNdaToViewScope ?? false,
          signedAtUtc: signedAtUtc.toISOString(),
        },
        status: 'pending',
        attemptCount: 0,
        scheduledAt: new Date(),
      });

      // Update NDA document status
      await manager.update(NdaDocument, { id: ndaDocumentId }, { status: 'signed' });
    });

    // 11. Presigned download URL for the response
    const signedPdfUrl =
      await this.generationService.getPresignedUrl(signedPdfR2Key);

    // 12. Direct publish (belt-and-suspenders alongside outbox)
    this.eventsPublisher.emit('nda.signed', {
      signingEventId,
      documentId: ndaDocumentId,
      jobListingId: dto.jobListingId,
      signerUserId,
      nameMatchStatus: nameMatch.status,
      requireNdaToViewScope: settings?.requireNdaToViewScope ?? false,
      signedAtUtc: signedAtUtc.toISOString(),
    });

    this.logger.log(
      `NDA signed: signingEventId=${signingEventId} documentId=${ndaDocumentId} ` +
      `nameMatchStatus=${nameMatch.status} signingMethod=${dto.signingMethod}`,
    );

    return { eventId: signingEventId, signedPdfUrl };
  }

  /** NFKC-normalize both names then compute Jaro-Winkler similarity (0–1). */
  validateName(typed: string, registered: string): NameMatchResult {
    const normalize = (s: string): string =>
      s.normalize('NFKC').toLowerCase().trim();

    const score = natural.JaroWinklerDistance(
      normalize(typed),
      normalize(registered),
      {},
    );

    const exactThreshold = parseFloat(
      this.configService.get<string>('NAME_MATCH_EXACT_THRESHOLD', '1.0'),
    );
    const variationThreshold = parseFloat(
      this.configService.get<string>('NAME_MATCH_VARIATION_THRESHOLD', '0.85'),
    );

    let status: NameMatchStatus;
    if (score >= exactThreshold) {
      status = NameMatchStatus.EXACT;
    } else if (score >= variationThreshold) {
      status = NameMatchStatus.VARIATION;
    } else {
      status = NameMatchStatus.NO_MATCH;
    }

    return { status, score: Math.round(score * 10000) / 10000 };
  }

  /** Classify device from user-agent string. */
  detectDeviceType(ua: string): string {
    const lower = ua.toLowerCase();
    if (/tablet|ipad/.test(lower)) return 'tablet';
    if (/mobile|android|iphone/.test(lower)) return 'mobile';
    if (!ua) return 'unknown';
    return 'desktop';
  }
}
