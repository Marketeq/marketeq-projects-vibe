import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { StringValue } from 'ms';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../user/entities/user.entity';

const normalizeKey = (value?: string) =>
  value ? value.replace(/\\n/g, '\n') : value;

const parseExpiresIn = (value: string): number | StringValue =>
  /^\d+$/.test(value) ? Number(value) : (value as StringValue);

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const privateKey = normalizeKey(
          config.get<string>('AUTH_JWT_PRIVATE_KEY'),
        );
        const publicKey = normalizeKey(
          config.get<string>('AUTH_JWT_PUBLIC_KEY'),
        );

        if (!privateKey || !publicKey) {
          throw new Error(
            'AUTH_JWT_PRIVATE_KEY and AUTH_JWT_PUBLIC_KEY are required for RS256',
          );
        }

        const accessExpires = parseExpiresIn(
          config.get<string>('AUTH_JWT_TOKEN_EXPIRES_IN') ?? '15m',
        );

        return {
          privateKey,
          publicKey,
          signOptions: {
            algorithm: 'RS256',
            expiresIn: accessExpires,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [PassportModule, JwtModule],
})
export class AuthModule {}
