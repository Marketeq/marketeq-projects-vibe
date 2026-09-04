import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { identityVerificationDataSourceOptions } from './database/data-source';
import { IdentityVerificationProfile } from './entities/identity-verification-profile.entity';
import { IdentityDocument } from './entities/identity-document.entity';
import { VerificationAttempt } from './entities/verification-attempt.entity';
import { HealthController } from './controllers/health.controller';
import { LocationController } from './controllers/location.controller';
import { TravelController } from './controllers/travel.controller';
import { DocumentController } from './controllers/document.controller';
import { VerificationController } from './controllers/verification.controller';
import { WebhookController } from './controllers/webhook.controller';
import { ProfileController } from './controllers/profile.controller';
import { LocationService } from './services/location.service';
import { TravelService } from './services/travel.service';
import { DocumentService } from './services/document.service';
import { VerificationService } from './services/verification.service';
import { DiditService } from './services/didit.service';
import { EventPublisherService } from './services/event-publisher.service';
import { VpnProxyDetectionService } from './services/vpn-proxy-detection.service';
import { TravelReminderSchedulerService } from './services/travel-reminder-scheduler.service';
import { DocumentValidatorService } from './services/document-validator.service';

@Module({
  imports: [
    TypeOrmModule.forRoot(identityVerificationDataSourceOptions),
    TypeOrmModule.forFeature([IdentityVerificationProfile, IdentityDocument, VerificationAttempt]),
    HttpModule,
  ],
  controllers: [
    HealthController,
    LocationController,
    TravelController,
    DocumentController,
    VerificationController,
    WebhookController,
    ProfileController,
  ],
  providers: [
    LocationService,
    TravelService,
    DocumentService,
    VerificationService,
    DiditService,
    EventPublisherService,
    VpnProxyDetectionService,
    TravelReminderSchedulerService,
    DocumentValidatorService,
  ],
})
export class AppModule {}
