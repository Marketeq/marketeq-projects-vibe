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
import { FreeKycService, KycReconcileOutcome } from '../services/free-kyc.service';
import { KycSessionResponseDto } from '../dto/response/kyc-session.response.dto';
import { BearerAuthGuard } from '../common/guards/bearer-auth.guard';
import { VpnProxyCheckGuard } from '../common/guards/vpn-proxy-check.guard';
import { readLoginSession } from '../common/travel-mode/login-reminder';
import { readLoginSessionKey } from '../common/travel-mode/login-session-key';
import { getEffectiveClientIp } from '../common/utils/effective-client-ip';
import { TravelClassificationRequestDto } from '../dto/request/travel-classification.request.dto';
import { TravelDurationRequestDto } from '../dto/request/travel-duration.request.dto';
import { KycSessionRequestDto } from '../dto/request/kyc-session.request.dto';
import { TravelCheckInAnswerRequestDto } from '../dto/request/travel-check-in-answer.request.dto';
import { DocumentUploadUrlRequestDto } from '../dto/request/document-upload-url.request.dto';
import { SubmitDocumentRequestDto } from '../dto/request/submit-document.request.dto';
import { AcceptedDocumentsRequestDto } from '../dto/request/accepted-documents.request.dto';
import { ProfileStatusResponseDto } from '../dto/response/profile-status.response.dto';
import { TravelReminderClaimResponseDto } from '../dto/response/travel-reminder-claim.response.dto';
import { DetectedLocationResponseDto } from '../dto/response/detected-location.response.dto';
import { GpsCoordinatesRequestDto } from '../dto/request/gps-coordinates.request.dto';
import { GpsLocationResponseDto } from '../dto/response/gps-location.response.dto';
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
  // The verified access-token payload set by BearerAuthGuard.
  user?: Record<string, unknown>;
}

