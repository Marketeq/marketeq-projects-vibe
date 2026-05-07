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
    @InjectRepository(OutboxEvent)
    private readonly outboxRepo: Repository<OutboxEvent>,
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

    // 1. Save NdaDocument (ID needed for R2 key)
    const doc = this.ndaDocumentRepo.create({
      documentType: DocumentType.NDA,
      templateVersion: version,
      jobListingId: dto.jobListingId,
      clientUserId: dto.clientUserId,
      clientDisplayName,
      listingTitle: dto.listingTitle ?? null,
      unsignedPdfR2Key: null, // set after PDF generation
      status: 'generated',
    });
    const savedDoc = await this.ndaDocumentRepo.save(doc);

    // 2. Save NdaSettings
    const settings = this.ndaSettingsRepo.create({
      ndaDocumentId: savedDoc.id,
      displayNameFormat:
        dto.displayNameFormat ?? DisplayNameFormat.FIRST_NAME_USERNAME,
      companyId: dto.companyId ?? null,
      jobTitleVisible: dto.jobTitleVisible ?? true,
      requireNdaToViewScope: false,
    });
    const savedSettings = await this.ndaSettingsRepo.save(settings);

    // 3. Generate unsigned PDF and upload to R2
    const unsignedPdfR2Key = await this.generationService.generateUnsignedNda(
      savedDoc,
      savedSettings,
    );

    // 4. Update doc with the R2 key
    await this.ndaDocumentRepo.update(
      { id: savedDoc.id },
      { unsignedPdfR2Key },
    );

    this.logger.log(
      `NDA generated: documentId=${savedDoc.id} listingId=${dto.jobListingId} ` +
      `templateVersion=${version} r2Key=[REDACTED]`,
    );

    // 5. Write outbox event + emit directly
    await this.outboxRepo.save({
      exchange: 'marketeq.legal',
      routingKey: 'nda.generated',
      payload: {
        documentId: savedDoc.id,
        jobListingId: dto.jobListingId,
        clientUserId: dto.clientUserId,
        templateVersion: version,
        status: 'generated',
      },
      status: 'pending',
      attemptCount: 0,
      scheduledAt: new Date(),
    });

    this.eventsPublisher.emit('nda.generated', {
      documentId: savedDoc.id,
      jobListingId: dto.jobListingId,
      clientUserId: dto.clientUserId,
      templateVersion: version,
      status: 'generated',
    });

    return { documentId: savedDoc.id, status: savedDoc.status, version };
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

    return {
      id: doc.id,
      documentType: doc.documentType,
      status: doc.status,
      jobListingId: doc.jobListingId,
      clientDisplayName: doc.clientDisplayName,
      listingTitle: doc.listingTitle,
      pdfUrl,
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
    userId: string,
    id: string,
  ): Promise<{ pdfUrl: string | null }> {
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

    return { pdfUrl };
  }
}
