import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Public } from '../../decorators/public.decorator';
import { AdminAuthGuard } from '../../guards/admin-auth.guard';
import { NdaSigningEvent } from '../../nda/entities/nda-signing-event.entity';
import { NdaDocument } from '../../nda/entities/nda-document.entity';
import { NdaSettings } from '../../nda/entities/nda-settings.entity';
import { NdaGenerationService } from '../../nda/services/nda-generation.service';
import { NdaEventsPublisher } from '../../nda/services/nda-events.publisher';

/**
 * Admin-only endpoints for support / compliance teams.
 * All routes require x-admin-token header (AdminAuthGuard).
 * PII is returned unredacted — never expose these routes to the public internet.
 */
@Public()
@UseGuards(AdminAuthGuard)
@Controller('v1/admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    @InjectRepository(NdaSigningEvent)
    private readonly signingEventRepo: Repository<NdaSigningEvent>,
    @InjectRepository(NdaDocument)
    private readonly ndaDocumentRepo: Repository<NdaDocument>,
    @InjectRepository(NdaSettings)
    private readonly ndaSettingsRepo: Repository<NdaSettings>,
    private readonly generationService: NdaGenerationService,
    private readonly eventsPublisher: NdaEventsPublisher,
    private readonly dataSource: DataSource,
  ) {}

  /** Full unredacted signing event — all PII visible to admin. */
  @Get('signing-events/:id')
  async getSigningEvent(@Param('id', ParseUUIDPipe) id: string): Promise<NdaSigningEvent> {
    const event = await this.signingEventRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Signing event not found');
    return event;
  }

  /**
   * Retry PDF generation for a signing event.
   * Regenerates the signed PDF, uploads to R2, updates signedPdfR2Key.
   * Useful when the original PDF upload failed or was corrupted.
   */
  @Post('signing-events/:id/retry-pdf')
  @HttpCode(HttpStatus.OK)
  async retryPdf(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ signedPdfUrl: string | null }> {
    const event = await this.signingEventRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Signing event not found');

    const doc = await this.ndaDocumentRepo.findOne({
      where: { id: event.ndaDocumentId },
    });
    if (!doc) throw new NotFoundException('NDA document not found');

    const settings = await this.ndaSettingsRepo.findOne({
      where: { ndaDocumentId: event.ndaDocumentId },
    });

    const signedPdfR2Key = await this.generationService.generateSignedNda(
      doc,
      settings ?? ({ requireNdaToViewScope: false } as NdaSettings),
      event.id,
      event.signerTypedName,
      event.signerUserId,
      event.ipAddress,
      event.deviceType,
      event.signedAtUtc,
    );

    await this.signingEventRepo.update({ id }, { signedPdfR2Key });

    const signedPdfUrl =
      await this.generationService.getPresignedUrl(signedPdfR2Key);

    this.logger.log(`PDF regenerated: signingEventId=${id} r2Key=[REDACTED]`);
    return { signedPdfUrl };
  }

  /**
   * Replay the nda.signed RabbitMQ event for a signing event.
   * Re-publishes with the original payload — useful when the event was lost
   * or a downstream consumer needs to reprocess it.
   */
  @Post('signing-events/:id/replay-event')
  @HttpCode(HttpStatus.OK)
  async replayEvent(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ replayed: boolean; routingKey: string }> {
    const event = await this.signingEventRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Signing event not found');

    this.eventsPublisher.emit('nda.signed', {
      signingEventId: event.id,
      documentId: event.ndaDocumentId,
      jobListingId: event.jobListingId,
      signerUserId: event.signerUserId,
      nameMatchStatus: event.nameMatchStatus,
      signedAtUtc: event.signedAtUtc.toISOString(),
    });

    this.logger.log(`Event replayed for signing event ${id} → nda.signed`);
    return { replayed: true, routingKey: 'nda.signed' };
  }

  /**
   * DSAR pseudonymization — nulls out PII fields for all signing events
   * belonging to the given userId. Required for GDPR right-to-erasure requests.
   * The signing event record is preserved (legally required) but PII is removed.
   */
  @Post('users/:userId/pseudonymize')
  @HttpCode(HttpStatus.OK)
  async pseudonymizeUser(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<{ pseudonymized: boolean; rowsAffected: number }> {
    // NOT NULL columns use pseudonymous token '[PSEUDONYMIZED]' per LS-06 §7.6
    // ("null or a pseudonymous token" — DB constraints require the token form)
    const result = await this.dataSource.query(
      `UPDATE ls_nda_signing_events
       SET "signerTypedName"      = '[PSEUDONYMIZED]',
           "signerRegisteredName" = '[PSEUDONYMIZED]',
           "ipAddress"            = '[PSEUDONYMIZED]',
           "browserUserAgent"     = '[PSEUDONYMIZED]',
           "pseudonymizedAt"      = NOW()
       WHERE "signerUserId" = $1
         AND "pseudonymizedAt" IS NULL`,
      [userId],
    );
    const rowsAffected = result[1] ?? 0;
    this.logger.log(`DSAR pseudonymization: rowsAffected=${rowsAffected}`);
    return { pseudonymized: true, rowsAffected };
  }
}
