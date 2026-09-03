import { Controller, Get, Req, UseGuards } from '@nestjs/common';
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
}
