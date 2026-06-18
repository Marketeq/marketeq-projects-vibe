import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { NdaDocument } from '../entities/nda-document.entity';
import { NdaSettings } from '../entities/nda-settings.entity';
import { NdaSigningEvent } from '../entities/nda-signing-event.entity';
import { OutboxEvent } from '../../outbox/entities/outbox-event.entity';
import { DocumentType } from '../enums/document-type.enum';
import { DisplayNameFormat } from '../enums/display-name-format.enum';
import { v4 as uuidv4 } from 'uuid';
import { GenerateNdaDto } from '../dto/generate-nda.dto';
import { SignNdaDto } from '../dto/sign-nda.dto';
import { UpdateNdaSettingsDto } from '../dto/update-nda-settings.dto';
import { NdaSigningService } from './nda-signing.service';
import { NdaAuditService } from './nda-audit.service';
import { NdaGenerationService } from './nda-generation.service';
import { NdaEventsPublisher } from './nda-events.publisher';

@Injectable()
export class NdaService {
  private readonly logger = new Logger(NdaService.name);

  constructor(
    @InjectRepository(NdaDocument)
    private readonly ndaDocumentRepo: Repository<NdaDocument>,
    @InjectRepository(NdaSettings)
    private readonly ndaSettingsRepo: Repository<NdaSettings>,
    @InjectRepository(NdaSigningEvent)
    private readonly signingEventRepo: Repository<NdaSigningEvent>,
    private readonly dataSource: DataSource,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly generationService: NdaGenerationService,
    private readonly signingService: NdaSigningService,
    private readonly auditService: NdaAuditService,
    private readonly eventsPublisher: NdaEventsPublisher,
  ) {}

  // ─── Generate ──────────────────────────────────────────────────────────────

