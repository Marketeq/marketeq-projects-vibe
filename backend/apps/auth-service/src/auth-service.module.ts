import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/auth-service/.env', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const url = cfg.get<string>('DATABASE_URL');
        if (url) {
          return {
            type: 'postgres',
            url,
            autoLoadEntities: true,
            synchronize: process.env.NODE_ENV !== 'production',
            logging: process.env.NODE_ENV !== 'production',
            ssl:
              process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: false }
                : false,
          };
        }

        return {
          type: 'postgres',
          host: cfg.get<string>('DATABASE_HOST'),
          port: parseInt(cfg.get<string>('DATABASE_PORT') ?? '5432', 10),
          username: cfg.get<string>('DATABASE_USERNAME'),
          password: cfg.get<string>('DATABASE_PASSWORD'),
          database: cfg.get<string>('DATABASE_NAME'),
          autoLoadEntities: true,
          synchronize: process.env.NODE_ENV !== 'production',
          logging: process.env.NODE_ENV !== 'production',
          ssl:
            process.env.NODE_ENV === 'production'
              ? { rejectUnauthorized: false }
              : false,
        };
      },
    }),
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AuthServiceModule {}
