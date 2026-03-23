import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorite } from './entities/favorite.entity';
import { FavoriteGroup } from './entities/favorite-group.entity';
import { FavoritesService } from './services/favorites.service';
import { AiService } from './services/ai.service';
import { FavoritesController } from './controllers/favorites.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [Favorite, FavoriteGroup],
        synchronize: config.get('NODE_ENV') !== 'production',
        ssl: config.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
    TypeOrmModule.forFeature([Favorite, FavoriteGroup]),
  ],
  controllers: [FavoritesController],
  providers: [FavoritesService, AiService],
})
export class FavoritesServiceModule {}
