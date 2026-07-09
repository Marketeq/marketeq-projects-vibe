import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { FavoriteGroup } from '../entities/favorite-group.entity';
import { AiService } from './ai.service';
import {
  LISTING_OWNER_TARGET_CLIENT,
  USER_OWNER_TARGET_CLIENT,
} from '../services/owner-target-client.port';
import {
  ListingOwnerTargetClientAdapter,
  UserOwnerTargetClientAdapter,
} from '../services/owner-target-client.adapter';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([FavoriteGroup])],
  providers: [
    AiService,
    ListingOwnerTargetClientAdapter,
    UserOwnerTargetClientAdapter,
    {
      provide: LISTING_OWNER_TARGET_CLIENT,
      useExisting: ListingOwnerTargetClientAdapter,
    },
    {
      provide: USER_OWNER_TARGET_CLIENT,
      useExisting: UserOwnerTargetClientAdapter,
    },
  ],
  exports: [AiService],
})
export class AiModule {}
