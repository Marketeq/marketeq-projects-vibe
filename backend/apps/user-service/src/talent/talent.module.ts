import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TalentController } from './talent.controller';
import { TalentService } from './talent.service';
import { User } from '../user/entities/user.entity';
import { Skill } from '../skills/skills.entity';
import { Experience } from '../experience/experience.entity';
import { R2Service } from '../storage/r2.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Skill, Experience]), UserModule],
  controllers: [TalentController],
  providers: [TalentService, R2Service],
})
export class TalentModule {}
