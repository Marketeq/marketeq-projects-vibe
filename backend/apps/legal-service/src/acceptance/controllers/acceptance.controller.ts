import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { Public } from '../../decorators/public.decorator';
import { InternalAuthGuard } from '../../guards/internal-auth.guard';
import { AcceptanceService } from '../services/acceptance.service';
import { RecordAcceptanceDto } from '../dto/record-acceptance.dto';
import { DocumentType } from '../../nda/enums/document-type.enum';

/**
 * Records user acceptance of Terms of Service and Privacy Policy.
 *
 * Both routes are internal M2M — called by the API gateway / frontend BFF
 * on behalf of the authenticated user. They are NOT exposed to the public
 * internet without the x-internal-api-secret header.
 *
 * The userId comes from the x-user-id header forwarded by the API gateway.
 * We explicitly validate its presence — InternalAuthGuard only checks the
 * internal secret, not x-user-id. A missing x-user-id would produce a
 * corrupt undefined userId in the database.
 */
@Controller('v1/acceptance')
export class AcceptanceController {
  constructor(private readonly acceptanceService: AcceptanceService) {}

  @Public()
  @UseGuards(InternalAuthGuard)
  @Post('terms-of-service')
  @HttpCode(HttpStatus.CREATED)
  recordTos(
    @Req() req: Request,
    @Body() dto: RecordAcceptanceDto,
  ) {
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId) {
      throw new UnauthorizedException('Missing x-user-id header');
    }

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      '0.0.0.0';
    const userAgent = req.headers['user-agent'] ?? '';

    return this.acceptanceService.record(
      userId,
      DocumentType.TERMS_OF_SERVICE,
      dto.documentVersion,
      ipAddress,
      userAgent,
    );
  }

  @Public()
  @UseGuards(InternalAuthGuard)
  @Post('privacy-policy')
  @HttpCode(HttpStatus.CREATED)
  recordPrivacy(
    @Req() req: Request,
    @Body() dto: RecordAcceptanceDto,
  ) {
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId) {
      throw new UnauthorizedException('Missing x-user-id header');
    }

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      '0.0.0.0';
    const userAgent = req.headers['user-agent'] ?? '';

    return this.acceptanceService.record(
      userId,
      DocumentType.PRIVACY_POLICY,
      dto.documentVersion,
      ipAddress,
      userAgent,
    );
  }
}
