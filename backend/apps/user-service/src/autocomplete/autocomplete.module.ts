import { Module } from '@nestjs/common';
import { AutocompleteController } from './autocomplete.controller';
import { ExperienceModule } from '../experience/experience.module';
import { SkillsModule } from '../skills/skills.module';

@Module({
  imports: [ExperienceModule, SkillsModule],
  controllers: [AutocompleteController],
})
export class AutocompleteModule {}
