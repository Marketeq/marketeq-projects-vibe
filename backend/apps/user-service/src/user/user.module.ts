import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { UserSettingsController } from "./user-settings.controller";
import { UserSyncController } from "./user-sync.controller";
import { UserSelfController } from "./user-self.controller";
import { UserInternalController } from "./user-internal.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserSchemaGuardService } from "./user-schema-guard.service";
// import { User } from 'src/user/entities/user.entity';
import { User } from "./entities/user.entity";
import { Skill } from "../skills/skills.entity";
import { TimezoneResolutionService } from "./timezone-resolution.service";
import { R2Service } from "../storage/r2.service";

@Module({
  imports: [TypeOrmModule.forFeature([User, Skill])],
  providers: [
    UserService,
    TimezoneResolutionService,
    UserSchemaGuardService,
    R2Service,
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
