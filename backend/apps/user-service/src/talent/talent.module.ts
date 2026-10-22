import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TalentController } from './talent.controller';
import { TalentService } from './talent.service';
import { User } from '../user/entities/user.entity';
import { Skill } from '../skills/skills.entity';
import { Experience } from '../experience/experience.entity';
import { Education } from '../education/education.entity';
import { Certification } from '../certifications/certifications.entity';
import { Industry } from '../industries/industries.entity';
import { Language } from '../languages/languages.entity';
import { R2Service } from '../storage/r2.service';
import { UserModule } from '../user/user.module';
import { Portfolio } from '../portfolio/portfolio.entity';
import { TalentProfile } from '../talent-profile/entities/talent-profile.entity';
import { IdentityGateModule } from '../identity-gate/identity-gate.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Skill, Experience, Education, Certification, Industry, Language, Portfolio, TalentProfile]),
    UserModule,
    IdentityGateModule,
  ],
  controllers: [TalentController],
  providers: [TalentService, R2Service],
})
export class TalentModule {}
