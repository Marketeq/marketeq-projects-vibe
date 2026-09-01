import { Module, Global, DynamicModule, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { PortfolioItem } from './entities/portfolio-item.entity';
import { CaseStudy } from './entities/case-study.entity';
import { CaseStudyBlock } from './entities/case-study-block.entity';
import { PortfolioService } from './services/portfolio.service';
import { SlugService } from './services/slug.service';
import { CaseStudyService } from './services/case-study.service';
import { CaseStudyEventPublisher } from './events/case-study-event-publisher.service';
import { PortfolioController } from './controllers/portfolio.controller';
import { CaseStudyController } from './controllers/case-study.controller';
import { MediaService } from './media/media.service';
import { MediaController } from './media/media.controller';
import { JwtStrategy } from './auth/jwt.strategy';

// Publishes case_study.* events to a topic exchange. Degrades to a no-op (via
// CaseStudyEventPublisher's @Optional() injection) when RabbitMQ isn't configured,
// so local dev / tests don't require a broker.
@Global()
@Module({})
class RabbitMQCoreModule {
  private static readonly logger = new Logger('RabbitMQCoreModule');

  static forRoot(): DynamicModule {
    const rabbitmqUrl = process.env.RABBITMQ_URI || process.env.RABBITMQ_URL;
    if (!rabbitmqUrl) {
      this.logger.warn('RABBITMQ_URI/RABBITMQ_URL not set — case study events disabled');
      return { module: RabbitMQCoreModule, imports: [], exports: [] };
    }
    return {
      module: RabbitMQCoreModule,
      imports: [
        (RabbitMQModule as any).forRoot(RabbitMQModule, {
          exchanges: [{ name: 'marketeq.case_studies', type: 'topic' }],
          uri: rabbitmqUrl,
          connectionInitOptions: { wait: true },
          defaultRpcErrorHandler: (channel: any, msg: any, _err: any) => {
            channel.nack(msg, false, false);
          },
        }),
      ],
      exports: [RabbitMQModule],
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        publicKey: config.get<string>('JWT_PUBLIC_KEY'),
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [PortfolioItem, CaseStudy, CaseStudyBlock],
        synchronize: false,
        migrationsRun: true,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        ssl: (config.get('DATABASE_SSL_ENABLED') ?? 'false').toLowerCase() === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
    TypeOrmModule.forFeature([PortfolioItem, CaseStudy, CaseStudyBlock]),
    RabbitMQCoreModule.forRoot(),
  ],
  controllers: [PortfolioController, MediaController, CaseStudyController],
  providers: [PortfolioService, SlugService, CaseStudyService, CaseStudyEventPublisher, MediaService, JwtStrategy],
})
export class PortfolioServiceModule {}
