import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { Education } from '../education/entities/education.entity';
import { Experience } from '../experience/entities/experience.entity';
import { Skill } from '../skills/entities/skill.entity';
import { Language } from '../languages/entities/language.entity';
import { Certification } from '../certifications/entities/certification.entity';
import { Industry } from '../industries/entities/industry.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Education, Experience, Skill, Language, Certification, Industry]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
