import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserKey } from './entities/user-key.entity';
import { UserDevice } from './entities/user-device.entity';
import { UserKeysService } from './user-keys.service';
import { UserKeysController } from './user-keys.controller';
import { DevicesController } from './devices.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserKey, UserDevice])],
  controllers: [UserKeysController, DevicesController],
  providers: [UserKeysService],
  exports: [UserKeysService],
})
export class UserKeysModule {}
