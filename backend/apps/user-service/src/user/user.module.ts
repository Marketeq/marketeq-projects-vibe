import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { UserSettingsController } from "./user-settings.controller";
import { UserSyncController } from "./user-sync.controller";
import { UserSelfController } from "./user-self.controller";
import { UserInternalController } from "./user-internal.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserSchemaGuardService } from "./user-schema-guard.service";
import { User } from "./entities/user.entity";
import { Skill } from "../skills/skills.entity";
import { TimezoneResolutionService } from "./timezone-resolution.service";
import { R2Service } from "../storage/r2.service";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { UserEventPublisher } from "./user-event.publisher";
import { CmsBackfillService } from "./cms-backfill.service";
import { TaxInfo } from "../tax-info/tax-info.entity";
import { TaxInfoService } from "../tax-info/tax-info.service";
import { TaxInfoController } from "../tax-info/tax-info.controller";
import { TaxDocumentService } from "../tax-info/tax-document.service";
import { TinEncryptionService } from "../tax-info/tin-encryption.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Skill, TaxInfo]),
    ClientsModule.registerAsync([
      {
        name: "RABBITMQ_CLIENT",
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>("RABBITMQ_URL") || "amqp://localhost:5672"],
            queue: "cms_user_events_queue",
            queueOptions: { durable: true },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [
    UserService,
    TimezoneResolutionService,
    UserSchemaGuardService,
    R2Service,
    UserEventPublisher,
    CmsBackfillService,
    TaxInfoService,
    TaxDocumentService,
    TinEncryptionService,
  ],
  controllers: [
    UserController,
    UserSettingsController,
    UserSyncController,
    UserSelfController,
    UserInternalController,
    TaxInfoController,
  ],
  exports: [UserService],
})
export class UserModule {}
