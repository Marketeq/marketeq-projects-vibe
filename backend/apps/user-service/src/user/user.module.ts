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

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Skill]),
    ClientsModule.registerAsync([
      {
        name: "RABBITMQ_CLIENT",
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>("RABBITMQ_URL") || "amqp://localhost:5672"],
            queue: "cms_events_queue",
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
  ],
  controllers: [
    UserController,
    UserSettingsController,
    UserSyncController,
    UserSelfController,
    UserInternalController,
  ],
  exports: [UserService],
})
export class UserModule {}
