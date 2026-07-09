import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Experience } from './experience.entity';
import { ExperienceService } from './experience.service';
import { ExperienceController } from './experience.controller';
import { User } from '../user/entities/user.entity';
import { UserExperienceController } from './user-experience.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Experience, User])],
  providers: [ExperienceService],
  controllers: [ExperienceController, UserExperienceController],
  exports: [ExperienceService],
})
export class ExperienceModule {}
