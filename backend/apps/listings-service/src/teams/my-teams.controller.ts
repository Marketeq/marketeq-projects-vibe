import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TeamsService } from './team.service';

/**
 * Team profiles the signed-in user owns or belongs to, for the /my-teams page.
 *
 * This lives on its own resource rather than as `GET /v1/teams/mine` because
 * the gateway maps the whole `teams` prefix to user-service (team *membership*
 * lives there). Team profiles -- logo, specializations, rating, completed
 * project counts -- are listings data, so they need a prefix that routes here.
 */
@Controller('v1/my-teams')
export class MyTeamsController {
  constructor(private readonly service: TeamsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findMine(@Req() req: any) {
    return this.service.findMine(req.user?.id ?? req.user?.sub);
  }

  /**
   * Creates a team owned by the caller. It is created as a draft with a
   * placeholder title so the "Create a team" button on /my-teams has something
   * to open -- the caller renames it on the team profile.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  createMine(@Req() req: any, @Body() body: { title?: string }) {
    const userId = req.user?.id ?? req.user?.sub;
    // `description` is NOT NULL on teams, so it is seeded empty rather than
    // left undefined -- the owner fills it in on the team profile.
    return this.service.create(
      { title: body?.title?.trim() || 'Untitled team', description: '' },
      userId,
    );
  }
}
