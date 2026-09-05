import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { identityVerificationDataSourceOptions } from './database/data-source';
import { IdentityVerificationProfile } from './entities/identity-verification-profile.entity';
import { IdentityDocument } from './entities/identity-document.entity';
import { VerificationAttempt } from './entities/verification-attempt.entity';
import { IdentityVerificationController } from './controllers/identity-verification.controller';
import { IdentityVerificationInternalController } from './controllers/identity-verification-internal.controller';
import { IdentityVerificationWebhooksController } from './controllers/identity-verification-webhooks.controller';
import { IdentityVerificationService } from './services/identity-verification.service';

@Module({
  imports: [
    TypeOrmModule.forRoot(identityVerificationDataSourceOptions),
    TypeOrmModule.forFeature([IdentityVerificationProfile, IdentityDocument, VerificationAttempt]),
  ],
  controllers: [
    IdentityVerificationController,
    IdentityVerificationInternalController,
    IdentityVerificationWebhooksController,
  ],
  providers: [IdentityVerificationService],
})
export class AppModule {}
