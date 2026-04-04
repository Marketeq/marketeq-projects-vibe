import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoriteGroup } from '../entities/favorite-group.entity';
import { Favorite } from '../entities/favorite.entity';
import { FavoritesService } from '../services/favorites.service';

@Module({
  imports: [TypeOrmModule.forFeature([FavoriteGroup, Favorite])],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class GroupsModule {}
