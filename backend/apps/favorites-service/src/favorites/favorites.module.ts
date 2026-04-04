import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FavoritesController } from '../controllers/favorites.controller';
import { GroupsController } from '../controllers/groups.controller';
import { InternalController } from '../controllers/internal.controller';

import { FavoritesService } from '../services/favorites.service';
import { GroupsService } from '../services/groups.service';

import { Favorite } from '../entities/favorite.entity';
import { FavoriteGroup } from '../entities/favorite-group.entity';
import { AiModule } from '../ai/ai.module';
import { TargetValidationService } from '../services/target-validation.service';
import {
  LISTING_OWNER_TARGET_CLIENT,
  USER_OWNER_TARGET_CLIENT,
} from '../services/owner-target-client.port';
import {
  ListingOwnerTargetClientAdapter,
  UserOwnerTargetClientAdapter,
} from '../services/owner-target-client.adapter';
import { ServiceAuthGuard } from '../auth/service-auth.guard';

@Module({
  imports: [
    CacheModule.register({
      ttl: 3600, // 1 hour TTL
    }),
    TypeOrmModule.forFeature([Favorite, FavoriteGroup]),
    AiModule,
  ],
  controllers: [
    FavoritesController,
    GroupsController,
    InternalController,
  ],
  providers: [
    FavoritesService,
    GroupsService,
    TargetValidationService,
    ServiceAuthGuard,
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
  exports: [FavoritesService, GroupsService, TargetValidationService],
})
export class FavoritesModule {}