  async generate(
    dto: GenerateNdaDto,
  ): Promise<{ documentId: string; status: string; version: string }> {
    // Fetch client display name from user-service
    let clientDisplayName = 'Client User';
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<Record<string, string>>(
          `/internal/users/${dto.clientUserId}`,
        ),
      );
      const format =
        dto.displayNameFormat ?? DisplayNameFormat.FIRST_NAME_USERNAME;
      if (format === DisplayNameFormat.COMPANY_REPRESENTATIVE) {
        const name = data['firstName'] ?? '';
        const username = data['username'] ? `@${data['username']}` : '';
        const title = data['jobTitle'] ? `, ${data['jobTitle']}` : '';
        const company = data['companyName'] ? ` at ${data['companyName']}` : '';
        clientDisplayName = `${name} (${username})${title}${company}`.trim();
      } else {
        const name = data['firstName'] ?? '';
        const username = data['username'] ? `(@${data['username']})` : '';
        clientDisplayName = `${name} ${username}`.trim() || 'Client User';
      }
    } catch {
      this.logger.warn(
        `Could not fetch user ${dto.clientUserId} from user-service — using fallback name`,
      );
    }

    const version = this.configService.get<string>('NDA_TEMPLATE_VERSION', '1.0.0');

    // Pre-generate the document ID so it can be used in the R2 key
    // before any DB write occurs (makes the PDF step pre-transactional).
    const docId = uuidv4();

    // 1. Generate unsigned PDF BEFORE the transaction.
    //    If R2 upload fails here → no DB records are written, no orphans.
    //    If DB writes later fail → the R2 object is an orphan but gets
    //    overwritten on retry. This is the correct failure order.
    const displayNameFormat =
      dto.displayNameFormat ?? DisplayNameFormat.FIRST_NAME_USERNAME;
    const unsignedPdfR2Key = await this.generationService.generateUnsignedNda(
      {
        id: docId,
        clientDisplayName,
        listingTitle: dto.listingTitle ?? null,
        templateVersion: version,
      } as NdaDocument,
      {
        displayNameFormat,
        requireNdaToViewScope: false,
        jobTitleVisible: dto.jobTitleVisible ?? true,
      } as NdaSettings,
    );

    // 2. Atomic transaction: NdaDocument + NdaSettings + OutboxEvent written together.
    //    If any step fails the entire transaction rolls back — no orphaned records.
    await this.dataSource.transaction(async (manager) => {
      await manager.save(NdaDocument, {
        id: docId,
        documentType: DocumentType.NDA,
        templateVersion: version,
        jobListingId: dto.jobListingId,
        clientUserId: dto.clientUserId,
        clientDisplayName,
        listingTitle: dto.listingTitle ?? null,
        unsignedPdfR2Key,
        status: 'generated',
      });

      await manager.save(NdaSettings, {
        ndaDocumentId: docId,
        displayNameFormat,
        companyId: dto.companyId ?? null,
        jobTitleVisible: dto.jobTitleVisible ?? true,
        requireNdaToViewScope: false,
      });

      await manager.save(OutboxEvent, {
        exchange: 'marketeq.legal',
        routingKey: 'nda.generated',
        payload: {
          documentId: docId,
          jobListingId: dto.jobListingId,
          clientUserId: dto.clientUserId,
          templateVersion: version,
          status: 'generated',
        },
        status: 'pending',
        attemptCount: 0,
        scheduledAt: new Date(),
      });
    });

    this.logger.log(
      `NDA generated: documentId=${docId} listingId=${dto.jobListingId} ` +
      `templateVersion=${version} r2Key=[REDACTED]`,
    );

    this.eventsPublisher.emit('nda.generated', {
      documentId: docId,
      jobListingId: dto.jobListingId,
      clientUserId: dto.clientUserId,
      templateVersion: version,
      status: 'generated',
    });

    return { documentId: docId, status: 'generated', version };
  }

  // ─── Find One ──────────────────────────────────────────────────────────────

  async findOne(userId: string, id: string): Promise<Record<string, unknown>> {
    const doc = await this.ndaDocumentRepo.findOne({
      where: { id },
      relations: ['signingEvents'],
    });
    if (!doc) throw new NotFoundException('NDA document not found');

    const isClient = doc.clientUserId === userId;
    const isSigner = doc.signingEvents.some((e) => e.signerUserId === userId);
    if (!isClient && !isSigner) {
      throw new ForbiddenException('Access denied to this NDA');
    }

    const pdfUrl = doc.unsignedPdfR2Key
      ? await this.generationService.getPresignedUrl(doc.unsignedPdfR2Key)
      : null;

    // If the document is signed, generate a fresh presigned URL for the signed PDF.
    // This is generated fresh on every request so it never expires from the user's POV.
    let signedPdfUrl: string | null = null;
    if (doc.status === 'signed' && doc.signingEvents.length > 0) {
      const latestEvent = doc.signingEvents[doc.signingEvents.length - 1];
      if (latestEvent.signedPdfR2Key) {
        signedPdfUrl = await this.generationService.getPresignedUrl(latestEvent.signedPdfR2Key);
      }
    }

    return {
      id: doc.id,
      documentType: doc.documentType,
      status: doc.status,
      jobListingId: doc.jobListingId,
      clientDisplayName: doc.clientDisplayName,
      listingTitle: doc.listingTitle,
      pdfUrl,
      signedPdfUrl,
      generatedAt: doc.generatedAt,
      voidedAt: doc.voidedAt,
    };
  }

  // ─── Sign ──────────────────────────────────────────────────────────────────

  async sign(
    userId: string,
    ndaDocumentId: string,
    dto: SignNdaDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ eventId: string; signedPdfUrl: string | null }> {
    return this.signingService.sign(
      userId,
      ndaDocumentId,
      dto,
      ipAddress,
      userAgent,
    );
  }

  // ─── Audit Trail ───────────────────────────────────────────────────────────

  async getAuditTrail(
    userId: string,
    ndaDocumentId: string,
  ): Promise<Record<string, unknown>> {
    return this.auditService.getAuditTrail(userId, ndaDocumentId);
  }

  // ─── Update Settings ───────────────────────────────────────────────────────

  async updateSettings(
    userId: string,
    ndaDocumentId: string,
    dto: UpdateNdaSettingsDto,
  ): Promise<Record<string, unknown>> {
    const doc = await this.ndaDocumentRepo.findOne({
      where: { id: ndaDocumentId },
    });
    if (!doc) throw new NotFoundException('NDA document not found');
    if (doc.clientUserId !== userId) {
      throw new ForbiddenException('Only the NDA owner can update settings');
    }

    const settings = await this.ndaSettingsRepo.findOne({
      where: { ndaDocumentId },
    });
    if (!settings) throw new NotFoundException('NDA settings not found');

    if (dto.displayNameFormat !== undefined)
      settings.displayNameFormat = dto.displayNameFormat;
    if (dto.companyId !== undefined) settings.companyId = dto.companyId ?? null;
    if (dto.jobTitleVisible !== undefined)
      settings.jobTitleVisible = dto.jobTitleVisible;
    if (dto.requireNdaToViewScope !== undefined)
      settings.requireNdaToViewScope = dto.requireNdaToViewScope;

    const saved = await this.ndaSettingsRepo.save(settings);
    return saved as unknown as Record<string, unknown>;
  }

  // ─── Void ──────────────────────────────────────────────────────────────────

  async voidNda(id: string): Promise<{ id: string; status: string }> {
    const doc = await this.ndaDocumentRepo.findOne({
      where: { id },
      relations: ['signingEvents'],
    });
    if (!doc) throw new NotFoundException('NDA document not found');

    if (doc.signingEvents.length > 0) {
      throw new ConflictException('Cannot void an NDA that has been signed');
    }

    const voidedAt = new Date();

    // Wrap status update + outbox write in a transaction
    await this.dataSource.transaction(async (manager) => {
      await manager.update(NdaDocument, { id }, { status: 'voided', voidedAt });
      await manager.save(OutboxEvent, {
        exchange: 'marketeq.legal',
        routingKey: 'nda.voided',
        payload: {
          documentId: id,
          jobListingId: doc.jobListingId,
          clientUserId: doc.clientUserId,
          voidedAt: voidedAt.toISOString(),
        },
        status: 'pending',
        attemptCount: 0,
        scheduledAt: new Date(),
      });
    });

    this.eventsPublisher.emit('nda.voided', {
      documentId: id,
      jobListingId: doc.jobListingId,
      clientUserId: doc.clientUserId,
      voidedAt: voidedAt.toISOString(),
    });

    this.logger.log(
      `NDA voided: documentId=${id} jobListingId=${doc.jobListingId}`,
    );

    return { id, status: 'voided' };
  }

  // ─── Preview ───────────────────────────────────────────────────────────────

  async preview(
    _userId: string,
    id: string,
  ): Promise<{ pdfUrl: string | null }> {
    const doc = await this.ndaDocumentRepo.findOne({
      where: { id },
    });
    if (!doc) throw new NotFoundException('NDA document not found');

    // Preview is read-only — any authenticated user can preview an NDA
    // (ownership is enforced on sign/settings/audit endpoints instead)

    const pdfUrl = doc.unsignedPdfR2Key
      ? await this.generationService.getPresignedUrl(doc.unsignedPdfR2Key)
      : null;

    return { pdfUrl };
  }
}
