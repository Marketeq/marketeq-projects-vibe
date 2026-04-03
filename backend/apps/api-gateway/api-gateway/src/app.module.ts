import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule as SharedAuthModule, JwtAuthGuard } from '@libs/auth';
import { UserModule } from './user/user.module';
import { AdminModule } from './admin/admin.module';
import { AffiliateReferralModule } from './affiliate-referrals/affiliate-referrals.module';
import { AiRecommModule } from './ai-recomm/ai-recomm.module';
import { AlgoliaSearchModule } from './algolia-search/algolia-search.module';
import { AuthModule } from './auth/auth.module';
import { ClientRatingModule } from './client-rating/client-rating.module';
import { ContentModerationModule } from './content-moderation/content-moderation.module';
import { ContractsModule } from './contracts/contracts.module';
import { EscrowDisputeModule } from './escrow-dispute/escrow-dispute.module';
import { MessagingNotificationModule } from './messaging-notification/messaging-notification.module';
import { OrderModule } from './order/order.module';
import { TalentRatingModule } from './talent-rating/talent-rating.module';
import { TalentModule } from './talent/talent.module';
import { TeamsModule } from './teams/teams.module';
import { WorkTrackingModule } from './work-tracking/work-tracking.module';
import { BillingModule } from './billing/billing.module';
import { OffersModule } from './offers/offers.module';
import { ListingsModule } from './listings/listings.module';
import { InvitationsModule } from './invitations/invitations.module';
import { AutocompleteModule } from './autocomplete/autocomplete.module';
import { RequestContextMiddleware } from './common/request-context.middleware';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/api-gateway/.env',
    }),
    SharedAuthModule,
    UserModule,
    AdminModule,
    AffiliateReferralModule,
    AiRecommModule,
    AlgoliaSearchModule,
    AuthModule,
    BillingModule,
    ListingsModule,
    InvitationsModule,
    AutocompleteModule,
    ClientRatingModule,
    ContentModerationModule,
    ContractsModule,
    EscrowDisputeModule,
    MessagingNotificationModule,
    OrderModule,
    TalentRatingModule,
    TalentModule,
    TeamsModule,
    WorkTrackingModule,
    OffersModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
