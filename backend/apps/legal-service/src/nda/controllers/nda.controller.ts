import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  ParseUUIDPipe,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

import { Public } from '../../decorators/public.decorator';
import { InternalAuthGuard } from '../../guards/internal-auth.guard';
import { SigningRateLimitGuard } from '../../guards/signing-rate-limit.guard';
import { NdaService } from '../services/nda.service';
import { GenerateNdaDto } from '../dto/generate-nda.dto';
import { SelfGenerateNdaDto } from '../dto/self-generate-nda.dto';
import { SignNdaDto } from '../dto/sign-nda.dto';
import { UpdateNdaSettingsDto } from '../dto/update-nda-settings.dto';

/**
 * All NDA lifecycle routes.
 *
 * Routes protected by JWT (global JwtAuthGuard):
 *   POST /v1/nda/self-generate — create NDA where caller is the client (demo/talent flow)
 *   GET  /v1/nda/:id           — fetch NDA + presigned URL
 *   POST /v1/nda/:id/sign      — submit e-signature
 *   GET  /v1/nda/:id/audit     — full audit trail
 *   PATCH /v1/nda/:id/settings — update NDA settings
 *   GET  /v1/nda/:id/preview   — preview unsigned PDF
 *
 * Routes protected by InternalAuthGuard (machine-to-machine only):
 *   POST /v1/nda/generate      — create NDA for a listing (service-to-service)
 *   POST /v1/nda/:id/void      — void an unsigned NDA
 */
@Controller('v1/nda')
export class NdaController {
  constructor(private readonly ndaService: NdaService) {}

  // ─── Internal M2M routes ───────────────────────────────────────────────────

  @Public()
  @UseGuards(InternalAuthGuard)
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  generate(@Body() dto: GenerateNdaDto) {
    return this.ndaService.generate(dto);
  }

  @Public()
  @UseGuards(InternalAuthGuard)
  @Post(':id/void')
  @HttpCode(HttpStatus.OK)
  voidNda(@Param('id', ParseUUIDPipe) id: string) {
    return this.ndaService.voidNda(id);
  }

  // ─── JWT-protected routes ──────────────────────────────────────────────────

  @Post('self-generate')
  @HttpCode(HttpStatus.CREATED)
  selfGenerate(@Req() req: Request, @Body() dto: SelfGenerateNdaDto) {
    const userId = (req as any).user?.sub as string;
    return this.ndaService.generate({ ...dto, clientUserId: userId });
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const userId = (req as any).user?.sub as string;
    return this.ndaService.findOne(userId, id);
  }

  @Post(':id/sign')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SigningRateLimitGuard)
  sign(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignNdaDto,
  ) {
    const userId = (req as any).user?.sub as string;
    // Extract IP and User-Agent server-side (never trust the client body for these)
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      '0.0.0.0';
    const userAgent = req.headers['user-agent'] ?? '';
    return this.ndaService.sign(userId, id, dto, ipAddress, userAgent);
  }

  @Get(':id/audit')
  getAuditTrail(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const userId = (req as any).user?.sub as string;
    return this.ndaService.getAuditTrail(userId, id);
  }

  @Patch(':id/settings')
  updateSettings(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNdaSettingsDto,
  ) {
    const userId = (req as any).user?.sub as string;
    return this.ndaService.updateSettings(userId, id, dto);
  }

  @Get(':id/preview')
  preview(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const userId = (req as any).user?.sub as string ?? '';
    return this.ndaService.preview(userId, id);
  }
}
