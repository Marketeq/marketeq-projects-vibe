import { Controller, Post, Put, Get, Param, Body, Headers, ForbiddenException } from '@nestjs/common';
import { ContractsService } from '../services/contracts.service';
import { EndContractDto } from '../dtos/end-contract.dto';
import { AcceptRejectDto } from '../dtos/accept-reject.dto';
import { ConfigService } from '@nestjs/config';
import { Public } from '../decorators/public.decorator';

@Controller('contracts')
export class ContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly configService: ConfigService,
  ) {}

  private validateInternalToken(token: string | undefined) {
    const expected = this.configService.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!expected || token !== expected) {
      throw new ForbiddenException('Invalid internal token');
    }
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
