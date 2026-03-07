import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
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
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      schema: process.env.DATABASE_SCHEMA || 'users',
      entities: [User, Education, Experience, Skill, Language, Certification, Industry],
      synchronize: process.env.NODE_ENV !== 'production',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }),
    UserModule,
  ],
})
export class UserServiceModule {}
