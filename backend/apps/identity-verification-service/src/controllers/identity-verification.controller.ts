import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { IdentityVerificationService } from '../services/identity-verification.service';
import { TwoStageVerificationService } from '../services/two-stage-verification.service';
import { BearerAuthGuard } from '../common/guards/bearer-auth.guard';
import { VpnProxyCheckGuard } from '../common/guards/vpn-proxy-check.guard';
import { extractClientIp } from '../common/utils/extract-client-ip';
import { TravelClassificationRequestDto } from '../dto/request/travel-classification.request.dto';
import { TravelDurationRequestDto } from '../dto/request/travel-duration.request.dto';
import { DocumentUploadUrlRequestDto } from '../dto/request/document-upload-url.request.dto';
import { SubmitDocumentRequestDto } from '../dto/request/submit-document.request.dto';
import { AcceptedDocumentsRequestDto } from '../dto/request/accepted-documents.request.dto';
import { ProfileStatusResponseDto } from '../dto/response/profile-status.response.dto';
import { DocumentResponseDto } from '../dto/response/document.response.dto';
import { DocumentUploadUrlResponseDto } from '../dto/response/document-upload-url.response.dto';
import { VerificationSessionResponseDto } from '../dto/response/verification-session.response.dto';
import { AcceptedDocumentsResponseDto } from '../dto/response/accepted-documents.response.dto';
import { SupportedDocumentCountriesResponseDto } from '../dto/response/supported-document-countries.response.dto';
import {
  BeginBiometricVerificationResponseDto,
  DocumentCheckResponseDto,
  TwoStageStatusResponseDto,
} from '../dto/response/two-stage-verification.response.dto';

interface AuthenticatedRequest extends Request {
  userId: string;
}

@Controller('v1/identity-verification')
@UseGuards(BearerAuthGuard)
export class IdentityVerificationController {
  constructor(
    private readonly service: IdentityVerificationService,
    private readonly twoStageService: TwoStageVerificationService,
  ) {}

  // Standalone gate the frontend calls before location verification
  // begins (Technical Requirements §1.5). Enforcement doesn't depend on
  // this endpoint being called first — every route below that can advance
  // location or document verification carries the same guard, so a direct
  // API call skipping this can't bypass the check.
  @Get('connection-check')
  @HttpCode(HttpStatus.OK)
  @UseGuards(VpnProxyCheckGuard)
  connectionCheck(): { ok: true } {
    return { ok: true };
  }

  @Get('me')
  @UseGuards(VpnProxyCheckGuard)
  async getMyStatus(@Req() req: AuthenticatedRequest): Promise<ProfileStatusResponseDto> {
    const profile = await this.service.getOrCreateProfile(req.userId, extractClientIp(req));
    return ProfileStatusResponseDto.fromEntity(profile);
  }

