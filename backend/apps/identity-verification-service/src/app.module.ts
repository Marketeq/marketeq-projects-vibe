import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { identityVerificationDataSourceOptions } from './database/data-source';
import { IdentityVerificationProfile } from './entities/identity-verification-profile.entity';
import { IdentityDocument } from './entities/identity-document.entity';
import { VerificationAttempt } from './entities/verification-attempt.entity';
import { PendingVerificationSession } from './entities/pending-verification-session.entity';
import { IdentityVerificationController } from './controllers/identity-verification.controller';
import { IdentityVerificationInternalController } from './controllers/identity-verification-internal.controller';
import { IdentityVerificationWebhooksController } from './controllers/identity-verification-webhooks.controller';
import { IdentityVerificationService } from './services/identity-verification.service';
import { TravelModeReminderJob } from './jobs/travel-mode-reminder.job';
import { HealthModule } from './health/health.module';
import { DOCUMENT_VERIFICATION_PROVIDER } from './providers/document-verification/document-verification-provider.interface';
import { DiditDocumentVerificationProvider } from './providers/document-verification/didit-document-verification.provider';
import { VPN_PROXY_DETECTION_PROVIDER } from './providers/vpn-proxy/vpn-proxy-detection-provider.interface';
import { UnimplementedVpnProxyDetectionProvider } from './providers/vpn-proxy/unimplemented-vpn-proxy-detection.provider';
import { OBJECT_STORAGE_PROVIDER } from './providers/storage/object-storage-provider.interface';
import { R2ObjectStorageProvider } from './providers/storage/r2-object-storage.provider';
import { NOTIFICATION_EVENT_PUBLISHER } from './events/notification-event-publisher.interface';
import { RabbitMqNotificationEventPublisher } from './events/rabbitmq-notification-event-publisher';

@Module({
  imports: [
    TypeOrmModule.forRoot(identityVerificationDataSourceOptions),
    TypeOrmModule.forFeature([
      IdentityVerificationProfile,
      IdentityDocument,
      VerificationAttempt,
      PendingVerificationSession,
    ]),
    ScheduleModule.forRoot(),
    HealthModule,
  ],
  controllers: [
    IdentityVerificationController,
    IdentityVerificationInternalController,
    IdentityVerificationWebhooksController,
  ],
  providers: [
    IdentityVerificationService,
    TravelModeReminderJob,
    { provide: DOCUMENT_VERIFICATION_PROVIDER, useClass: DiditDocumentVerificationProvider },
    { provide: VPN_PROXY_DETECTION_PROVIDER, useClass: UnimplementedVpnProxyDetectionProvider },
    { provide: OBJECT_STORAGE_PROVIDER, useClass: R2ObjectStorageProvider },
    { provide: NOTIFICATION_EVENT_PUBLISHER, useClass: RabbitMqNotificationEventPublisher },
  ],
})
export class AppModule {}
