import {
  Body,
  Controller,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ProjectSyncService } from './project-sync.service';
import { SuggestSkillsDto } from './dto/suggest-skills.dto';

/**
 * Frontend-facing endpoint for the wizard's "Suggested Skills" (PL-SKILL-03).
 * Calls the existing SkillsAdapter (embedding + cosine) with the draft's
 * live content and returns AI-matched skills the seller can add.
 */
@Controller('publish')
@UseGuards(JwtAuthGuard)
export class SuggestSkillsController {
  constructor(private readonly projectSyncService: ProjectSyncService) {}

  @Post('suggest-skills')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async suggestSkills(@Body() dto: SuggestSkillsDto): Promise<{
    skills: string[];
  }> {
    const skills = await this.projectSyncService.suggestSkills({
      description: dto.description ?? '',
      category: dto.category ?? null,
      tags: dto.tags ?? [],
      scopeTaskTitles: dto.scopeTaskTitles ?? [],
    });
    return { skills };
  }
}
