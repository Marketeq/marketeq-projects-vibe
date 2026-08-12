import { Controller, Post, Put, Get, Param, Body, Req, Headers, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { ContractsService } from '../services/contracts.service';
import { EndContractDto } from '../dtos/end-contract.dto';
import { AcceptRejectDto } from '../dtos/accept-reject.dto';
import { LogHireInitiatedDto } from '../dtos/log-hire-initiated.dto';
import { ConfigService } from '@nestjs/config';
import { Public } from '../decorators/public.decorator';
import { AuditLoggerService } from '../services/audit-logger.service';

@Controller('contracts')
export class ContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly configService: ConfigService,
    private readonly auditLoggerService: AuditLoggerService,
  ) {}

  private validateInternalToken(token: string | undefined) {
    const expected = this.configService.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!expected || token !== expected) {
      throw new ForbiddenException('Invalid internal token');
    }
  }

  // FR-11: audit entry for Hire Me flow initiation. Declared as a literal
  // route ahead of the :id-parameterised routes below — Nest/path-to-regexp
  // wouldn't actually collide with them (different segment counts/methods),
  // but this removes any doubt.
  @Post('audit/hire-initiated')
  async logHireInitiated(
    @Req() req: Request & { user: { sub: string; role: string } },
    @Body() dto: LogHireInitiatedDto,
  ) {
    await this.auditLoggerService.log(req.user, 'HIRE_FLOW_INITIATED', {
      talentId: dto.talentId,
    });
    return { ok: true };
  }

  // End a single contract
  @Put(':id/end')
  async endContract(@Param('id') id: string, @Body() dto: EndContractDto) {
    return this.contractsService.endContract(id, dto);
  }

  // Accept/Reject flow for talent
  @Put(':id/respond')
  async respond(@Param('id') id: string, @Body() dto: AcceptRejectDto) {
    return this.contractsService.respondToOffer(id, dto);
  }

  // List contracts for a client
  @Get('client/:clientId')
  async getClientContracts(@Param('clientId') clientId: string) {
    return this.contractsService.getContractsByClient(clientId);
  }

  // List contracts for a talent
  @Get('talent/:talentId')
  async getTalentContracts(@Param('talentId') talentId: string) {
    return this.contractsService.getContractsByTalent(talentId);
  }

  // Get one contract by ID
  @Get(':id')
  async getContract(@Param('id') id: string) {
    return this.contractsService.getContract(id);
  }

  @Public()
  @Post(':id/cms-sync')
  async syncFromCms(
    @Headers('x-internal-token') token: string | undefined,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    this.validateInternalToken(token);
    return this.contractsService.update(id, dto);
  }
}
