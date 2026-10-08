import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { TooltipsService } from './tooltips.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ContractAccessService, actorOf } from '../contracts/contract-access.service';

@Controller('tooltips')
@UseGuards(JwtAuthGuard)
export class TooltipsController {
  constructor(
    private readonly tooltipsService: TooltipsService,
    private readonly access: ContractAccessService,
  ) {}

  /** GET /api/tooltips/:scopeId — returns tooltip dictionary for the given contract scope */
  @Get(':scopeId')
  async getAll(@Param('scopeId') scopeId: string, @Req() req: any) {
    await this.access.assertPartyOf(actorOf(req), scopeId);
    return this.tooltipsService.getAll(scopeId, req.user.sub ?? req.user.id);
  }
}
