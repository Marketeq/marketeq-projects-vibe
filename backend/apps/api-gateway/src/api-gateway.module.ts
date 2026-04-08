import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { HttpModule } from '@nestjs/axios'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ProxyService } from './proxy/proxy.service'
import { ProxyController } from './proxy/proxy.controller'
import { TalentUploadController } from './controllers/talent-upload.controller'
import { PublishMediaController } from './controllers/publish-media.controller'
import { HomepageModule } from './homepage/homepage.module'
import { JwtStrategy } from './guards/jwt-auth.guard'
import { JwtMiddleware } from './middleware/jwt.middleware'
import { LoggingMiddleware } from './middleware/logging.middleware'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api-gateway/.env', '.env'],
    }),
    HttpModule.register({ timeout: 30000 }),
    HomepageModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const rawKey = config.get<string>('AUTH_JWT_PUBLIC_KEY');
        const publicKey = rawKey?.replace(/\\n/g, '\n');
        if (publicKey) {
          return {
            publicKey,
            verifyOptions: { algorithms: ['RS256'] },
          };
        }
        // Fallback to symmetric secret
        return {
          secret: config.get<string>('JWT_SECRET'),
          signOptions: { expiresIn: '7d' },
        };
      },
    }),
  ],
  providers: [ProxyService, JwtStrategy],
  controllers: [TalentUploadController, PublishMediaController, ProxyController],
})
export class ApiGatewayModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*')
    consumer.apply(JwtMiddleware).forRoutes('*')
  }
}
