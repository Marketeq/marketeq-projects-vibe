import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './src/user/entities/user.entity';
import { Education } from './src/education/entities/education.entity';
import { Experience } from './src/experience/entities/experience.entity';
import { Skill } from './src/skills/entities/skill.entity';
import { Language } from './src/languages/entities/language.entity';
import { Certification } from './src/certifications/entities/certification.entity';
import { Industry } from './src/industries/entities/industry.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL ?? 'postgres://postgres:password@localhost:5432/postgres',
  schema: 'user_service',
  entities: [User, Education, Experience, Skill, Language, Certification, Industry],
  migrations: ['migrations/*.ts'],
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : undefined,
});
