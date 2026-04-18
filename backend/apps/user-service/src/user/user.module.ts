import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserSettingsController } from './user-settings.controller';
import { UserSyncController } from './user-sync.controller';
import { UserSelfController } from './user-self.controller';
import { UserInternalController } from './user-internal.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSchemaGuardService } from './user-schema-guard.service';
// import { User } from 'src/user/entities/user.entity';
import { User } from './entities/user.entity';
import { TimezoneResolutionService } from './timezone-resolution.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserService, TimezoneResolutionService, UserSchemaGuardService],
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
