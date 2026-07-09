import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../decorators/public.decorator';
import { ExperienceService } from '../experience/experience.service';
import { SkillsService } from '../skills/skills.service';

type AutocompleteItem = {
  id: string;
  label: string;
};

@Controller('autocomplete')
export class AutocompleteController {
  constructor(
    private readonly experienceService: ExperienceService,
    private readonly skillsService: SkillsService,
  ) {}

  @Get('job_titles')
  @Public()
  async getJobTitles(@Query('q') q?: string): Promise<AutocompleteItem[]> {
    const titles = await this.experienceService.searchTitles(q, 20);
    return titles.map((title) => ({
      id: title,
      label: title,
    }));
  }

  @Get('skills')
  @Public()
  async getSkills(@Query('q') q?: string): Promise<AutocompleteItem[]> {
    const skills = await this.skillsService.searchNames(q, 20);
    return skills.map((skill) => ({
      id: skill,
      label: skill,
    }));
  }
}
