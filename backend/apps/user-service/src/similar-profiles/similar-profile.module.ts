import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { Skill } from '../skills/skills.entity';
import { Experience } from '../experience/experience.entity';
import { SimilarProfileService } from './similar-profile.service';
import { SimilarProfileController } from './similar-profile.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Skill, Experience])],
  controllers: [SimilarProfileController],
  providers: [SimilarProfileService],
})
export class SimilarProfileModule {}
