import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER } from '@nestjs/core';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

import { PgExceptionFilter } from './infra/pg-exception.filter';
import { UserModule } from './user/user.module';
import { EducationModule } from './education/education.module';
import { ExperienceModule } from './experience/experience.module';
import { CertificationsModule } from './certifications/certifications.module';
import { IndustriesModule } from './industries/industries.module';
import { LanguagesModule } from './languages/languages.module';
import { SkillsModule } from './skills/skills.module';
import { AutocompleteModule } from './autocomplete/autocomplete.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { TalentModule } from './talent/talent.module';
import { SimilarProfileModule } from './similar-profiles/similar-profile.module';
import { AffiliatedTeamModule } from './affiliated-teams/affiliated-teams.module';
import { FavoritesModule } from './favorites/favorites.module';
import { TeamsModule } from './teams/teams.module';
import { UserMangementModule } from './user-mangement/user-mangement.module';
import { OffersModule } from './offers/offers.modules';
import { HireRequestsModule } from './hire-requests/hire-requests.module';
import { MessageModule } from './message/message.module';
import { ClientModule } from './client/client.module';
import { OwnerTargetModule } from './owner-target/owner-target.module';
import { TalentProfileModule } from './talent-profile/talent-profile.module';
import { UserKeysModule } from './user-keys/user-keys.module';
import { BlockedUsersModule } from './blocked-users/blocked-users.module';
import { ReportsModule } from './reports/reports.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/user-service/.env', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.get<string>('DATABASE_URL'),
        schema: 'user_service',
        autoLoadEntities: true,
        // Permanent guardrail: schema changes must go through migrations.
        synchronize: false,
        // Auto-run pending migrations on service startup in every env,
        // per docs/md/Database Migrations/database-migrations.md.
        migrationsRun: false,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        logging: process.env.NODE_ENV !== 'production',
        ssl:
          process.env.DATABASE_SSL === 'false'
            ? false
            : process.env.NODE_ENV === 'production'
              ? { rejectUnauthorized: false }
              : false,
      }),
    }),
    UserModule,
    EducationModule,
    ExperienceModule,
    CertificationsModule,
    IndustriesModule,
    LanguagesModule,
    PortfolioModule,
    SkillsModule,
    AutocompleteModule,
    AuthModule,
    TalentModule,
    TeamsModule,
    SimilarProfileModule,
    AffiliatedTeamModule,
    FavoritesModule,
    UserMangementModule,
    OffersModule,
    HireRequestsModule,
    MessageModule,
    ClientModule,
    OwnerTargetModule,
    TalentProfileModule,
    UserKeysModule,
    BlockedUsersModule,
    ReportsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    { provide: APP_FILTER, useClass: PgExceptionFilter },
  ],
})
export class AppModule {}
