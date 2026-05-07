import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockedUser } from './blocked-users.entity';
import { BlockedUsersService } from './blocked-users.service';
import { BlockedUsersController } from './blocked-users.controller';
import { BlockedUsersInternalController } from './blocked-users-internal.controller';
import { BlocksRpcController } from './blocks-rpc.controller';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BlockedUser, User])],
  controllers: [
    BlockedUsersController,
    BlockedUsersInternalController,
    BlocksRpcController,
  ],
  providers: [BlockedUsersService],
  exports: [BlockedUsersService],
})
export class BlockedUsersModule {}
