import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { User } from '../user/entities/user.entity';
import { Education } from '../education/education.entity';
import { Experience } from '../experience/experience.entity';
import { Certification } from '../certifications/certifications.entity';
import { Skill } from '../skills/skills.entity';
import { Industry } from '../industries/industries.entity';
import { Resume } from './entities/resume.entity';
import { ResumeVersion } from './entities/resume-version.entity';
import { ParseResult } from './entities/parse-result.entity';
import { SyncAudit } from './entities/sync-audit.entity';
import { R2Service } from '../storage/r2.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Education,
      Experience,
      Certification,
      Skill,
      Industry,
      Resume,
      ResumeVersion,
      ParseResult,
      SyncAudit,
    ]),
  ],
  controllers: [ResumeController],
  providers: [ResumeService, R2Service],
})
export class ResumeModule {}