  @Post('home-country/confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(VpnProxyCheckGuard)
  async confirmHomeCountry(@Req() req: AuthenticatedRequest): Promise<ProfileStatusResponseDto> {
    const profile = await this.service.confirmHomeCountry(req.userId, extractClientIp(req));
    return ProfileStatusResponseDto.fromEntity(profile);
  }

  @Post('travel-classification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(VpnProxyCheckGuard)
  async recordTravelClassification(
    @Req() req: AuthenticatedRequest,
    @Body() dto: TravelClassificationRequestDto,
  ): Promise<ProfileStatusResponseDto> {
    const profile = await this.service.recordTravelClassification(req.userId, dto.classification);
    return ProfileStatusResponseDto.fromEntity(profile);
  }

  @Post('travel-duration')
  @HttpCode(HttpStatus.OK)
  async recordTravelDuration(
    @Req() req: AuthenticatedRequest,
    @Body() dto: TravelDurationRequestDto,
  ): Promise<ProfileStatusResponseDto> {
    const profile = await this.service.recordTravelDuration(req.userId, dto.duration);
    return ProfileStatusResponseDto.fromEntity(profile);
  }

  // Document-selection screen calls this after the user picks (or the flow
  // defaults to) an issuing country, to know which of our canonical
  // document types to show as selectable cards. Not guarded by
  // VpnProxyCheckGuard — it's an informational lookup, not itself an
  // advancing action toward verification; every route that actually
  // records progress still carries the guard.
  @Get('accepted-documents')
  async getAcceptedDocuments(
    @Query() dto: AcceptedDocumentsRequestDto,
  ): Promise<AcceptedDocumentsResponseDto> {
    const acceptedDocumentTypes = await this.service.getAcceptedDocumentTypes(dto.issuingCountry);
    const metadata = await this.service.getDocumentCoverageMetadata();
    return AcceptedDocumentsResponseDto.from(dto.issuingCountry, acceptedDocumentTypes, metadata);
  }

  // Countries the document-selection screen can offer, from the same catalog
  // that answers accepted-documents and submitDocument's coverage check.
  // Informational lookup: not guarded by VpnProxyCheckGuard, like
  // accepted-documents above.
  @Get('supported-document-countries')
  async getSupportedDocumentCountries(): Promise<SupportedDocumentCountriesResponseDto> {
    const countries = await this.service.getSupportedDocumentCountries();
    const metadata = await this.service.getDocumentCoverageMetadata();
    return SupportedDocumentCountriesResponseDto.from(countries, metadata);
  }

  @Post('documents/upload-url')
  @UseGuards(VpnProxyCheckGuard)
  async createDocumentUploadUrl(
    @Req() req: AuthenticatedRequest,
    @Body() dto: DocumentUploadUrlRequestDto,
  ): Promise<DocumentUploadUrlResponseDto> {
    return this.service.createDocumentUploadUrl(req.userId, dto.fileExtension);
  }

  // TRVG2 §6.2: rate-limited so repeated submissions can't be used to
  // probe which documents exist in the system. 10/hour is this pass's
  // own flagged default — no threshold is specified by any source.
  @Post('documents')
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  @UseGuards(VpnProxyCheckGuard)
  async submitDocument(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SubmitDocumentRequestDto,
  ): Promise<DocumentResponseDto> {
    const document = await this.service.submitDocument(req.userId, dto);
    return DocumentResponseDto.fromEntity(document);
  }

  // SUPERSEDED for the two-stage flow below by
  // documents/:documentId/document-check + begin-biometric-verification.
  // The route itself is left in place (not deleted — the DI-registered
  // DiditDocumentVerificationProvider/DOCUMENT_VERIFICATION_PROVIDER it
  // calls stay too), but the service method now always throws
  // LegacyVerificationPathRetiredException (410) for a NEW attempt — see
  // identity-verification.service.ts's startVerificationSession for the
  // full reasoning (2026-09-26 review of the account-wide attempt-ceiling
  // race and the now-removed LEGACY_VERIFICATION_PATH_CAN_APPROVE flag).
  @Post('documents/:documentId/verify')
  @UseGuards(VpnProxyCheckGuard)
  async startVerificationSession(
    @Req() req: AuthenticatedRequest,
    @Param('documentId') documentId: string,
  ): Promise<VerificationSessionResponseDto> {
    return this.service.startVerificationSession(req.userId, documentId, extractClientIp(req));
  }

  // Stage 1 of the two-stage Didit integration: standalone document check.
  // Ownership enforced inside the service (document must belong to the
  // caller's own profile). Guarded the same as every other advancing
  // action.
  @Post('documents/:documentId/document-check')
  @UseGuards(VpnProxyCheckGuard)
  async checkDocumentWithVendor(
    @Req() req: AuthenticatedRequest,
    @Param('documentId') documentId: string,
  ): Promise<DocumentCheckResponseDto> {
    const document = await this.twoStageService.checkDocumentWithVendor(req.userId, documentId);
    return DocumentCheckResponseDto.from(document);
  }

  // Stage 2: creates (or resumes) the Didit-hosted biometric session.
  // Eligibility (document Approved + usable portrait) is enforced inside
  // the service — this route never itself decides eligibility.
  @Post('documents/:documentId/begin-biometric-verification')
  @UseGuards(VpnProxyCheckGuard)
  async beginBiometricVerification(
    @Req() req: AuthenticatedRequest,
    @Param('documentId') documentId: string,
  ): Promise<BeginBiometricVerificationResponseDto> {
    const result = await this.twoStageService.beginBiometricVerification(req.userId, documentId);
    return BeginBiometricVerificationResponseDto.from(result);
  }

  // Authenticated status read for both stages plus the overall,
  // webhook-derived result. Never itself infers "verified" — only reports
  // what handleBiometricSessionWebhook has already written. Not guarded
  // by VpnProxyCheckGuard — informational, same convention as
  // accepted-documents above.
  @Get('documents/:documentId/two-stage-status')
  async getTwoStageStatus(
    @Req() req: AuthenticatedRequest,
    @Param('documentId') documentId: string,
  ): Promise<TwoStageStatusResponseDto> {
    const status = await this.twoStageService.getTwoStageStatus(req.userId, documentId);
    return TwoStageStatusResponseDto.from(status);
  }

  @Get('documents')
  async listDocuments(@Req() req: AuthenticatedRequest): Promise<DocumentResponseDto[]> {
    const documents = await this.service.listDocuments(req.userId);
    return documents.map((d) => DocumentResponseDto.fromEntity(d));
  }
}
