import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { TooltipsService } from './tooltips.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('api/tooltips')
@UseGuards(JwtAuthGuard)
export class TooltipsController {
  constructor(private readonly tooltipsService: TooltipsService) {}

  /** GET /api/tooltips/:scopeId — returns tooltip dictionary for the given contract scope */
  @Get(':scopeId')
  async getAll(@Param('scopeId') scopeId: string, @Req() req: any) {
    return this.tooltipsService.getAll(scopeId, req.user.sub ?? req.user.id);
  }
}