@Controller('v1/identity-verification')
@UseGuards(BearerAuthGuard)
export class IdentityVerificationController {
  constructor(
    private readonly service: IdentityVerificationService,
    private readonly twoStageService: TwoStageVerificationService,
    private readonly freeKycService: FreeKycService,
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

  // Informational status read: works behind a VPN or proxy so the dashboard can
  // render the banner. Every advancing route (connection-check, home-country,
  // travel classification, Didit, documents) keeps its VpnProxyCheckGuard.
  @Get('me')
  async getMyStatus(@Req() req: AuthenticatedRequest): Promise<ProfileStatusResponseDto> {
    const ip = getEffectiveClientIp(req);
    const profile = await this.service.getOrCreateProfile(req.userId, ip);
    const summary = await this.service.getVerificationSummary(profile);
    const locationMismatch = await this.service.getLocationMismatch(profile, ip);
    const travelModeLocationMismatch = await this.service.getTravelModeLocationMismatch(profile, ip);
    const loginReminderAt = this.service.getLoginReminderAt(profile, readLoginSession(req.user, Date.now()));
    const loginSessionKey = readLoginSessionKey(req.user, req.userId);
    return ProfileStatusResponseDto.fromEntity(
      profile,
      summary,
      Date.now(),
      locationMismatch,
      loginReminderAt,
      travelModeLocationMismatch,
      loginSessionKey,
    );
  }

  // Display-only location for the verification dialog. Uses the same
  // effective client IP as home-country/confirm (the IP is never accepted from
  // the browser and never returned). Informational lookup — like
  // accepted-documents it carries no VpnProxyCheckGuard; the dashboard runs the
  // connection check before the flow opens, and every advancing route is guarded.
  @Get('detected-location')
  async getDetectedLocation(@Req() req: AuthenticatedRequest): Promise<DetectedLocationResponseDto> {
    const location = await this.service.getDetectedLocationForDisplay(getEffectiveClientIp(req));
    return DetectedLocationResponseDto.from(location);
  }

  // Browser-geolocation display. Called only after an explicit user action. The
  // body accepts nothing but two range-validated numbers; the place is
  // reverse-geocoded server-side and compared with the server-derived IP
  // country. Coordinates are never stored or logged and are not identity proof.
  // Throttled to protect the reverse-geocoding quota.
  @Post('detected-location/coordinates')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async resolveGpsLocation(
    @Req() req: AuthenticatedRequest,
    @Body() dto: GpsCoordinatesRequestDto,
  ): Promise<GpsLocationResponseDto> {
    return this.service.resolveGpsDisplay(getEffectiveClientIp(req), dto.latitude, dto.longitude);
  }

  @Post('home-country/confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(VpnProxyCheckGuard)
  async confirmHomeCountry(@Req() req: AuthenticatedRequest): Promise<ProfileStatusResponseDto> {
    const profile = await this.service.confirmHomeCountry(req.userId, getEffectiveClientIp(req));
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

  // The answer to a "Still traveling?" check-in: the active traveler saves a new duration.
  // Only a saved duration (including "not_sure") is an answer; opening, skipping, closing or
  // refreshing a check-in sends nothing and leaves it due. The new period starts now and the
  // schedule restarts from it. `checkInAt` (the travelReminderAvailableAt the client was
  // shown) makes it one answer per occurrence across tabs. Accepted only while Travel Mode
  // is in force (otherwise 409 TRAVEL_MODE_NOT_ACTIVE and POST travel-duration is the
  // activation); never while a home-country change is running.
  @Post('travel-duration/update')
  @HttpCode(HttpStatus.OK)
  async updateActiveTravelDuration(
    @Req() req: AuthenticatedRequest,
    @Body() dto: TravelCheckInAnswerRequestDto,
  ): Promise<ProfileStatusResponseDto> {
    const profile = await this.service.updateActiveTravelDuration(
      req.userId,
      dto.duration,
      {
        checkInAt: dto.checkInAt ? new Date(dto.checkInAt) : null,
        session: readLoginSession(req.user, Date.now()),
      },
    );
    return ProfileStatusResponseDto.fromEntity(profile);
  }

  // Whether a Travel Mode check-in is due for the authenticated caller right now. Kept
  // under its old name for clients that still call it, but it NO LONGER CLAIMS OR CONSUMES
  // anything: { claimed: true } just means "due", it is read-only, and a check-in stays due
  // until a duration answer is saved or the home-country update flow is started (GET /me
  // reports the same thing as travelReminderDue). It reads no body, query, profile id or
  // timestamp. Always 200 with { claimed }; "nothing due" is claimed:false, never an
  // error. Not guarded by VpnProxyCheckGuard: it advances no verification.
  @Post('travel-reminder/claim')
  @HttpCode(HttpStatus.OK)
  async claimTravelReminder(@Req() req: AuthenticatedRequest): Promise<TravelReminderClaimResponseDto> {
    const { due } = await this.service.isTravelCheckInDue(req.userId, readLoginSession(req.user, Date.now()));
    return TravelReminderClaimResponseDto.from({ claimed: due });
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
    return this.service.startVerificationSession(req.userId, documentId, getEffectiveClientIp(req));
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

  // Free KYC: start (or resume) the Didit-hosted verification session. Runs
  // the same VPN/proxy guard as every other advancing action BEFORE any
  // session is created or returned. Returns only the validated redirect URL.
  @Post('kyc-sessions')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(VpnProxyCheckGuard)
  async startKycSession(
    @Req() req: AuthenticatedRequest,
    @Body() dto: KycSessionRequestDto,
  ): Promise<KycSessionResponseDto> {
    return this.freeKycService.startOrResume(req.userId, dto.returnOrigin);
  }

  // Home-country change: the explicit, separate start for an already fully
  // verified account that declared a permanent relocation and confirmed the
  // detected country (it is then PENDING). Ordinary kyc-sessions still refuses a
  // verified account. Same VPN/proxy guard and throttle as session start; reads only the
  // optional returnOrigin (no country or session id): everything else comes from the stored claim.
  @Post('kyc-sessions/home-country-change')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(VpnProxyCheckGuard)
  async startHomeCountryChangeSession(
    @Req() req: AuthenticatedRequest,
    @Body() dto: KycSessionRequestDto,
  ): Promise<KycSessionResponseDto> {
    return this.freeKycService.startHomeCountryChange(req.userId, dto.returnOrigin);
  }

  // Free KYC fallback for a lost or delayed Didit webhook: asks Didit about the
  // CALLER'S OWN stored unfinished session and applies the decision through the
  // same transition logic as the signed webhook (which stays the primary path).
  // POST because it may update state; no body or query is read — the browser
  // never supplies a Didit session id. Carries no VpnProxyCheckGuard (it only
  // reads vendor state and never advances a verification), and is throttled the
  // same way as session start because every call can reach the vendor. Returns a
  // fixed outcome only; the caller re-reads the real status from GET /me.
  @Post('kyc-sessions/reconcile')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async reconcileKycSession(@Req() req: AuthenticatedRequest): Promise<{ outcome: KycReconcileOutcome }> {
    return this.freeKycService.reconcileForUser(req.userId);
  }

  @Get('documents')
  async listDocuments(@Req() req: AuthenticatedRequest): Promise<DocumentResponseDto[]> {
    const documents = await this.service.listDocuments(req.userId);
    return documents.map((d) => DocumentResponseDto.fromEntity(d));
  }
}
