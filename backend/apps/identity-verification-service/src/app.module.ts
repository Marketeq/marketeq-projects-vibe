import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { identityVerificationDataSourceOptions } from './database/data-source';
import { IdentityVerificationProfile } from './entities/identity-verification-profile.entity';
import { IdentityDocument } from './entities/identity-document.entity';
import { VerificationAttempt } from './entities/verification-attempt.entity';
import { PendingVerificationSession } from './entities/pending-verification-session.entity';
import { BiometricSession } from './entities/biometric-session.entity';
import { ProcessedWebhookEvent } from './entities/processed-webhook-event.entity';
import { AttemptReservation } from './entities/attempt-reservation.entity';
import { HostedKycSession } from './entities/hosted-kyc-session.entity';
import { FreeKycService } from './services/free-kyc.service';
import { VerificationSummaryService } from './services/verification-summary.service';
import { IdentityVerificationController } from './controllers/identity-verification.controller';
import { IdentityVerificationInternalController } from './controllers/identity-verification-internal.controller';
import { IdentityVerificationGateController } from './controllers/identity-verification-gate.controller';
import { IdentityVerificationWebhooksController } from './controllers/identity-verification-webhooks.controller';
import { IdentityVerificationSandboxController } from './controllers/identity-verification-sandbox.controller';
import { IdentityVerificationService } from './services/identity-verification.service';
import { TwoStageVerificationService } from './services/two-stage-verification.service';
import { TravelModeReminderJob } from './jobs/travel-mode-reminder.job';
import { StatusAutoClearJob } from './jobs/status-auto-clear.job';
import { HealthModule } from './health/health.module';
import { DOCUMENT_VERIFICATION_PROVIDER } from './providers/document-verification/document-verification-provider.interface';
import { DiditDocumentVerificationProvider } from './providers/document-verification/didit-document-verification.provider';
import { DOCUMENT_COVERAGE_PROVIDER } from './providers/document-coverage/document-coverage-provider.interface';
import { CatalogDocumentCoverageProvider } from './providers/document-coverage/catalog-document-coverage.provider';
import { VPN_PROXY_DETECTION_PROVIDER } from './providers/vpn-proxy/vpn-proxy-detection-provider.interface';
import { ProxyCheckVpnProxyDetectionProvider } from './providers/vpn-proxy/proxycheck-vpn-proxy-detection.provider';
import { LOCATION_PROVIDER } from './providers/location/location-provider.interface';
import { LocationServiceHttpProvider } from './providers/location/location-service-http.provider';
import { OBJECT_STORAGE_PROVIDER } from './providers/storage/object-storage-provider.interface';
import { R2ObjectStorageProvider } from './providers/storage/r2-object-storage.provider';
import { STANDALONE_ID_VERIFICATION_PROVIDER } from './providers/document-verification/standalone-id-verification-provider.interface';
import { DiditStandaloneIdVerificationProvider } from './providers/document-verification/didit-standalone-id-verification.provider';
import { HOSTED_BIOMETRIC_SESSION_PROVIDER } from './providers/biometric-session/hosted-biometric-session-provider.interface';
import { DiditHostedBiometricSessionProvider } from './providers/biometric-session/didit-hosted-biometric-session.provider';
import { NOTIFICATION_EVENT_PUBLISHER } from './events/notification-event-publisher.interface';
import { RabbitMqNotificationEventPublisher } from './events/rabbitmq-notification-event-publisher';
import { MetricsModule } from './metrics/metrics.module';
import { VpnProxyCheckGuard } from './common/guards/vpn-proxy-check.guard';

@Module({
  imports: [
    TypeOrmModule.forRoot(identityVerificationDataSourceOptions),
    TypeOrmModule.forFeature([
      IdentityVerificationProfile,
      IdentityDocument,
      VerificationAttempt,
      PendingVerificationSession,
      BiometricSession,
      ProcessedWebhookEvent,
      AttemptReservation,
      HostedKycSession,
    ]),
    ScheduleModule.forRoot(),
    // TRVG2 §6.2 confirms the document-submission endpoint must be
    // rate-limited; no threshold is specified by any source. 20
    // requests/60s is this pass's own global default (per-route @Throttle
    // overrides this on POST /documents specifically — see the
    // controller).
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    HealthModule,
    MetricsModule,
  ],
  controllers: [
    IdentityVerificationController,
    IdentityVerificationInternalController,
    IdentityVerificationGateController,
    IdentityVerificationWebhooksController,
    // Sandbox-only diagnostic routes — 404 outside NODE_ENV=development, see
    // SandboxOnlyGuard. Not part of the real talent-dashboard flow.
    IdentityVerificationSandboxController,
  ],
  providers: [
    IdentityVerificationService,
    TwoStageVerificationService,
    FreeKycService,
    VerificationSummaryService,
    TravelModeReminderJob,
    StatusAutoClearJob,
    VpnProxyCheckGuard,
    // SUPERSEDED for the two-stage flow by STANDALONE_ID_VERIFICATION_PROVIDER
    // below — left registered, not removed, since the old
    // startVerificationSession route still depends on it. See the
    // two-stage integration's final report.
    { provide: DOCUMENT_VERIFICATION_PROVIDER, useClass: DiditDocumentVerificationProvider },
    { provide: DOCUMENT_COVERAGE_PROVIDER, useClass: CatalogDocumentCoverageProvider },
    { provide: VPN_PROXY_DETECTION_PROVIDER, useClass: ProxyCheckVpnProxyDetectionProvider },
    { provide: LOCATION_PROVIDER, useClass: LocationServiceHttpProvider },
    { provide: OBJECT_STORAGE_PROVIDER, useClass: R2ObjectStorageProvider },
    { provide: STANDALONE_ID_VERIFICATION_PROVIDER, useClass: DiditStandaloneIdVerificationProvider },
    { provide: HOSTED_BIOMETRIC_SESSION_PROVIDER, useClass: DiditHostedBiometricSessionProvider },
    { provide: NOTIFICATION_EVENT_PUBLISHER, useClass: RabbitMqNotificationEventPublisher },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
