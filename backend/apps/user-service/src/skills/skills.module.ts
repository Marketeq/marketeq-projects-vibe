import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Skill } from './skills.entity';
import { SkillsService } from './skills.service';
import { SkillsController } from './skills.controller';
import { User } from '../user/entities/user.entity';
import { UserSkillsController } from './user-skills.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Skill, User])],
  providers: [SkillsService],
  controllers: [SkillsController, UserSkillsController],
  exports: [SkillsService],
})
export class SkillsModule {}
