import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { User } from './user/entities/user.entity';
import { Education } from './education/entities/education.entity';
import { Experience } from './experience/entities/experience.entity';
import { Skill } from './skills/entities/skill.entity';
import { Language } from './languages/entities/language.entity';
import { Certification } from './certifications/entities/certification.entity';
import { Industry } from './industries/entities/industry.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/user-service/.env', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        return {
          type: 'postgres' as const,
          url: config.get<string>('DATABASE_URL') ?? 'postgres://postgres:password@localhost:5432/postgres',
          schema: 'user_service',
          entities: [User, Education, Experience, Skill, Language, Certification, Industry],
          synchronize: false,
          logging: !isProd,
          ssl: isProd ? { rejectUnauthorized: false } : undefined,
          extra: isProd ? { sslmode: 'require' } : undefined,
        };
      },
    }),
    UserModule,
  ],
})
export class UserServiceModule {}
